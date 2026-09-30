-- /lms supports two learning patterns on the same Program -> Group -> Meeting structure:
--   preschool_hbl  "Tematik PAUD": Tema/Subtema -> Pertemuan -> Kegiatan main (CP Fase Fondasi)
--   general_hbl    "Mapel SD":     Pekan belajar -> Pertemuan per mata pelajaran -> Tugas
-- Meetings of subject-based programs reference the school's master subjects so they can later
-- feed the gradebook. hbl_program_overview powers the program cards (runs with caller's RLS).

alter table public.hbl_meetings add column if not exists subject_id uuid references public.subjects(id) on delete set null;
create index if not exists hbl_meetings_subject_idx on public.hbl_meetings(subject_id);

create or replace function public.hbl_program_overview(p_semester_id uuid default null)
returns table (
  program_id uuid,
  participants integer,
  groups integer,
  meetings integer,
  published_meetings integer,
  held_meetings integer,
  next_meeting_date date,
  next_meeting_title text,
  pending_reports integer
)
language sql stable set search_path = public as $$
  with today as (select (now() at time zone 'Asia/Jakarta')::date as d)
  select
    p.id,
    (select count(*) from public.hbl_program_students e where e.program_id = p.id)::int,
    (select count(*) from public.hbl_learning_weeks w where w.program_id = p.id)::int,
    (select count(*) from public.hbl_meetings m where m.program_id = p.id)::int,
    (select count(*) from public.hbl_meetings m where m.program_id = p.id and m.is_published and m.status = 'published')::int,
    (select count(*) from public.hbl_meetings m, today where m.program_id = p.id and m.is_published and m.meeting_date <= today.d)::int,
    nm.meeting_date,
    nm.title,
    ((select count(*) from public.hbl_activity_submissions s
        join public.hbl_activities a on a.id = s.activity_id
        join public.hbl_meetings m on m.id = a.meeting_id
      where m.program_id = p.id and s.status = 'submitted')
     + (select count(*) from public.hbl_home_project_submissions s
        join public.hbl_meetings m on m.id = s.meeting_id
      where m.program_id = p.id and s.status = 'submitted'))::int
  from public.hbl_programs p
  left join lateral (
    select m.meeting_date, m.title from public.hbl_meetings m, today
    where m.program_id = p.id and m.meeting_date >= today.d
    order by m.meeting_date, m.start_time nulls last
    limit 1
  ) nm on true
  where p_semester_id is null or p.semester_id = p_semester_id;
$$;
revoke all on function public.hbl_program_overview(uuid) from public, anon;
grant execute on function public.hbl_program_overview(uuid) to authenticated;

notify pgrst, 'reload schema';
