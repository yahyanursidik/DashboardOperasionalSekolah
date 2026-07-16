-- Part-time teacher attendance follows the active teaching timetable.
-- Employment relationship, lifecycle status, and attendance pattern are separate concepts.

alter table public.employees
  add column if not exists employment_type text not null default 'permanent',
  add column if not exists attendance_mode text not null default 'unit_hours',
  add column if not exists attendance_lead_minutes integer not null default 30,
  add column if not exists attendance_close_minutes integer not null default 120;

alter table public.tahfidz_halaqohs
  add column if not exists schedule_start_time time,
  add column if not exists schedule_end_time time;

alter table public.employee_schedules
  add column if not exists halaqoh_id uuid references public.tahfidz_halaqohs(id) on delete cascade;

do $$ begin
  alter table public.employees add constraint employees_employment_type_check
    check (employment_type in ('permanent', 'contract', 'part_time', 'volunteer'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_attendance_mode_check
    check (attendance_mode in ('unit_hours', 'teaching_schedule'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_teaching_attendance_role_check
    check (
      attendance_mode <> 'teaching_schedule'
      or position in (
        'kepala_sekolah', 'wakasek_umum', 'wakasek_kurikulum',
        'wakasek_kesiswaan', 'kepala_unit', 'guru', 'guru_quran', 'bk'
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_attendance_lead_minutes_check
    check (attendance_lead_minutes between 0 and 240);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_attendance_close_minutes_check
    check (attendance_close_minutes between 15 and 480);
exception when duplicate_object then null; end $$;

-- Older forms stored the contract relationship in the lifecycle status.
update public.employees
set employment_type = 'contract', status = 'active'
where status = 'contract';

update public.employees
set employment_type = 'part_time',
  attendance_mode = case
    when position in (
      'kepala_sekolah', 'wakasek_umum', 'wakasek_kurikulum',
      'wakasek_kesiswaan', 'kepala_unit', 'guru', 'guru_quran', 'bk'
    ) then 'teaching_schedule'
    else 'unit_hours'
  end,
  status = 'active'
where status = 'part_time';

alter table public.employee_attendance
  drop constraint if exists employee_attendance_rule_source_check;
alter table public.employee_attendance
  add constraint employee_attendance_rule_source_check
  check (attendance_rule_source is null or attendance_rule_source in (
    'assigned_shift', 'teaching_schedule', 'no_schedule',
    'unit_policy', 'global_policy', 'system_default', 'manual'
  ));

create index if not exists employees_attendance_mode_status_idx
  on public.employees(attendance_mode, status, unit_id);

create unique index if not exists employee_schedules_halaqoh_unique
  on public.employee_schedules(halaqoh_id)
  where halaqoh_id is not null;

-- Preserve existing halaqoh schedules written as "07:30 - 08:15".
update public.tahfidz_halaqohs
set schedule_start_time = substring(schedule_time from '([0-2]?[0-9]:[0-5][0-9])')::time,
  schedule_end_time = substring(schedule_time from '[0-2]?[0-9]:[0-5][0-9][[:space:]]*-[[:space:]]*([0-2]?[0-9]:[0-5][0-9])')::time
where schedule_time ~ '^[[:space:]]*[0-2]?[0-9]:[0-5][0-9][[:space:]]*-[[:space:]]*[0-2]?[0-9]:[0-5][0-9][[:space:]]*$'
  and (schedule_start_time is null or schedule_end_time is null);

do $$ begin
  alter table public.tahfidz_halaqohs add constraint tahfidz_halaqoh_schedule_times_check
    check (
      (schedule_start_time is null and schedule_end_time is null)
      or (schedule_start_time is not null and schedule_end_time is not null and schedule_end_time > schedule_start_time)
    );
exception when duplicate_object then null; end $$;

create or replace function public.sync_halaqoh_employee_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.employee_schedules where halaqoh_id = old.id;
    return old;
  end if;

  if new.employee_id is null
    or new.schedule_day is null
    or new.schedule_start_time is null
    or new.schedule_end_time is null then
    delete from public.employee_schedules where halaqoh_id = new.id;
    return new;
  end if;

  select employee.unit_id into v_unit_id
  from public.employees employee
  where employee.id = new.employee_id;

  insert into public.employee_schedules (
    employee_id, day_of_week, start_time, end_time, schedule_type,
    subject, academic_year_id, semester_id, unit_id, halaqoh_id
  ) values (
    new.employee_id,
    case when new.schedule_day = 'Ahad' then 'Minggu' else new.schedule_day end,
    new.schedule_start_time,
    new.schedule_end_time,
    'mengajar',
    concat('Halaqoh ', initcap(coalesce(new.program_type, 'quran')), ': ', new.name),
    new.academic_year_id,
    new.semester_id,
    v_unit_id,
    new.id
  )
  on conflict (halaqoh_id) where halaqoh_id is not null do update set
    employee_id = excluded.employee_id,
    day_of_week = excluded.day_of_week,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    schedule_type = excluded.schedule_type,
    subject = excluded.subject,
    academic_year_id = excluded.academic_year_id,
    semester_id = excluded.semester_id,
    unit_id = excluded.unit_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_halaqoh_employee_schedule on public.tahfidz_halaqohs;
create trigger sync_halaqoh_employee_schedule
  after insert or update or delete on public.tahfidz_halaqohs
  for each row execute function public.sync_halaqoh_employee_schedule();

-- Backfill the central timetable after structured times have been recovered.
update public.tahfidz_halaqohs
set updated_at = coalesce(updated_at, now())
where employee_id is not null
  and schedule_day is not null
  and schedule_start_time is not null
  and schedule_end_time is not null;

create or replace function public.resolve_employee_attendance_rule(
  p_employee_id uuid,
  p_work_date date default ((clock_timestamp() at time zone 'Asia/Jakarta')::date)
)
returns table (
  employee_id uuid,
  unit_id uuid,
  unit_name text,
  schedule_id uuid,
  shift_id uuid,
  policy_id uuid,
  rule_source text,
  rule_name text,
  start_time time,
  end_time time,
  check_in_open time,
  check_in_close time,
  grace_minutes integer,
  early_departure_tolerance_minutes integer,
  require_geofence boolean,
  allow_correction_request boolean,
  max_accuracy_meters integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_schedule public.employee_schedules%rowtype;
  v_teaching_schedule public.employee_schedules%rowtype;
  v_teaching_end time;
  v_shift public.attendance_shifts%rowtype;
  v_policy public.attendance_policies%rowtype;
  v_day_name text;
  v_unit_id uuid;
  v_unit_name text;
  v_source text;
begin
  select * into v_employee
  from public.employees employee
  where employee.id = p_employee_id and employee.status = 'active';

  if v_employee.id is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if auth.uid() is distinct from v_employee.user_id
    and coalesce(auth.role(), '') <> 'service_role'
    and not public.attendance_is_manager(v_employee.unit_id) then
    raise exception 'ATTENDANCE_ACCESS_DENIED';
  end if;

  v_day_name := (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[
    extract(dow from p_work_date)::integer + 1
  ];

  -- An assigned shift remains the highest-priority rule for every employee.
  select schedule.* into v_schedule
  from public.employee_schedules schedule
  join public.attendance_shifts shift_record
    on shift_record.id = schedule.attendance_shift_id and shift_record.is_active
  where schedule.employee_id = v_employee.id
    and schedule.day_of_week = v_day_name
    and schedule.attendance_shift_id is not null
  order by schedule.start_time asc, schedule.id
  limit 1;

  if v_schedule.id is not null then
    select * into v_shift
    from public.attendance_shifts
    where id = v_schedule.attendance_shift_id and is_active;
  elsif v_employee.attendance_mode = 'teaching_schedule' then
    select schedule.* into v_teaching_schedule
    from public.employee_schedules schedule
    where schedule.employee_id = v_employee.id
      and schedule.day_of_week = v_day_name
      and schedule.schedule_type = 'mengajar'
      and schedule.attendance_shift_id is null
      and (
        schedule.academic_year_id is null
        or exists (
          select 1 from public.academic_years year
          where year.id = schedule.academic_year_id and year.is_active
        )
      )
      and (
        schedule.semester_id is null
        or exists (
          select 1 from public.semesters semester
          where semester.id = schedule.semester_id and semester.is_active
        )
      )
    order by schedule.start_time asc, schedule.id
    limit 1;

    if v_teaching_schedule.id is not null then
      select max(schedule.end_time) into v_teaching_end
      from public.employee_schedules schedule
      where schedule.employee_id = v_employee.id
        and schedule.day_of_week = v_day_name
        and schedule.schedule_type = 'mengajar'
        and schedule.attendance_shift_id is null
        and (
          schedule.academic_year_id is null
          or exists (select 1 from public.academic_years year where year.id = schedule.academic_year_id and year.is_active)
        )
        and (
          schedule.semester_id is null
          or exists (select 1 from public.semesters semester where semester.id = schedule.semester_id and semester.is_active)
        );
    end if;
  end if;

  v_unit_id := coalesce(v_shift.unit_id, v_teaching_schedule.unit_id, v_employee.unit_id);
  select unit.name into v_unit_name from public.units unit where unit.id = v_unit_id;

  select policy.* into v_policy
  from public.attendance_policies policy
  where policy.is_active
    and (policy.unit_id = v_unit_id or policy.unit_id is null)
  order by (policy.unit_id is not null) desc
  limit 1;

  v_source := case
    when v_shift.id is not null then 'assigned_shift'
    when v_teaching_schedule.id is not null then 'teaching_schedule'
    when v_employee.attendance_mode = 'teaching_schedule' then 'no_schedule'
    when v_policy.id is not null and v_policy.unit_id is not null then 'unit_policy'
    when v_policy.id is not null then 'global_policy'
    else 'system_default'
  end;

  return query select
    v_employee.id,
    v_unit_id,
    v_unit_name,
    coalesce(v_schedule.id, v_teaching_schedule.id),
    v_shift.id,
    v_policy.id,
    v_source,
    case
      when v_shift.id is not null then v_shift.name
      when v_teaching_schedule.id is not null then 'Jadwal Mengajar Part-time'
      when v_employee.attendance_mode = 'teaching_schedule' then 'Tidak Ada Jadwal Mengajar'
      else coalesce(v_policy.name, 'Aturan Presensi Sistem')
    end,
    coalesce(v_shift.start_time, v_teaching_schedule.start_time, v_policy.default_start_time, '07:00'::time),
    coalesce(v_shift.end_time, v_teaching_end, v_policy.default_end_time, '15:00'::time),
    case
      when v_shift.id is not null then v_shift.check_in_open
      when v_teaching_schedule.id is not null then v_teaching_schedule.start_time - make_interval(mins => v_employee.attendance_lead_minutes)
      when v_employee.attendance_mode = 'teaching_schedule' then '00:00'::time
      else coalesce(v_policy.check_in_open, '05:00'::time)
    end,
    case
      when v_shift.id is not null then v_shift.check_in_close
      when v_teaching_schedule.id is not null then v_teaching_schedule.start_time + make_interval(mins => v_employee.attendance_close_minutes)
      when v_employee.attendance_mode = 'teaching_schedule' then '23:59'::time
      else coalesce(v_policy.check_in_close, '10:00'::time)
    end,
    coalesce(v_shift.grace_minutes, v_policy.grace_minutes, 10),
    coalesce(v_shift.early_departure_tolerance_minutes, v_policy.early_departure_tolerance_minutes, 0),
    coalesce(v_policy.require_geofence, false),
    coalesce(v_policy.allow_correction_request, true),
    coalesce(v_policy.max_accuracy_meters, 100);
end;
$$;

grant execute on function public.resolve_employee_attendance_rule(uuid, date) to authenticated;

-- Portal attendance is unavailable on a part-time teacher's non-teaching day.
-- Admin input and approved corrections remain possible for exceptional duties.
create or replace function public.validate_part_time_attendance_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attendance_rule_source = 'no_schedule'
    and coalesce(new.check_in_method, 'legacy') in ('portal', 'geofence')
    and new.time_in is not null then
    raise exception 'PART_TIME_NO_TEACHING_SCHEDULE';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_part_time_attendance_day on public.employee_attendance;
create trigger validate_part_time_attendance_day
  before insert or update on public.employee_attendance
  for each row execute function public.validate_part_time_attendance_day();

comment on column public.employees.attendance_mode is
  'unit_hours follows unit policy; teaching_schedule follows the first and last active teaching schedule of the day.';

comment on function public.resolve_employee_attendance_rule(uuid, date) is
  'Resolves attendance timing in order: assigned shift, active teaching timetable for part-time teachers, unit policy, global policy, system default.';
