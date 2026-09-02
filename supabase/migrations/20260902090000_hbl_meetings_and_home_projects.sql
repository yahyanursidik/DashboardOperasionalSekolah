-- Extend HBL from program/subject/material into program/meeting/multiple materials
-- with live sessions, worksheets, home projects, and teacher feedback.

create table if not exists public.hbl_meetings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hbl_programs(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  description text,
  meeting_date date,
  start_time time,
  end_time time,
  live_platform text check (live_platform in ('zoom', 'google_meet', 'other') or live_platform is null),
  live_url text check (live_url is null or live_url ~* '^https://'),
  worksheet_title text,
  worksheet_instructions text,
  worksheet_url text check (worksheet_url is null or worksheet_url ~* '^https://'),
  project_title text,
  project_instructions text,
  project_due_date date,
  is_published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hbl_materials
  add column if not exists meeting_id uuid references public.hbl_meetings(id) on delete cascade;
alter table public.hbl_materials drop constraint if exists hbl_materials_resource_type_check;
alter table public.hbl_materials add constraint hbl_materials_resource_type_check
  check (resource_type in ('youtube', 'google_drive', 'video', 'audio', 'pdf', 'link'));

create table if not exists public.hbl_home_project_submissions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.hbl_meetings(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete restrict,
  submission_url text not null check (submission_url ~* '^https://|^s3://'),
  file_name text,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'needs_revision')),
  feedback text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, student_id)
);

create index if not exists hbl_meetings_program_sort_idx on public.hbl_meetings(program_id, sort_order, meeting_date);
create index if not exists hbl_materials_meeting_sort_idx on public.hbl_materials(meeting_id, sort_order);
create index if not exists hbl_home_project_submissions_student_idx on public.hbl_home_project_submissions(student_id, status, submitted_at desc);

drop trigger if exists hbl_meetings_set_updated_at on public.hbl_meetings;
create trigger hbl_meetings_set_updated_at before update on public.hbl_meetings for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_home_project_submissions_set_updated_at on public.hbl_home_project_submissions;
create trigger hbl_home_project_submissions_set_updated_at before update on public.hbl_home_project_submissions for each row execute function public.hbl_set_updated_at();

create or replace function public.hbl_parent_can_access_meeting(p_meeting_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hbl_meetings meeting
    where meeting.id = p_meeting_id and meeting.is_published
      and public.hbl_parent_can_access_program(meeting.program_id)
  );
$$;

alter table public.hbl_meetings enable row level security;
alter table public.hbl_home_project_submissions enable row level security;
drop policy if exists "HBL managers manage meetings" on public.hbl_meetings;
create policy "HBL managers manage meetings" on public.hbl_meetings for all to authenticated
using (public.hbl_can_manage_program(program_id)) with check (public.hbl_can_manage_program(program_id));
drop policy if exists "Parents read published HBL meetings" on public.hbl_meetings;
create policy "Parents read published HBL meetings" on public.hbl_meetings for select to authenticated
using (is_published and public.hbl_parent_can_access_program(program_id));
drop policy if exists "Parents read published HBL materials" on public.hbl_materials;
create policy "Parents read published HBL materials" on public.hbl_materials for select to authenticated
using (
  is_published
  and public.hbl_parent_can_access_program((select subject.program_id from public.hbl_subjects subject where subject.id = hbl_materials.subject_id))
  and (meeting_id is null or public.hbl_parent_can_access_meeting(meeting_id))
);
drop policy if exists "HBL managers manage home projects" on public.hbl_home_project_submissions;
create policy "HBL managers manage home projects" on public.hbl_home_project_submissions for all to authenticated
using (public.hbl_can_manage_program((select program_id from public.hbl_meetings where id = meeting_id)))
with check (public.hbl_can_manage_program((select program_id from public.hbl_meetings where id = meeting_id)));
drop policy if exists "Parents manage own HBL home projects" on public.hbl_home_project_submissions;
create policy "Parents manage own HBL home projects" on public.hbl_home_project_submissions for all to authenticated
using (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_meeting(meeting_id) and public.hbl_parent_can_access_student(student_id))
with check (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_meeting(meeting_id) and public.hbl_parent_can_access_student(student_id));
grant select, insert, update, delete on public.hbl_meetings, public.hbl_home_project_submissions to authenticated;
grant execute on function public.hbl_parent_can_access_meeting(uuid) to authenticated;
