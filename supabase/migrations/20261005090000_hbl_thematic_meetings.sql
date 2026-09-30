-- Preschool HBL as thematic meetings (PAUD): Program (per class) -> Tema/Subtema -> Pertemuan.
--
-- 1. A program is linked to one class; its participants follow the class roster automatically
--    (previously every child had to be enrolled by hand and 0 of 16 HBL children were enrolled).
-- 2. Teachers of the linked class (homeroom, schedule, assignment) manage the program content;
--    before this only unit admins/principals could, so HBL teachers could not plan meetings.
-- 3. Meetings carry supporting media links and the Kurikulum Merdeka elements they target,
--    replacing the subject/material structure that does not fit thematic PAUD learning.
-- 4. Meeting attendance is written to attendance_records, so it feeds the PAUD assessment
--    attendance recap; parents are notified when a meeting is published.

-- 1. Program -> class ---------------------------------------------------------------------
alter table public.hbl_programs add column if not exists class_id uuid references public.classes(id) on delete set null;
create index if not exists hbl_programs_class_idx on public.hbl_programs(class_id);

-- 3. Meeting content -----------------------------------------------------------------------
alter table public.hbl_meetings
  add column if not exists media_links jsonb not null default '[]'::jsonb,
  add column if not exists cp_elements text[] not null default '{}';
do $$ begin
  alter table public.hbl_meetings add constraint hbl_meetings_media_links_check check (jsonb_typeof(media_links) = 'array' and jsonb_array_length(media_links) <= 20);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hbl_meetings add constraint hbl_meetings_cp_elements_check check (cp_elements <@ array['nab', 'jati_diri', 'steam']::text[]);
exception when duplicate_object then null; end $$;

-- 2. Management rights -----------------------------------------------------------------------
create or replace function public.hbl_can_manage_program(p_program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hbl_programs program
    where program.id = p_program_id
      and (
        public.hbl_is_manager_for_unit(program.unit_id)
        or (program.class_id is not null and public.teacher_can_access_class(program.class_id))
      )
  );
$$;

drop policy if exists "Teachers read HBL programs of their classes" on public.hbl_programs;
create policy "Teachers read HBL programs of their classes" on public.hbl_programs for select to authenticated
  using (class_id is not null and public.teacher_can_access_class(class_id));

-- 1. Roster sync -------------------------------------------------------------------------------
create or replace function public.hbl_sync_program_roster(p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target_class uuid;
  added integer := 0;
  removed integer := 0;
begin
  select class_id into target_class from public.hbl_programs where id = p_program_id;
  if target_class is null then
    return jsonb_build_object('added', 0, 'removed', 0);
  end if;
  with inserted as (
    insert into public.hbl_program_students (program_id, student_id)
    select p_program_id, s.id from public.students s
    where s.class_id = target_class and s.status = 'active'
    on conflict (program_id, student_id) do nothing
    returning 1
  ) select count(*) into added from inserted;
  with deleted as (
    delete from public.hbl_program_students e
    where e.program_id = p_program_id
      and not exists (select 1 from public.students s where s.id = e.student_id and s.class_id = target_class and s.status = 'active')
    returning 1
  ) select count(*) into removed from deleted;
  return jsonb_build_object('added', added, 'removed', removed);
end;
$$;
revoke all on function public.hbl_sync_program_roster(uuid) from public, anon, authenticated;

create or replace function public.hbl_sync_program_students(p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.hbl_can_manage_program(p_program_id) then
    raise exception 'Anda tidak memiliki akses ke program HBL ini.' using errcode = '42501';
  end if;
  return public.hbl_sync_program_roster(p_program_id);
end;
$$;
revoke all on function public.hbl_sync_program_students(uuid) from public, anon;
grant execute on function public.hbl_sync_program_students(uuid) to authenticated;

create or replace function public.hbl_program_roster_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.class_id is not null then
    perform public.hbl_sync_program_roster(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists hbl_program_roster on public.hbl_programs;
create trigger hbl_program_roster after insert or update of class_id on public.hbl_programs
  for each row execute function public.hbl_program_roster_trigger();

-- Class moves and status changes keep every class-linked program in step.
create or replace function public.hbl_student_roster_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.class_id is not null
     and (new.class_id is distinct from old.class_id or new.status is distinct from 'active') then
    delete from public.hbl_program_students e
    using public.hbl_programs p
    where e.program_id = p.id and p.class_id = old.class_id and e.student_id = old.id;
  end if;
  if new.class_id is not null and new.status = 'active' then
    insert into public.hbl_program_students (program_id, student_id)
    select p.id, new.id from public.hbl_programs p
    where p.class_id = new.class_id and p.status <> 'archived'
    on conflict (program_id, student_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists hbl_student_roster on public.students;
create trigger hbl_student_roster after insert or update of class_id, status on public.students
  for each row execute function public.hbl_student_roster_trigger();

-- 4. Meeting attendance --------------------------------------------------------------------------
create or replace function public.hbl_record_meeting_attendance(p_meeting_id uuid, p_entries jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  meeting record;
  saved integer := 0;
begin
  select m.id, m.title, m.meeting_date, m.program_id, p.academic_year_id
    into meeting
  from public.hbl_meetings m join public.hbl_programs p on p.id = m.program_id
  where m.id = p_meeting_id;
  if meeting.id is null or not public.hbl_can_manage_program(meeting.program_id) then
    raise exception 'Anda tidak memiliki akses ke pertemuan ini.' using errcode = '42501';
  end if;
  if meeting.meeting_date is null then
    raise exception 'Isi tanggal pertemuan sebelum mencatat kehadiran.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Format kehadiran tidak valid.' using errcode = '22023';
  end if;

  with entries as (
    select (e->>'student_id')::uuid as student_id, e->>'status' as status, nullif(btrim(e->>'note'), '') as note
    from jsonb_array_elements(p_entries) e
  ), upserted as (
    insert into public.attendance_records (student_id, class_id, unit_id, academic_year_id, attendance_date, status, note, recorded_by)
    select s.id, s.class_id, s.unit_id, coalesce(meeting.academic_year_id, (select c.academic_year_id from public.classes c where c.id = s.class_id)),
           meeting.meeting_date, entries.status,
           left(coalesce(entries.note, 'Pertemuan HBL: ' || meeting.title), 500), auth.uid()
    from entries
    join public.students s on s.id = entries.student_id
    join public.hbl_program_students e on e.student_id = s.id and e.program_id = meeting.program_id
    where entries.status in ('hadir', 'izin', 'sakit', 'alpa', 'terlambat', 'pulang_awal')
    on conflict (student_id, attendance_date) do update
      set status = excluded.status, note = excluded.note, recorded_by = excluded.recorded_by, updated_at = now()
    returning 1
  ) select count(*) into saved from upserted;
  return saved;
end;
$$;
revoke all on function public.hbl_record_meeting_attendance(uuid, jsonb) from public, anon;
grant execute on function public.hbl_record_meeting_attendance(uuid, jsonb) to authenticated;

-- Parents are notified when a meeting becomes visible.
create or replace function public.notify_hbl_meeting_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  student_ids uuid[];
begin
  if not (new.is_published and new.status = 'published') then return new; end if;
  if tg_op = 'UPDATE' and old.is_published and old.status = 'published' then return new; end if;
  if new.week_id is not null and not exists (select 1 from public.hbl_learning_weeks w where w.id = new.week_id and w.status = 'published') then
    return new;
  end if;
  select coalesce(array_agg(e.student_id), '{}') into student_ids from public.hbl_program_students e where e.program_id = new.program_id;
  perform public.notify_users(public.parent_user_ids(student_ids), 'task', 'hbl_meeting_published', new.id,
    'Pertemuan HBL: ' || new.title,
    coalesce(to_char(new.meeting_date, 'DD-MM-YYYY'), 'Jadwal fleksibel') || coalesce(' pukul ' || to_char(new.start_time, 'HH24:MI'), '') || '. Buka portal untuk tautan live meet dan kegiatan.',
    '/portal/hbl');
  return new;
exception when others then
  raise warning 'notify_hbl_meeting_published: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_hbl_meeting_published on public.hbl_meetings;
create trigger notify_hbl_meeting_published after insert or update of is_published, status on public.hbl_meetings
  for each row execute function public.notify_hbl_meeting_published();

notify pgrst, 'reload schema';
