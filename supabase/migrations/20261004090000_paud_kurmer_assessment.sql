-- PAUD/TK: Kurikulum Merdeka assessment cycle (asesmen awal, tengah, akhir per semester) for both
-- the regular preschool and the online Preschool HBL unit, plus parent-portal reporting.
--
-- 1. Units: the HBL preschool unit had no education_level, so every PAUD screen either missed it
--    or fell back to "all units" (showing Elementary classes). Units now also carry a delivery mode.
-- 2. paud_stppa_assessments gains the assessment phase, the three Capaian Pembelajaran elements of
--    Fase Fondasi, P5 notes, semester attendance, teacher note and a parent reflection.
-- 3. paud_activities (the observation journal) records the learning mode, evidence source and the
--    CP elements it evidences, so HBL evidence (live meet, home tasks, parent reports) lives in the
--    same journal as classroom observation.
-- 4. Teachers who can access a class manage all its PAUD records (team teaching in KB/TK).
-- 5. Parents are notified in-app when an assessment is published and can leave a reflection.

-- 1. Units ------------------------------------------------------------------------------------
alter table public.units add column if not exists delivery_mode text not null default 'reguler';
do $$ begin
  alter table public.units add constraint units_delivery_mode_check check (delivery_mode in ('reguler', 'online'));
exception when duplicate_object then null; end $$;

update public.units set education_level = 'preschool'
where education_level is null
  and (name ~* '(preschool|paud|\mtk\M|\mkb\M|kindergarten|playgroup)');

update public.units set delivery_mode = 'online'
where name ~* '(hbl|online|daring|homeschool|home ?based)';

create or replace function public.is_paud_unit(target_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.units u where u.id = target_unit_id and u.education_level = 'preschool');
$$;
grant execute on function public.is_paud_unit(uuid) to authenticated;

-- 2. Assessments ------------------------------------------------------------------------------
alter table public.paud_stppa_assessments
  add column if not exists phase text,
  add column if not exists learning_mode text not null default 'reguler',
  add column if not exists nab_scale public.stppa_scale,
  add column if not exists nab_desc text,
  add column if not exists jati_diri_scale public.stppa_scale,
  add column if not exists jati_diri_desc text,
  add column if not exists steam_scale public.stppa_scale,
  add column if not exists steam_desc text,
  add column if not exists p5_theme text,
  add column if not exists p5_desc text,
  add column if not exists attendance_present integer,
  add column if not exists attendance_sick integer,
  add column if not exists attendance_permit integer,
  add column if not exists attendance_absent integer,
  add column if not exists teacher_note text,
  add column if not exists parent_reflection text,
  add column if not exists parent_reflected_at timestamptz,
  add column if not exists parent_reflected_by uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

do $$ begin
  alter table public.paud_stppa_assessments add constraint paud_stppa_phase_check check (phase is null or phase in ('awal', 'tengah', 'akhir'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.paud_stppa_assessments add constraint paud_stppa_learning_mode_check check (learning_mode in ('reguler', 'online'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.paud_stppa_assessments add constraint paud_stppa_attendance_check check (
    coalesce(attendance_present, 0) >= 0 and coalesce(attendance_sick, 0) >= 0
    and coalesce(attendance_permit, 0) >= 0 and coalesce(attendance_absent, 0) >= 0);
exception when duplicate_object then null; end $$;

-- One assessment per child, semester and phase.
create unique index if not exists paud_stppa_student_semester_phase_key
  on public.paud_stppa_assessments (student_id, semester_id, phase) where phase is not null;

-- 3. Observation journal ----------------------------------------------------------------------
alter table public.paud_activities
  add column if not exists learning_mode text not null default 'reguler',
  add column if not exists evidence_source text not null default 'observasi_kelas',
  add column if not exists cp_elements text[] not null default '{}';

do $$ begin
  alter table public.paud_activities add constraint paud_activities_learning_mode_check check (learning_mode in ('reguler', 'online'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.paud_activities add constraint paud_activities_evidence_source_check check (
    evidence_source in ('observasi_kelas', 'live_meet', 'tugas_rumah', 'laporan_orang_tua', 'karya', 'projek'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.paud_activities add constraint paud_activities_cp_elements_check check (
    cp_elements <@ array['nab', 'jati_diri', 'steam']::text[]);
exception when duplicate_object then null; end $$;

-- Learning mode follows the child's unit unless the teacher sets it explicitly.
create or replace function public.paud_record_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  unit_mode text;
begin
  if tg_op = 'INSERT' and (new.learning_mode is null or new.learning_mode = 'reguler') then
    select u.delivery_mode into unit_mode
    from public.students s join public.units u on u.id = s.unit_id
    where s.id = new.student_id;
    if unit_mode = 'online' then new.learning_mode := 'online'; end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists paud_activities_defaults on public.paud_activities;
create trigger paud_activities_defaults before insert or update on public.paud_activities
  for each row execute function public.paud_record_defaults();

create or replace function public.paud_assessment_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  unit_mode text;
begin
  if tg_op = 'INSERT' and (new.learning_mode is null or new.learning_mode = 'reguler') then
    select u.delivery_mode into unit_mode
    from public.students s join public.units u on u.id = s.unit_id
    where s.id = new.student_id;
    if unit_mode = 'online' then new.learning_mode := 'online'; end if;
  end if;
  if new.status = 'published' and new.is_parent_visible then
    if tg_op = 'INSERT' or old.status is distinct from 'published' or not old.is_parent_visible then
      new.published_at := now();
    end if;
  else
    new.published_at := null;
  end if;
  -- The parent reflection is written only through paud_submit_parent_reflection.
  if tg_op = 'UPDATE' and current_setting('paud.reflection_rpc', true) is distinct from 'on' then
    new.parent_reflection := old.parent_reflection;
    new.parent_reflected_at := old.parent_reflected_at;
    new.parent_reflected_by := old.parent_reflected_by;
  elsif tg_op = 'INSERT' then
    new.parent_reflection := null;
    new.parent_reflected_at := null;
    new.parent_reflected_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists paud_assessment_defaults on public.paud_stppa_assessments;
create trigger paud_assessment_defaults before insert or update on public.paud_stppa_assessments
  for each row execute function public.paud_assessment_defaults();

-- 4. Teacher policies: every teacher of the class (homeroom, schedule, assignment) ------------
drop policy if exists "PAUD teachers manage assigned activities" on public.paud_activities;
create policy "PAUD teachers manage assigned activities" on public.paud_activities for all to authenticated
  using (public.teacher_can_access_class(coalesce(class_id, (select s.class_id from public.students s where s.id = paud_activities.student_id))))
  with check (public.teacher_can_access_class(coalesce(class_id, (select s.class_id from public.students s where s.id = paud_activities.student_id))));

drop policy if exists "PAUD teachers manage assigned assessments" on public.paud_stppa_assessments;
create policy "PAUD teachers manage assigned assessments" on public.paud_stppa_assessments for all to authenticated
  using (public.teacher_can_access_class(coalesce(class_id, (select s.class_id from public.students s where s.id = paud_stppa_assessments.student_id))))
  with check (public.teacher_can_access_class(coalesce(class_id, (select s.class_id from public.students s where s.id = paud_stppa_assessments.student_id))));

-- 5. Parent notification and reflection -------------------------------------------------------
create or replace function public.notify_paud_assessment_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  student_name text;
  phase_label text;
begin
  if new.published_at is null or (tg_op = 'UPDATE' and old.published_at is not null) then return new; end if;
  select full_name into student_name from public.students where id = new.student_id;
  phase_label := case new.phase when 'awal' then 'Asesmen Awal' when 'tengah' then 'Asesmen Tengah' when 'akhir' then 'Laporan Akhir Semester' else 'Laporan Perkembangan' end;
  perform public.notify_users(public.parent_user_ids(array[new.student_id]), 'report', 'paud_assessment_published', new.id,
    phase_label || ' ' || coalesce(student_name, 'ananda') || ' telah terbit',
    coalesce(new.period_name, phase_label) || '. Buka portal untuk membaca capaian dan saran kegiatan di rumah.',
    '/portal/paud');
  return new;
exception when others then
  raise warning 'notify_paud_assessment_published: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_paud_assessment_published on public.paud_stppa_assessments;
create trigger notify_paud_assessment_published after insert or update of status, is_parent_visible, published_at on public.paud_stppa_assessments
  for each row execute function public.notify_paud_assessment_published();

create or replace function public.paud_submit_parent_reflection(p_assessment_id uuid, p_reflection text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  target record;
  teacher_user uuid;
  student_name text;
  reflected timestamptz := now();
begin
  select a.id, a.student_id, a.employee_id, a.status, a.is_parent_visible, a.phase
    into target from public.paud_stppa_assessments a where a.id = p_assessment_id;
  if target.id is null or target.status <> 'published' or not target.is_parent_visible
     or not public.is_parent_of_student(target.student_id) then
    raise exception 'Laporan tidak ditemukan atau belum dibagikan kepada Anda.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reflection, ''))) < 3 or char_length(p_reflection) > 3000 then
    raise exception 'Tanggapan orang tua harus 3 sampai 3000 karakter.' using errcode = '22023';
  end if;

  perform set_config('paud.reflection_rpc', 'on', true);
  update public.paud_stppa_assessments
     set parent_reflection = btrim(p_reflection), parent_reflected_at = reflected, parent_reflected_by = auth.uid()
   where id = p_assessment_id;
  perform set_config('paud.reflection_rpc', 'off', true);

  select e.user_id into teacher_user from public.employees e where e.id = target.employee_id;
  select full_name into student_name from public.students where id = target.student_id;
  if teacher_user is not null then
    perform public.notify_users(array[teacher_user], 'report', 'paud_parent_reflection_' || to_char(reflected, 'YYYYMMDDHH24MISS'), target.id,
      'Tanggapan orang tua ' || coalesce(student_name, 'anak'),
      left(btrim(p_reflection), 180),
      case when public.employee_portal_prefix(teacher_user) = '/teacher' then '/teacher/paud' else '/stppa-assessments' end);
  end if;
  return reflected;
end;
$$;
revoke all on function public.paud_submit_parent_reflection(uuid, text) from public, anon;
grant execute on function public.paud_submit_parent_reflection(uuid, text) to authenticated;

notify pgrst, 'reload schema';
