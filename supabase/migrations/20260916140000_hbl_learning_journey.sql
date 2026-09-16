-- TSLS Learning Journey for Preschool Homebased Learning.
-- This extends the existing HBL tables without replacing the current program,
-- material, meeting, worksheet, or home-project records.

alter table public.hbl_programs
  add column if not exists journey_mode text not null default 'preschool_hbl'
    check (journey_mode in ('preschool_hbl', 'general_hbl')),
  add column if not exists parent_welcome text,
  add column if not exists learning_track text;

create table if not exists public.hbl_learning_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hbl_programs(id) on delete cascade,
  week_number integer not null check (week_number > 0 and week_number <= 60),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  theme text,
  description text,
  parent_guide text,
  preparation_notes text,
  support_notes text,
  starts_on date,
  ends_on date,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  release_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, week_number),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

alter table public.hbl_meetings
  add column if not exists week_id uuid references public.hbl_learning_weeks(id) on delete set null,
  add column if not exists meeting_number integer check (meeting_number is null or meeting_number > 0),
  add column if not exists learning_objectives text,
  add column if not exists instructions_for_parent text,
  add column if not exists estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 480),
  add column if not exists status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  add column if not exists release_at timestamptz,
  add column if not exists teacher_notes text;

-- Existing published meetings remain published after this migration.
update public.hbl_meetings
set status = case when is_published then 'published' else 'draft' end
where status = 'draft' and is_published;

create or replace function public.hbl_sync_meeting_publication()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'published' then
    new.is_published := true;
  elsif tg_op = 'insert' and new.is_published then
    new.status := 'published';
  elsif tg_op = 'update' and new.is_published is distinct from old.is_published then
    new.status := case when new.is_published then 'published' else 'draft' end;
  else
    new.is_published := false;
  end if;
  return new;
end;
$$;

drop trigger if exists hbl_meetings_sync_publication on public.hbl_meetings;
create trigger hbl_meetings_sync_publication
before insert or update of is_published, status on public.hbl_meetings
for each row execute function public.hbl_sync_meeting_publication();

alter table public.hbl_materials
  add column if not exists audience text not null default 'family' check (audience in ('parent', 'child', 'family')),
  add column if not exists content_text text,
  add column if not exists is_required boolean not null default false,
  add column if not exists release_at timestamptz;
alter table public.hbl_materials alter column resource_url drop not null;
alter table public.hbl_materials drop constraint if exists hbl_materials_resource_type_check;
alter table public.hbl_materials add constraint hbl_materials_resource_type_check
  check (resource_type in ('youtube', 'google_drive', 'google_slides', 'video', 'audio', 'pdf', 'ppt', 'image', 'link', 'download', 'embed', 'text'));
alter table public.hbl_materials drop constraint if exists hbl_materials_resource_content_check;
alter table public.hbl_materials add constraint hbl_materials_resource_content_check
  check (
    (resource_type = 'text' and nullif(btrim(coalesce(content_text, '')), '') is not null)
    or (resource_type <> 'text' and resource_url ~* '^https://')
  );

create table if not exists public.hbl_activities (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.hbl_meetings(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  instructions text not null check (char_length(btrim(instructions)) between 3 and 6000),
  activity_type text not null default 'explore' check (activity_type in ('observe', 'explore', 'create', 'movement', 'story', 'music', 'routine', 'reflection')),
  audience text not null default 'child' check (audience in ('parent', 'child', 'family')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 240),
  materials_needed text,
  conversation_prompt text,
  evidence_type text not null default 'none' check (evidence_type in ('none', 'checklist', 'parent_note', 'photo', 'video', 'audio', 'optional_upload')),
  evidence_required boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'scheduled', 'published', 'archived')),
  release_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not evidence_required or evidence_type <> 'none')
);

create table if not exists public.hbl_live_sessions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.hbl_meetings(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  platform text not null check (platform in ('zoom', 'google_meet', 'microsoft_teams', 'youtube_live', 'other')),
  meeting_url text not null check (meeting_url ~* '^https://'),
  starts_at timestamptz,
  ends_at timestamptz,
  recording_url text check (recording_url is null or recording_url ~* '^https://'),
  attendance_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.hbl_live_attendances (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.hbl_live_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'late', 'permission', 'sick', 'absent')),
  note text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  unique (live_session_id, student_id)
);

create table if not exists public.hbl_activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.hbl_activities(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete restrict,
  checklist_completed boolean not null default false,
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://|^s3://'),
  evidence_file_name text,
  parent_note text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'needs_revision')),
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (activity_id, student_id)
);

create table if not exists public.hbl_parent_checkins (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.hbl_learning_weeks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete restrict,
  wellbeing text not null check (wellbeing in ('happy', 'okay', 'challenged', 'need_help')),
  favorite_activity text,
  message text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, student_id)
);

create table if not exists public.hbl_student_observations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hbl_programs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  week_id uuid references public.hbl_learning_weeks(id) on delete set null,
  meeting_id uuid references public.hbl_meetings(id) on delete set null,
  domain text not null check (domain in ('language', 'cognitive', 'motor', 'social_emotional', 'religious_values', 'art', 'independence', 'other')),
  indicator text,
  observation text not null check (char_length(btrim(observation)) between 3 and 6000),
  development_stage text check (development_stage is null or development_stage in ('emerging', 'developing', 'secure', 'beyond')),
  source text not null default 'teacher' check (source in ('teacher', 'parent_checkin', 'activity', 'live_session')),
  is_visible_to_parent boolean not null default true,
  observed_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hbl_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hbl_programs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  week_id uuid references public.hbl_learning_weeks(id) on delete set null,
  observation_id uuid references public.hbl_student_observations(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  story text,
  media_url text check (media_url is null or media_url ~* '^https://|^s3://'),
  media_type text check (media_type is null or media_type in ('image', 'video', 'audio', 'document', 'link')),
  captured_on date not null default current_date,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hbl_learning_weeks_program_status_idx on public.hbl_learning_weeks(program_id, status, sort_order, starts_on);
create index if not exists hbl_meetings_week_status_idx on public.hbl_meetings(week_id, status, sort_order, meeting_date);
create index if not exists hbl_activities_meeting_status_idx on public.hbl_activities(meeting_id, status, sort_order);
create index if not exists hbl_activity_submissions_student_idx on public.hbl_activity_submissions(student_id, status, submitted_at desc);
create index if not exists hbl_parent_checkins_student_idx on public.hbl_parent_checkins(student_id, submitted_at desc);
create index if not exists hbl_observations_student_idx on public.hbl_student_observations(student_id, observed_on desc);
create index if not exists hbl_portfolio_student_idx on public.hbl_portfolio_items(student_id, captured_on desc);

drop trigger if exists hbl_learning_weeks_set_updated_at on public.hbl_learning_weeks;
create trigger hbl_learning_weeks_set_updated_at before update on public.hbl_learning_weeks for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_activities_set_updated_at on public.hbl_activities;
create trigger hbl_activities_set_updated_at before update on public.hbl_activities for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_live_sessions_set_updated_at on public.hbl_live_sessions;
create trigger hbl_live_sessions_set_updated_at before update on public.hbl_live_sessions for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_activity_submissions_set_updated_at on public.hbl_activity_submissions;
create trigger hbl_activity_submissions_set_updated_at before update on public.hbl_activity_submissions for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_parent_checkins_set_updated_at on public.hbl_parent_checkins;
create trigger hbl_parent_checkins_set_updated_at before update on public.hbl_parent_checkins for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_student_observations_set_updated_at on public.hbl_student_observations;
create trigger hbl_student_observations_set_updated_at before update on public.hbl_student_observations for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_portfolio_items_set_updated_at on public.hbl_portfolio_items;
create trigger hbl_portfolio_items_set_updated_at before update on public.hbl_portfolio_items for each row execute function public.hbl_set_updated_at();

create or replace function public.hbl_parent_can_access_week(p_week_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hbl_learning_weeks week
    where week.id = p_week_id
      and week.status = 'published'
      and coalesce(week.release_at, '-infinity'::timestamptz) <= now()
      and public.hbl_parent_can_access_program(week.program_id)
  );
$$;

create or replace function public.hbl_parent_can_access_meeting(p_meeting_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hbl_meetings meeting
    where meeting.id = p_meeting_id
      and meeting.is_published
      and meeting.status = 'published'
      and coalesce(meeting.release_at, '-infinity'::timestamptz) <= now()
      and (meeting.week_id is null or public.hbl_parent_can_access_week(meeting.week_id))
      and public.hbl_parent_can_access_program(meeting.program_id)
  );
$$;

create or replace function public.hbl_parent_can_access_activity(p_activity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hbl_activities activity
    where activity.id = p_activity_id
      and activity.status = 'published'
      and coalesce(activity.release_at, '-infinity'::timestamptz) <= now()
      and public.hbl_parent_can_access_meeting(activity.meeting_id)
  );
$$;

-- Keep existing material reports safe when a material is scheduled for later.
create or replace function public.hbl_parent_can_submit(p_material_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.hbl_materials material
    join public.hbl_subjects subject on subject.id = material.subject_id
    join public.hbl_programs program on program.id = subject.program_id
    join public.hbl_program_students enrollment on enrollment.program_id = program.id and enrollment.student_id = p_student_id
    where material.id = p_material_id
      and material.is_published
      and coalesce(material.release_at, '-infinity'::timestamptz) <= now()
      and (material.meeting_id is null or public.hbl_parent_can_access_meeting(material.meeting_id))
      and program.status = 'published'
      and public.hbl_parent_can_access_student(p_student_id)
  );
$$;

alter table public.hbl_learning_weeks enable row level security;
alter table public.hbl_activities enable row level security;
alter table public.hbl_live_sessions enable row level security;
alter table public.hbl_live_attendances enable row level security;
alter table public.hbl_activity_submissions enable row level security;
alter table public.hbl_parent_checkins enable row level security;
alter table public.hbl_student_observations enable row level security;
alter table public.hbl_portfolio_items enable row level security;

drop policy if exists "HBL managers manage learning weeks" on public.hbl_learning_weeks;
create policy "HBL managers manage learning weeks" on public.hbl_learning_weeks for all to authenticated
using (public.hbl_can_manage_program(program_id)) with check (public.hbl_can_manage_program(program_id));
drop policy if exists "Parents read released learning weeks" on public.hbl_learning_weeks;
create policy "Parents read released learning weeks" on public.hbl_learning_weeks for select to authenticated
using (public.hbl_parent_can_access_week(id));

drop policy if exists "Parents read released HBL meetings" on public.hbl_meetings;
create policy "Parents read released HBL meetings" on public.hbl_meetings for select to authenticated
using (public.hbl_parent_can_access_meeting(id));
drop policy if exists "Parents read published HBL meetings" on public.hbl_meetings;

drop policy if exists "Parents read published HBL materials" on public.hbl_materials;
drop policy if exists "Parents read released HBL materials" on public.hbl_materials;
create policy "Parents read released HBL materials" on public.hbl_materials for select to authenticated
using (
  is_published
  and coalesce(release_at, '-infinity'::timestamptz) <= now()
  and public.hbl_parent_can_access_program((select subject.program_id from public.hbl_subjects subject where subject.id = hbl_materials.subject_id))
  and (meeting_id is null or public.hbl_parent_can_access_meeting(meeting_id))
);

drop policy if exists "HBL managers manage activities" on public.hbl_activities;
create policy "HBL managers manage activities" on public.hbl_activities for all to authenticated
using (public.hbl_can_manage_program((select program_id from public.hbl_meetings where id = meeting_id)))
with check (public.hbl_can_manage_program((select program_id from public.hbl_meetings where id = meeting_id)));
drop policy if exists "Parents read released activities" on public.hbl_activities;
create policy "Parents read released activities" on public.hbl_activities for select to authenticated
using (public.hbl_parent_can_access_activity(id));

drop policy if exists "HBL managers manage live sessions" on public.hbl_live_sessions;
create policy "HBL managers manage live sessions" on public.hbl_live_sessions for all to authenticated
using (public.hbl_can_manage_program((select program_id from public.hbl_meetings where id = meeting_id)))
with check (public.hbl_can_manage_program((select program_id from public.hbl_meetings where id = meeting_id)));
drop policy if exists "Parents read released live sessions" on public.hbl_live_sessions;
create policy "Parents read released live sessions" on public.hbl_live_sessions for select to authenticated
using (public.hbl_parent_can_access_meeting(meeting_id));

drop policy if exists "HBL managers manage live attendance" on public.hbl_live_attendances;
create policy "HBL managers manage live attendance" on public.hbl_live_attendances for all to authenticated
using (public.hbl_can_manage_program((select meeting.program_id from public.hbl_live_sessions live join public.hbl_meetings meeting on meeting.id = live.meeting_id where live.id = live_session_id)))
with check (public.hbl_can_manage_program((select meeting.program_id from public.hbl_live_sessions live join public.hbl_meetings meeting on meeting.id = live.meeting_id where live.id = live_session_id)));
drop policy if exists "Parents read own live attendance" on public.hbl_live_attendances;
create policy "Parents read own live attendance" on public.hbl_live_attendances for select to authenticated
using (public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_meeting((select meeting_id from public.hbl_live_sessions where id = live_session_id)));

drop policy if exists "HBL managers manage activity submissions" on public.hbl_activity_submissions;
create policy "HBL managers manage activity submissions" on public.hbl_activity_submissions for all to authenticated
using (public.hbl_can_manage_program((select meeting.program_id from public.hbl_activities activity join public.hbl_meetings meeting on meeting.id = activity.meeting_id where activity.id = activity_id)))
with check (public.hbl_can_manage_program((select meeting.program_id from public.hbl_activities activity join public.hbl_meetings meeting on meeting.id = activity.meeting_id where activity.id = activity_id)));
drop policy if exists "Parents manage own activity submissions" on public.hbl_activity_submissions;
create policy "Parents manage own activity submissions" on public.hbl_activity_submissions for all to authenticated
using (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_activity(activity_id))
with check (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_activity(activity_id));

drop policy if exists "HBL managers manage parent checkins" on public.hbl_parent_checkins;
create policy "HBL managers manage parent checkins" on public.hbl_parent_checkins for all to authenticated
using (public.hbl_can_manage_program((select program_id from public.hbl_learning_weeks where id = week_id)))
with check (public.hbl_can_manage_program((select program_id from public.hbl_learning_weeks where id = week_id)));
drop policy if exists "Parents manage own weekly checkins" on public.hbl_parent_checkins;
create policy "Parents manage own weekly checkins" on public.hbl_parent_checkins for all to authenticated
using (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_week(week_id))
with check (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_week(week_id));

drop policy if exists "HBL managers manage observations" on public.hbl_student_observations;
create policy "HBL managers manage observations" on public.hbl_student_observations for all to authenticated
using (public.hbl_can_manage_program(program_id)) with check (public.hbl_can_manage_program(program_id));
drop policy if exists "Parents read visible observations" on public.hbl_student_observations;
create policy "Parents read visible observations" on public.hbl_student_observations for select to authenticated
using (is_visible_to_parent and public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_program(program_id));

drop policy if exists "HBL managers manage portfolio" on public.hbl_portfolio_items;
create policy "HBL managers manage portfolio" on public.hbl_portfolio_items for all to authenticated
using (public.hbl_can_manage_program(program_id)) with check (public.hbl_can_manage_program(program_id));
drop policy if exists "Parents read published portfolio" on public.hbl_portfolio_items;
create policy "Parents read published portfolio" on public.hbl_portfolio_items for select to authenticated
using (is_published and public.hbl_parent_can_access_student(student_id) and public.hbl_parent_can_access_program(program_id));

grant select, insert, update, delete on public.hbl_learning_weeks, public.hbl_activities, public.hbl_live_sessions,
  public.hbl_live_attendances, public.hbl_activity_submissions, public.hbl_parent_checkins,
  public.hbl_student_observations, public.hbl_portfolio_items to authenticated;
grant execute on function public.hbl_parent_can_access_week(uuid), public.hbl_parent_can_access_activity(uuid) to authenticated;

comment on table public.hbl_learning_weeks is 'Weekly learning journey, parent guide, and release controls for HBL.';
comment on table public.hbl_activities is 'Optional evidence-based preschool learning activities inside an HBL meeting.';
comment on table public.hbl_parent_checkins is 'One parent reflection/check-in per student each learning week.';
