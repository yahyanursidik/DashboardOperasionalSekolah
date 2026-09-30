-- CBT untuk ujian siswa (formatif/STS/SAS/ASAT), memakai mesin CBT aman yang sama dengan rekrutmen.
--
-- * cbt_banks / cbt_exams punya audience: 'recruitment' (dikelola HRD, seperti sebelumnya) atau
--   'student' (dikelola staf/guru).
-- * cbt_participants dapat berupa pelamar ATAU siswa (tepat salah satu).
-- * Ujian siswa punya jendela waktu, mapel, semester, jenis penilaian, dan opsi menulis skor ke
--   Gradebook (academic_grades) saat penilaian di server selesai.

alter table public.cbt_banks
  add column if not exists audience text not null default 'recruitment',
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists created_by uuid default auth.uid();
alter table public.cbt_banks drop constraint if exists cbt_banks_audience_check;
alter table public.cbt_banks add constraint cbt_banks_audience_check check (audience in ('recruitment', 'student'));

alter table public.cbt_exams
  add column if not exists audience text not null default 'recruitment',
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists semester_id uuid references public.semesters(id) on delete set null,
  add column if not exists grade_type text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists show_score boolean not null default false,
  add column if not exists publish_to_gradebook boolean not null default false,
  add column if not exists created_by uuid default auth.uid();
alter table public.cbt_exams drop constraint if exists cbt_exams_audience_check;
alter table public.cbt_exams add constraint cbt_exams_audience_check check (audience in ('recruitment', 'student'));
alter table public.cbt_exams drop constraint if exists cbt_exams_grade_type_check;
alter table public.cbt_exams add constraint cbt_exams_grade_type_check
  check (grade_type is null or grade_type in ('formatif', 'sumatif_lingkup', 'sts', 'sas', 'asat'));
alter table public.cbt_exams drop constraint if exists cbt_exams_window_check;
alter table public.cbt_exams add constraint cbt_exams_window_check check (starts_at is null or ends_at is null or ends_at > starts_at);

alter table public.cbt_participants alter column applicant_id drop not null;
alter table public.cbt_participants
  add column if not exists student_id uuid references public.students(id) on delete cascade,
  add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.cbt_participants drop constraint if exists cbt_participants_one_subject_check;
alter table public.cbt_participants add constraint cbt_participants_one_subject_check
  check ((applicant_id is null) <> (student_id is null));
create unique index if not exists cbt_participants_student_exam_key on public.cbt_participants(student_id, exam_id) where student_id is not null;
create index if not exists cbt_exams_audience_idx on public.cbt_exams(audience, starts_at);
create index if not exists cbt_banks_audience_idx on public.cbt_banks(audience);

-- Who may manage rows of a given audience.
create or replace function public.cbt_can_manage(p_audience text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_audience = 'student' then public.is_school_staff() else public.cbt_is_manager() end;
$$;
create or replace function public.cbt_exam_audience(p_exam_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select audience from public.cbt_exams where id = p_exam_id;
$$;
create or replace function public.cbt_bank_audience(p_bank_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select audience from public.cbt_banks where id = p_bank_id;
$$;
grant execute on function public.cbt_can_manage(text), public.cbt_exam_audience(uuid), public.cbt_bank_audience(uuid) to authenticated;

drop policy if exists "CBT managers manage cbt_banks" on public.cbt_banks;
drop policy if exists "CBT managers manage cbt_questions" on public.cbt_questions;
drop policy if exists "CBT managers manage cbt_exams" on public.cbt_exams;
drop policy if exists "CBT managers manage cbt_exam_banks" on public.cbt_exam_banks;
drop policy if exists "CBT managers manage cbt_participants" on public.cbt_participants;
drop policy if exists "CBT managers manage cbt_answers" on public.cbt_answers;
drop policy if exists "CBT audience managers manage cbt_banks" on public.cbt_banks;
drop policy if exists "CBT audience managers manage cbt_questions" on public.cbt_questions;
drop policy if exists "CBT audience managers manage cbt_exams" on public.cbt_exams;
drop policy if exists "CBT audience managers manage cbt_exam_banks" on public.cbt_exam_banks;
drop policy if exists "CBT audience managers manage cbt_participants" on public.cbt_participants;
drop policy if exists "CBT audience managers manage cbt_answers" on public.cbt_answers;

create policy "CBT audience managers manage cbt_banks" on public.cbt_banks for all to authenticated
  using (public.cbt_can_manage(audience)) with check (public.cbt_can_manage(audience));
create policy "CBT audience managers manage cbt_exams" on public.cbt_exams for all to authenticated
  using (public.cbt_can_manage(audience)) with check (public.cbt_can_manage(audience));
create policy "CBT audience managers manage cbt_questions" on public.cbt_questions for all to authenticated
  using (public.cbt_can_manage(public.cbt_bank_audience(bank_id))) with check (public.cbt_can_manage(public.cbt_bank_audience(bank_id)));
create policy "CBT audience managers manage cbt_exam_banks" on public.cbt_exam_banks for all to authenticated
  using (public.cbt_can_manage(public.cbt_exam_audience(exam_id)) and public.cbt_bank_audience(bank_id) = public.cbt_exam_audience(exam_id))
  with check (public.cbt_can_manage(public.cbt_exam_audience(exam_id)) and public.cbt_bank_audience(bank_id) = public.cbt_exam_audience(exam_id));
create policy "CBT audience managers manage cbt_participants" on public.cbt_participants for all to authenticated
  using (public.cbt_can_manage(public.cbt_exam_audience(exam_id))) with check (public.cbt_can_manage(public.cbt_exam_audience(exam_id)));
create policy "CBT audience managers manage cbt_answers" on public.cbt_answers for all to authenticated
  using (public.cbt_can_manage(public.cbt_exam_audience((select p.exam_id from public.cbt_participants p where p.id = participant_id))))
  with check (public.cbt_can_manage(public.cbt_exam_audience((select p.exam_id from public.cbt_participants p where p.id = participant_id))));

-- Enrol every active student of a class; tokens come from the column default.
create or replace function public.cbt_enroll_class(p_exam_id uuid, p_class_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  inserted integer;
begin
  if public.cbt_exam_audience(p_exam_id) is distinct from 'student' then raise exception 'Ujian ini bukan ujian siswa.'; end if;
  if not public.cbt_can_manage('student') then raise exception 'Anda tidak memiliki izin mengelola ujian siswa.'; end if;
  insert into public.cbt_participants (exam_id, student_id, class_id)
  select p_exam_id, s.id, s.class_id from public.students s
  where s.class_id = p_class_id and s.status = 'active'
  on conflict (student_id, exam_id) where student_id is not null do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function public.cbt_enroll_class(uuid, uuid) from public, anon;
grant execute on function public.cbt_enroll_class(uuid, uuid) to authenticated;

-- Write a finished student score to the Gradebook when the exam asks for it.
create or replace function public.cbt_publish_participant_score(p_participant_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  participant public.cbt_participants%rowtype;
  exam public.cbt_exams%rowtype;
begin
  select * into participant from public.cbt_participants where id = p_participant_id;
  if participant.student_id is null or participant.status <> 'completed' or participant.class_id is null then return false; end if;
  select * into exam from public.cbt_exams where id = participant.exam_id;
  if not exam.publish_to_gradebook or exam.subject_id is null or exam.semester_id is null or exam.grade_type is null then return false; end if;
  insert into public.academic_grades (student_id, subject_id, class_id, semester_id, grade_type, score, notes)
  values (participant.student_id, exam.subject_id, participant.class_id, exam.semester_id, exam.grade_type,
          coalesce(participant.score, 0)::numeric::text, 'CBT: ' || exam.title)
  on conflict (student_id, subject_id, class_id, semester_id, grade_type)
  do update set score = excluded.score, notes = excluded.notes, updated_at = now();
  return true;
end;
$$;
revoke all on function public.cbt_publish_participant_score(uuid) from public, anon, authenticated;

-- Re-publish all finished scores of an exam (e.g. after enabling publish_to_gradebook).
create or replace function public.cbt_publish_exam_scores(p_exam_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  published integer := 0;
  participant record;
begin
  if public.cbt_exam_audience(p_exam_id) is distinct from 'student' or not public.cbt_can_manage('student') then
    raise exception 'Anda tidak memiliki izin mengelola ujian siswa.';
  end if;
  for participant in select id from public.cbt_participants where exam_id = p_exam_id and status = 'completed' loop
    if public.cbt_publish_participant_score(participant.id) then published := published + 1; end if;
  end loop;
  return published;
end;
$$;
revoke all on function public.cbt_publish_exam_scores(uuid) from public, anon;
grant execute on function public.cbt_publish_exam_scores(uuid) to authenticated;

-- Grading (unchanged) + Gradebook publication for student exams.
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

  perform public.cbt_publish_participant_score(participant.id);
end;
$$;
revoke all on function public.cbt_finalize(uuid) from public, anon, authenticated;

-- Session: student names, exam window, optional score display.
create or replace function public.cbt_session(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  participant public.cbt_participants%rowtype;
  exam public.cbt_exams%rowtype;
  participant_name text;
  ends_at timestamptz;
  ids uuid[];
begin
  select * into participant from public.cbt_participants
   where token = upper(btrim(coalesce(p_token, ''))) for update;
  if not found then return null; end if;

  select * into exam from public.cbt_exams where id = participant.exam_id;
  if participant.student_id is not null then
    select full_name into participant_name from public.students where id = participant.student_id;
  else
    select full_name into participant_name from public.recruitment_applicants where id = participant.applicant_id;
  end if;

  if participant.status = 'pending' then
    if exam.starts_at is not null and now() < exam.starts_at then
      return jsonb_build_object('status', 'not_started', 'applicant_name', participant_name, 'exam_title', exam.title, 'starts_at', exam.starts_at, 'server_now', now());
    end if;
    if exam.ends_at is not null and now() > exam.ends_at then
      return jsonb_build_object('status', 'closed', 'applicant_name', participant_name, 'exam_title', exam.title, 'ends_at', exam.ends_at);
    end if;
    update public.cbt_participants set status = 'in_progress', started_at = now()
     where id = participant.id returning * into participant;
  end if;

  if participant.status = 'in_progress' then
    ids := public.cbt_assign_questions(participant.id);
    ends_at := participant.started_at + make_interval(mins => exam.duration_minutes);
    if exam.ends_at is not null and exam.ends_at < ends_at then ends_at := exam.ends_at; end if;
    -- Toleransi 30 detik untuk latensi jaringan; lewat dari itu dinilai otomatis.
    if now() > ends_at + interval '30 seconds' then
      perform public.cbt_finalize(participant.id);
      select * into participant from public.cbt_participants where id = participant.id;
    end if;
  end if;

  if participant.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'applicant_name', participant_name, 'exam_title', exam.title)
      || case when exam.show_score then jsonb_build_object('score', participant.score, 'is_passed', participant.is_passed) else '{}'::jsonb end;
  end if;

  return jsonb_build_object(
    'status', participant.status,
    'applicant_name', participant_name,
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
  deadline timestamptz;
begin
  select * into participant from public.cbt_participants where token = upper(btrim(coalesce(p_token, '')));
  if not found then raise exception 'Token ujian tidak valid.'; end if;
  if participant.status <> 'in_progress' then raise exception 'Sesi ujian sudah tidak aktif.'; end if;

  select * into exam from public.cbt_exams where id = participant.exam_id;
  deadline := participant.started_at + make_interval(mins => exam.duration_minutes);
  if exam.ends_at is not null and exam.ends_at < deadline then deadline := exam.ends_at; end if;
  if now() > deadline + interval '30 seconds' then
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

revoke all on function public.cbt_session(text) from public;
revoke all on function public.cbt_save_answer(text, uuid, text) from public;
grant execute on function public.cbt_session(text) to anon, authenticated;
grant execute on function public.cbt_save_answer(text, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
