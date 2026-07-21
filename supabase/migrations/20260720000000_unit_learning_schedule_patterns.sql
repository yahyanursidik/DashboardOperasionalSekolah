-- Extend employee schedules into a shared learning timetable without
-- breaking attendance and teacher assignment integrations.
alter table if exists public.employee_schedules
  add column if not exists schedule_scope text not null default 'class',
  add column if not exists schedule_kind text not null default 'subject',
  add column if not exists activity_name text,
  add column if not exists schedule_group_id uuid,
  add column if not exists is_synchronized boolean not null default false;

update public.employee_schedules
set schedule_kind = 'other'
where schedule_type <> 'mengajar' and schedule_kind = 'subject';

update public.employee_schedules
set schedule_scope = 'unit',
    schedule_kind = 'unit_activity',
    activity_name = coalesce(activity_name, subject, 'Kegiatan Unit')
where schedule_type = 'mengajar' and class_id is null and schedule_scope = 'class';

alter table if exists public.employee_schedules
  drop constraint if exists employee_schedules_schedule_scope_check;
alter table if exists public.employee_schedules
  add constraint employee_schedules_schedule_scope_check
  check (schedule_scope in ('class', 'unit'));

alter table if exists public.employee_schedules
  drop constraint if exists employee_schedules_schedule_kind_check;
alter table if exists public.employee_schedules
  add constraint employee_schedules_schedule_kind_check
  check (schedule_kind in (
    'subject', 'unit_activity', 'preschool_activity', 'worship',
    'assembly', 'break', 'meal', 'play', 'other'
  ));

alter table if exists public.employee_schedules
  drop constraint if exists employee_schedules_learning_scope_check;
alter table if exists public.employee_schedules
  add constraint employee_schedules_learning_scope_check
  check (
    schedule_type <> 'mengajar'
    or schedule_scope <> 'unit'
    or (unit_id is not null and activity_name is not null)
  );

create index if not exists employee_schedules_group_idx
  on public.employee_schedules(schedule_group_id)
  where schedule_group_id is not null;

create index if not exists employee_schedules_unit_learning_idx
  on public.employee_schedules(unit_id, academic_year_id, semester_id, day_of_week, start_time)
  where schedule_type = 'mengajar';

comment on column public.employee_schedules.schedule_scope is
  'Audience of a learning timetable entry: one class or every class in a unit.';
comment on column public.employee_schedules.schedule_kind is
  'Semantic learning activity used by Elementary and Preschool portals.';
comment on column public.employee_schedules.schedule_group_id is
  'Groups rows created together from one unit/class schedule pattern.';
