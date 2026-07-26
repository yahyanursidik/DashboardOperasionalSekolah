-- PAUD/TK quality management: period-aware observation, STPPA workflow, and scoped portal access.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stppa_scale') then
    create type public.stppa_scale as enum ('BB', 'MB', 'BSH', 'BSB');
  end if;
end $$;

create table if not exists public.paud_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  date date not null default current_date,
  title text not null,
  description text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paud_stppa_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  academic_year_id uuid references public.academic_years(id) on delete restrict,
  semester_id uuid references public.semesters(id) on delete restrict,
  period_name text not null,
  date date not null default current_date,
  agama_moral_scale public.stppa_scale,
  agama_moral_desc text,
  fisik_motorik_scale public.stppa_scale,
  fisik_motorik_desc text,
  kognitif_scale public.stppa_scale,
  kognitif_desc text,
  bahasa_scale public.stppa_scale,
  bahasa_desc text,
  sosial_emosional_scale public.stppa_scale,
  sosial_emosional_desc text,
  seni_scale public.stppa_scale,
  seni_desc text,
  growth_weight numeric,
  growth_height numeric,
  growth_head numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.paud_activities
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists academic_year_id uuid references public.academic_years(id) on delete restrict,
  add column if not exists semester_id uuid references public.semesters(id) on delete restrict,
  add column if not exists observation_method text not null default 'photo',
  add column if not exists development_aspects text[] not null default '{}',
  add column if not exists islamic_values text[] not null default '{}',
  add column if not exists follow_up text,
  add column if not exists status text not null default 'published',
  add column if not exists is_parent_visible boolean not null default true;

alter table public.paud_stppa_assessments
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists strengths text,
  add column if not exists follow_up text,
  add column if not exists parent_partnership text,
  add column if not exists status text not null default 'published',
  add column if not exists is_parent_visible boolean not null default true;

update public.paud_activities set status = 'published' where status is null;
update public.paud_activities set is_parent_visible = true where is_parent_visible is null;
update public.paud_stppa_assessments set status = 'published' where status is null;
update public.paud_stppa_assessments set is_parent_visible = true where is_parent_visible is null;

alter table public.paud_activities alter column status set default 'published';
alter table public.paud_activities alter column status set not null;
alter table public.paud_activities alter column is_parent_visible set default true;
alter table public.paud_activities alter column is_parent_visible set not null;
alter table public.paud_stppa_assessments alter column status set default 'published';
alter table public.paud_stppa_assessments alter column status set not null;
alter table public.paud_stppa_assessments alter column is_parent_visible set default true;
alter table public.paud_stppa_assessments alter column is_parent_visible set not null;

update public.paud_activities activity
set class_id = student.class_id
from public.students student
where activity.student_id = student.id and activity.class_id is null;

update public.paud_activities activity
set academic_year_id = class.academic_year_id
from public.classes class
where activity.class_id = class.id and activity.academic_year_id is null;

update public.paud_stppa_assessments assessment
set class_id = student.class_id
from public.students student
where assessment.student_id = student.id and assessment.class_id is null;

alter table public.paud_activities drop constraint if exists paud_activities_observation_method_check;
alter table public.paud_activities add constraint paud_activities_observation_method_check
  check (observation_method in ('anecdotal', 'photo', 'work_sample', 'checklist'));
alter table public.paud_activities drop constraint if exists paud_activities_status_check;
alter table public.paud_activities add constraint paud_activities_status_check
  check (status in ('draft', 'published'));
alter table public.paud_stppa_assessments drop constraint if exists paud_stppa_assessments_status_check;
alter table public.paud_stppa_assessments add constraint paud_stppa_assessments_status_check
  check (status in ('draft', 'published'));

create index if not exists idx_paud_activities_period_class
  on public.paud_activities (academic_year_id, semester_id, class_id, date desc);
create index if not exists idx_paud_activities_student_date
  on public.paud_activities (student_id, date desc);
create index if not exists idx_paud_stppa_period_class
  on public.paud_stppa_assessments (academic_year_id, semester_id, class_id, date desc);
create index if not exists idx_paud_stppa_student_date
  on public.paud_stppa_assessments (student_id, date desc);

alter table public.paud_activities enable row level security;
alter table public.paud_stppa_assessments enable row level security;

drop policy if exists "Admin full access for paud_activities" on public.paud_activities;
drop policy if exists "Teachers access for paud_activities" on public.paud_activities;
drop policy if exists "Parents can view their children paud_activities" on public.paud_activities;
drop policy if exists "PAUD managers manage activities" on public.paud_activities;
drop policy if exists "PAUD teachers manage assigned activities" on public.paud_activities;
drop policy if exists "Parents view published PAUD activities" on public.paud_activities;

create policy "PAUD managers manage activities"
on public.paud_activities for all to authenticated
using (
  public.teacher_portal_is_manager((
    select student.unit_id from public.students student where student.id = student_id
  ))
)
with check (
  public.teacher_portal_is_manager((
    select student.unit_id from public.students student where student.id = student_id
  ))
);

create policy "PAUD teachers manage assigned activities"
on public.paud_activities for all to authenticated
using (
  employee_id = public.current_employee_id()
  and public.teacher_can_access_class(coalesce(
    class_id,
    (select student.class_id from public.students student where student.id = student_id)
  ))
)
with check (
  employee_id = public.current_employee_id()
  and public.teacher_can_access_class(coalesce(
    class_id,
    (select student.class_id from public.students student where student.id = student_id)
  ))
);

create policy "Parents view published PAUD activities"
on public.paud_activities for select to authenticated
using (
  status = 'published'
  and is_parent_visible
  and exists (
    select 1
    from public.student_parent_links link
    join public.parents parent on parent.id = link.parent_id
    where link.student_id = paud_activities.student_id
      and parent.user_id = auth.uid()
      and coalesce(link.can_access_parent_portal, true)
  )
);

drop policy if exists "Admin full access for paud_stppa_assessments" on public.paud_stppa_assessments;
drop policy if exists "Teachers access for paud_stppa_assessments" on public.paud_stppa_assessments;
drop policy if exists "Parents can view their children paud_stppa_assessments" on public.paud_stppa_assessments;
drop policy if exists "PAUD managers manage assessments" on public.paud_stppa_assessments;
drop policy if exists "PAUD teachers manage assigned assessments" on public.paud_stppa_assessments;
drop policy if exists "Parents view published PAUD assessments" on public.paud_stppa_assessments;

create policy "PAUD managers manage assessments"
on public.paud_stppa_assessments for all to authenticated
using (
  public.teacher_portal_is_manager((
    select student.unit_id from public.students student where student.id = student_id
  ))
)
with check (
  public.teacher_portal_is_manager((
    select student.unit_id from public.students student where student.id = student_id
  ))
);

create policy "PAUD teachers manage assigned assessments"
on public.paud_stppa_assessments for all to authenticated
using (
  employee_id = public.current_employee_id()
  and public.teacher_can_access_class(coalesce(
    class_id,
    (select student.class_id from public.students student where student.id = student_id)
  ))
)
with check (
  employee_id = public.current_employee_id()
  and public.teacher_can_access_class(coalesce(
    class_id,
    (select student.class_id from public.students student where student.id = student_id)
  ))
);

create policy "Parents view published PAUD assessments"
on public.paud_stppa_assessments for select to authenticated
using (
  status = 'published'
  and is_parent_visible
  and exists (
    select 1
    from public.student_parent_links link
    join public.parents parent on parent.id = link.parent_id
    where link.student_id = paud_stppa_assessments.student_id
      and parent.user_id = auth.uid()
      and coalesce(link.can_access_parent_portal, true)
  )
);

grant select, insert, update, delete on public.paud_activities to authenticated;
grant select, insert, update, delete on public.paud_stppa_assessments to authenticated;

notify pgrst, 'reload schema';
