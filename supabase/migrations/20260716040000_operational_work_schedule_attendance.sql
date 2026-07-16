-- Flexible operational staff attendance follows the actual work schedule of the day.
-- Assigned attendance shifts remain the highest-priority rule.

alter table public.employees
  drop constraint if exists employees_attendance_mode_check;
alter table public.employees
  add constraint employees_attendance_mode_check
  check (attendance_mode in ('unit_hours', 'teaching_schedule', 'work_schedule'));

alter table public.employees
  drop constraint if exists employees_work_schedule_attendance_role_check;
alter table public.employees
  add constraint employees_work_schedule_attendance_role_check
  check (
    attendance_mode <> 'work_schedule'
    or position in (
      'school_center', 'bendahara', 'penanggung_jawab', 'pustakawan',
      'laboran', 'tu', 'sarpras', 'satpam', 'cleaning_service', 'lainnya'
    )
  );

alter table public.employee_attendance
  drop constraint if exists employee_attendance_rule_source_check;
alter table public.employee_attendance
  add constraint employee_attendance_rule_source_check
  check (attendance_rule_source is null or attendance_rule_source in (
    'assigned_shift', 'teaching_schedule', 'work_schedule',
    'no_schedule', 'no_work_schedule', 'unit_policy',
    'global_policy', 'system_default', 'manual'
  ));

-- Shift-based operational roles should not inherit the morning cutoff of a unit.
update public.employees
set attendance_mode = 'work_schedule', updated_at = now()
where position in ('cleaning_service', 'satpam')
  and attendance_mode = 'unit_hours';

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
  v_shift_schedule public.employee_schedules%rowtype;
  v_duty_schedule public.employee_schedules%rowtype;
  v_duty_end time;
  v_shift public.attendance_shifts%rowtype;
  v_policy public.attendance_policies%rowtype;
  v_day_name text;
  v_unit_id uuid;
  v_unit_name text;
  v_source text;
  v_rule_name text;
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

  select schedule.* into v_shift_schedule
  from public.employee_schedules schedule
  join public.attendance_shifts shift_record
    on shift_record.id = schedule.attendance_shift_id and shift_record.is_active
  where schedule.employee_id = v_employee.id
    and schedule.day_of_week = v_day_name
    and schedule.attendance_shift_id is not null
  order by schedule.start_time asc, schedule.id
  limit 1;

  if v_shift_schedule.id is not null then
    select * into v_shift
    from public.attendance_shifts
    where id = v_shift_schedule.attendance_shift_id and is_active;
  elsif v_employee.attendance_mode in ('teaching_schedule', 'work_schedule') then
    select schedule.* into v_duty_schedule
    from public.employee_schedules schedule
    where schedule.employee_id = v_employee.id
      and schedule.day_of_week = v_day_name
      and schedule.attendance_shift_id is null
      and (
        (v_employee.attendance_mode = 'teaching_schedule' and schedule.schedule_type = 'mengajar')
        or (v_employee.attendance_mode = 'work_schedule' and coalesce(schedule.schedule_type, 'standby') <> 'mengajar')
      )
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

    if v_duty_schedule.id is not null then
      select max(schedule.end_time) into v_duty_end
      from public.employee_schedules schedule
      where schedule.employee_id = v_employee.id
        and schedule.day_of_week = v_day_name
        and schedule.attendance_shift_id is null
        and (
          (v_employee.attendance_mode = 'teaching_schedule' and schedule.schedule_type = 'mengajar')
          or (v_employee.attendance_mode = 'work_schedule' and coalesce(schedule.schedule_type, 'standby') <> 'mengajar')
        )
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

  v_unit_id := coalesce(v_shift.unit_id, v_duty_schedule.unit_id, v_employee.unit_id);
  select unit.name into v_unit_name from public.units unit where unit.id = v_unit_id;

  select policy.* into v_policy
  from public.attendance_policies policy
  where policy.is_active
    and (policy.unit_id = v_unit_id or policy.unit_id is null)
  order by (policy.unit_id is not null) desc
  limit 1;

  v_source := case
    when v_shift.id is not null then 'assigned_shift'
    when v_duty_schedule.id is not null and v_employee.attendance_mode = 'teaching_schedule' then 'teaching_schedule'
    when v_duty_schedule.id is not null and v_employee.attendance_mode = 'work_schedule' then 'work_schedule'
    when v_employee.attendance_mode = 'teaching_schedule' then 'no_schedule'
    when v_employee.attendance_mode = 'work_schedule' then 'no_work_schedule'
    when v_policy.id is not null and v_policy.unit_id is not null then 'unit_policy'
    when v_policy.id is not null then 'global_policy'
    else 'system_default'
  end;

  v_rule_name := case
    when v_shift.id is not null then v_shift.name
    when v_source = 'teaching_schedule' then 'Jadwal Mengajar Part-time'
    when v_source = 'work_schedule' then case v_duty_schedule.schedule_type
      when 'shift_kebersihan' then 'Jadwal Kebersihan'
      when 'shift_keamanan' then 'Jadwal Keamanan'
      when 'piket' then 'Jadwal Piket'
      when 'standby' then 'Jadwal Standby'
      else 'Jadwal Kerja Fleksibel'
    end
    when v_source = 'no_schedule' then 'Tidak Ada Jadwal Mengajar'
    when v_source = 'no_work_schedule' then 'Tidak Ada Jadwal Kerja'
    else coalesce(v_policy.name, 'Aturan Presensi Sistem')
  end;

  return query select
    v_employee.id,
    v_unit_id,
    v_unit_name,
    coalesce(v_shift_schedule.id, v_duty_schedule.id),
    v_shift.id,
    v_policy.id,
    v_source,
    v_rule_name,
    coalesce(v_shift.start_time, v_duty_schedule.start_time, v_policy.default_start_time, '07:00'::time),
    coalesce(v_shift.end_time, v_duty_end, v_policy.default_end_time, '15:00'::time),
    case
      when v_shift.id is not null then v_shift.check_in_open
      when v_duty_schedule.id is not null then v_duty_schedule.start_time - make_interval(mins => v_employee.attendance_lead_minutes)
      when v_source in ('no_schedule', 'no_work_schedule') then '00:00'::time
      else coalesce(v_policy.check_in_open, '05:00'::time)
    end,
    case
      when v_shift.id is not null then v_shift.check_in_close
      when v_duty_schedule.id is not null then v_duty_schedule.start_time + make_interval(mins => v_employee.attendance_close_minutes)
      when v_source in ('no_schedule', 'no_work_schedule') then '23:59'::time
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

create or replace function public.validate_part_time_attendance_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attendance_rule_source in ('no_schedule', 'no_work_schedule')
    and coalesce(new.check_in_method, 'legacy') in ('portal', 'geofence')
    and new.time_in is not null then
    if new.attendance_rule_source = 'no_work_schedule' then
      raise exception 'NO_WORK_SCHEDULE';
    end if;
    raise exception 'PART_TIME_NO_TEACHING_SCHEDULE';
  end if;
  return new;
end;
$$;

comment on column public.employees.attendance_mode is
  'unit_hours follows unit policy; teaching_schedule follows active lessons; work_schedule follows active operational duties.';

comment on function public.resolve_employee_attendance_rule(uuid, date) is
  'Resolves attendance timing in order: assigned shift, active teaching/work schedule, unit policy, global policy, system default.';
