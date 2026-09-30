-- CBT Rekrutmen: pindahkan seluruh alur ujian peserta ke RPC server.
--
-- Sebelumnya (supabase/create_cbt_system.sql) peserta anonim dapat membaca
-- seluruh soal beserta correct_option_id, membaca semua token peserta, dan
-- menulis skor sendiri ke cbt_participants. Migrasi ini:
--   1. mencabut semua policy anon/"auth.uid() IS NOT NULL" pada tabel CBT,
--   2. membatasi akses tabel langsung ke pengelola rekrutmen,
--   3. menyediakan RPC berbasis token untuk peserta: soal tanpa kunci jawaban,
--      set soal dibekukan per peserta, batas waktu & penilaian di server,
--   4. membuat token acak kriptografis secara default.

-- 1. Pengelola CBT (selaras dengan recruitment_cbt di src/lib/permissions).
create or replace function public.cbt_is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.auth_user_roles()
    where role_name in ('super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_tu','admin_sekolah','admin_unit','hrd')
  );
$$;

-- 2. Ganti policy lama.
drop policy if exists "Admins full access on cbt_banks" on public.cbt_banks;
drop policy if exists "Admins full access on cbt_questions" on public.cbt_questions;
drop policy if exists "Admins full access on cbt_exams" on public.cbt_exams;
drop policy if exists "Admins full access on cbt_exam_banks" on public.cbt_exam_banks;
drop policy if exists "Admins full access on cbt_participants" on public.cbt_participants;
drop policy if exists "Admins full access on cbt_answers" on public.cbt_answers;
drop policy if exists "Anon read access on cbt_exams" on public.cbt_exams;
drop policy if exists "Anon read access on cbt_questions" on public.cbt_questions;
drop policy if exists "Anon read access on cbt_participants" on public.cbt_participants;
drop policy if exists "Anon read access on cbt_exam_banks" on public.cbt_exam_banks;
drop policy if exists "Anon update cbt_participants" on public.cbt_participants;
drop policy if exists "Anon insert cbt_answers" on public.cbt_answers;
drop policy if exists "Anon update cbt_answers" on public.cbt_answers;
drop policy if exists "Anon read cbt_answers" on public.cbt_answers;

alter table public.cbt_banks enable row level security;
alter table public.cbt_questions enable row level security;
alter table public.cbt_exams enable row level security;
alter table public.cbt_exam_banks enable row level security;
alter table public.cbt_participants enable row level security;
alter table public.cbt_answers enable row level security;

drop policy if exists "CBT managers manage cbt_banks" on public.cbt_banks;
drop policy if exists "CBT managers manage cbt_questions" on public.cbt_questions;
drop policy if exists "CBT managers manage cbt_exams" on public.cbt_exams;
drop policy if exists "CBT managers manage cbt_exam_banks" on public.cbt_exam_banks;
drop policy if exists "CBT managers manage cbt_participants" on public.cbt_participants;
drop policy if exists "CBT managers manage cbt_answers" on public.cbt_answers;

create policy "CBT managers manage cbt_banks" on public.cbt_banks
  for all to authenticated using (public.cbt_is_manager()) with check (public.cbt_is_manager());
create policy "CBT managers manage cbt_questions" on public.cbt_questions
  for all to authenticated using (public.cbt_is_manager()) with check (public.cbt_is_manager());
create policy "CBT managers manage cbt_exams" on public.cbt_exams
  for all to authenticated using (public.cbt_is_manager()) with check (public.cbt_is_manager());
create policy "CBT managers manage cbt_exam_banks" on public.cbt_exam_banks
  for all to authenticated using (public.cbt_is_manager()) with check (public.cbt_is_manager());
create policy "CBT managers manage cbt_participants" on public.cbt_participants
  for all to authenticated using (public.cbt_is_manager()) with check (public.cbt_is_manager());
create policy "CBT managers manage cbt_answers" on public.cbt_answers
  for all to authenticated using (public.cbt_is_manager()) with check (public.cbt_is_manager());

-- 3. Set soal dibekukan per peserta & token acak.
alter table public.cbt_participants add column if not exists question_ids uuid[];
alter table public.cbt_participants
  alter column token set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

-- 4. Fungsi internal (tidak dapat dipanggil langsung oleh klien).
create or replace function public.cbt_assign_questions(p_participant_id uuid)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  participant public.cbt_participants%rowtype;
  exam public.cbt_exams%rowtype;
  result uuid[];
begin
  select * into participant from public.cbt_participants where id = p_participant_id for update;
  if participant.question_ids is not null and cardinality(participant.question_ids) > 0 then
    return participant.question_ids;
  end if;
  select * into exam from public.cbt_exams where id = participant.exam_id;

  with picked as (
    select q.id, eb.created_at as bank_order, md5(participant.id::text || q.id::text) as pick_key
    from public.cbt_exam_banks eb
    cross join lateral (
      select cq.id from public.cbt_questions cq
      where cq.bank_id = eb.bank_id
      order by md5(participant.id::text || cq.id::text)
      -- question_count <= 0 berarti seluruh soal dalam bank.
      limit case when coalesce(eb.question_count, 0) > 0 then eb.question_count else null end
    ) q
    where eb.exam_id = participant.exam_id
  )
  select array_agg(id order by
    case when exam.randomize_questions then md5('order_' || participant.id::text || id::text) end,
    bank_order, pick_key)
  into result from picked;

  update public.cbt_participants set question_ids = coalesce(result, '{}') where id = participant.id;
  return coalesce(result, '{}');
end;
$$;

create or replace function public.cbt_finalize(p_participant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  participant public.cbt_participants%rowtype;
  exam public.cbt_exams%rowtype;
  total_weight numeric;
  earned_weight numeric;
  final_score numeric;
begin
  select * into participant from public.cbt_participants where id = p_participant_id for update;
  if participant.status = 'completed' then return; end if;
  select * into exam from public.cbt_exams where id = participant.exam_id;
  if participant.question_ids is null or cardinality(participant.question_ids) = 0 then
    participant.question_ids := public.cbt_assign_questions(participant.id);
  end if;

  update public.cbt_answers a
     set is_correct = (a.selected_option_id = q.correct_option_id),
         score = case when a.selected_option_id = q.correct_option_id then q.weight else 0 end
    from public.cbt_questions q
   where a.participant_id = participant.id and q.id = a.question_id;

  select coalesce(sum(q.weight), 0) into total_weight
    from public.cbt_questions q where q.id = any(coalesce(participant.question_ids, '{}'));
  select coalesce(sum(a.score), 0) into earned_weight
    from public.cbt_answers a
   where a.participant_id = participant.id and a.question_id = any(coalesce(participant.question_ids, '{}'));

  final_score := case when total_weight > 0 then round((earned_weight / total_weight) * 100) else 0 end;
  update public.cbt_participants
     set status = 'completed',
         completed_at = now(),
         score = final_score,
         is_passed = final_score >= coalesce(exam.passing_grade, 0)
   where id = participant.id;
end;
$$;

revoke all on function public.cbt_assign_questions(uuid) from public, anon, authenticated;
revoke all on function public.cbt_finalize(uuid) from public, anon, authenticated;

-- 5. RPC untuk peserta (token = kredensial).
create or replace function public.cbt_session(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  participant public.cbt_participants%rowtype;
  exam public.cbt_exams%rowtype;
  applicant_name text;
  ends_at timestamptz;
  ids uuid[];
begin
  select * into participant from public.cbt_participants
   where token = upper(btrim(coalesce(p_token, ''))) for update;
  if not found then return null; end if;

  select * into exam from public.cbt_exams where id = participant.exam_id;
  select full_name into applicant_name from public.recruitment_applicants where id = participant.applicant_id;

  if participant.status = 'pending' then
    update public.cbt_participants set status = 'in_progress', started_at = now()
     where id = participant.id returning * into participant;
  end if;

  if participant.status = 'in_progress' then
    ids := public.cbt_assign_questions(participant.id);
    ends_at := participant.started_at + make_interval(mins => exam.duration_minutes);
    -- Toleransi 30 detik untuk latensi jaringan; lewat dari itu dinilai otomatis.
    if now() > ends_at + interval '30 seconds' then
      perform public.cbt_finalize(participant.id);
      participant.status := 'completed';
    end if;
  end if;

  if participant.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'applicant_name', applicant_name, 'exam_title', exam.title);
  end if;

  return jsonb_build_object(
    'status', participant.status,
    'applicant_name', applicant_name,
    'exam_title', exam.title,
    'duration_minutes', exam.duration_minutes,
    'started_at', participant.started_at,
    'ends_at', ends_at,
    'server_now', now(),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text, 'options', q.options) order by ord.n)
      from unnest(ids) with ordinality as ord(id, n)
      join public.cbt_questions q on q.id = ord.id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_object_agg(a.question_id, a.selected_option_id)
      from public.cbt_answers a
      where a.participant_id = participant.id and a.selected_option_id is not null
    ), '{}'::jsonb)
  );
end;
$$;

create or replace function public.cbt_save_answer(p_token text, p_question_id uuid, p_option_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  participant public.cbt_participants%rowtype;
  exam public.cbt_exams%rowtype;
begin
  select * into participant from public.cbt_participants where token = upper(btrim(coalesce(p_token, '')));
  if not found then raise exception 'Token ujian tidak valid.'; end if;
  if participant.status <> 'in_progress' then raise exception 'Sesi ujian sudah tidak aktif.'; end if;

  select * into exam from public.cbt_exams where id = participant.exam_id;
  if now() > participant.started_at + make_interval(mins => exam.duration_minutes) + interval '30 seconds' then
    raise exception 'Waktu ujian telah habis.';
  end if;
  if not (p_question_id = any(coalesce(participant.question_ids, '{}'))) then
    raise exception 'Soal tidak termasuk dalam ujian ini.';
  end if;
  if not exists (
    select 1 from public.cbt_questions q, jsonb_array_elements(q.options) o
    where q.id = p_question_id and o->>'id' = p_option_id
  ) then
    raise exception 'Pilihan jawaban tidak valid.';
  end if;

  insert into public.cbt_answers (participant_id, question_id, selected_option_id)
  values (participant.id, p_question_id, p_option_id)
  on conflict (participant_id, question_id)
  do update set selected_option_id = excluded.selected_option_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cbt_submit(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  participant_id uuid;
begin
  select id into participant_id from public.cbt_participants
   where token = upper(btrim(coalesce(p_token, ''))) and status = 'in_progress';
  if participant_id is null then raise exception 'Sesi ujian tidak ditemukan atau sudah selesai.'; end if;
  perform public.cbt_finalize(participant_id);
  return jsonb_build_object('status', 'completed');
end;
$$;

revoke all on function public.cbt_session(text) from public;
revoke all on function public.cbt_save_answer(text, uuid, text) from public;
revoke all on function public.cbt_submit(text) from public;
grant execute on function public.cbt_session(text) to anon, authenticated;
grant execute on function public.cbt_save_answer(text, uuid, text) to anon, authenticated;
grant execute on function public.cbt_submit(text) to anon, authenticated;
grant execute on function public.cbt_is_manager() to authenticated;

notify pgrst, 'reload schema';
