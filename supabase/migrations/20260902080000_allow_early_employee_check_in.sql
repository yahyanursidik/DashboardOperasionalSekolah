-- The check-in opening time is a guidance value. Employees who arrive before
-- their schedule starts must be able to check in; only the final cutoff blocks
-- a self-service check-in. This replaces the production function that still
-- rejected both early and late arrivals.

create or replace function public.record_employee_attendance(
  p_action text,
  p_site_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null,
  p_device_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_record public.employee_attendance%rowtype;
  v_site public.attendance_sites%rowtype;
  v_rule record;
  v_now timestamptz := clock_timestamp();
  v_local_ts timestamp;
  v_work_date date;
  v_local_time time;
  v_day_name text;
  v_distance double precision;
  v_start_time time;
  v_end_time time;
  v_scheduled_start timestamp;
  v_scheduled_end timestamp;
  v_open_ts timestamp;
  v_close_ts timestamp;
  v_late_minutes integer := 0;
  v_early_minutes integer := 0;
  v_site_valid boolean := false;
begin
  if p_action not in ('check_in', 'check_out') then raise exception 'ATTENDANCE_ACTION_INVALID'; end if;
  if p_latitude is not null and not (p_latitude between -90 and 90) then raise exception 'LOCATION_INVALID'; end if;
  if p_longitude is not null and not (p_longitude between -180 and 180) then raise exception 'LOCATION_INVALID'; end if;
  if pg_column_size(coalesce(p_device_context, '{}'::jsonb)) > 4096 then raise exception 'DEVICE_CONTEXT_TOO_LARGE'; end if;

  select * into v_employee
  from public.employees
  where user_id = auth.uid() and status = 'active'
  limit 1;
  if v_employee.id is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;

  v_local_ts := v_now at time zone 'Asia/Jakarta';
  v_work_date := v_local_ts::date;
  v_local_time := v_local_ts::time;

  if p_action = 'check_out' then
    select * into v_record
    from public.employee_attendance
    where employee_id = v_employee.id
      and date between v_work_date - 1 and v_work_date
      and time_in is not null and time_out is null
    order by date desc, created_at desc
    limit 1;
    if v_record.id is null then raise exception 'CHECK_IN_REQUIRED'; end if;
    v_work_date := v_record.date;
  else
    select * into v_record
    from public.employee_attendance
    where employee_id = v_employee.id and date = v_work_date;
    if v_record.time_in is not null then raise exception 'ALREADY_CHECKED_IN'; end if;
  end if;

  select * into v_rule
  from public.resolve_employee_attendance_rule(v_employee.id, v_work_date);
  v_day_name := (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from v_work_date)::integer + 1];

  if p_site_id is not null then
    select * into v_site from public.attendance_sites where id = p_site_id and is_active;
    if v_site.id is null then raise exception 'ATTENDANCE_SITE_INVALID'; end if;
    select (
      not exists (select 1 from public.attendance_site_units su where su.site_id = v_site.id)
      or exists (
        select 1
        from public.attendance_site_units su
        where su.site_id = v_site.id
          and (
            su.unit_id = v_rule.unit_id
            or su.unit_id = v_employee.unit_id
            or exists (
              select 1
              from public.employee_schedules valid_schedule
              where valid_schedule.employee_id = v_employee.id
                and valid_schedule.day_of_week = v_day_name
                and valid_schedule.unit_id = su.unit_id
            )
          )
      )
    ) into v_site_valid;
    if not v_site_valid then raise exception 'ATTENDANCE_SITE_NOT_ASSIGNED'; end if;
  end if;

  if v_rule.require_geofence then
    if v_site.id is null then raise exception 'ATTENDANCE_SITE_REQUIRED'; end if;
    if p_latitude is null or p_longitude is null or p_accuracy_meters is null then raise exception 'LOCATION_REQUIRED'; end if;
    if p_accuracy_meters > least(v_rule.max_accuracy_meters, v_site.accuracy_limit_meters) then raise exception 'LOCATION_ACCURACY_LOW:%', round(p_accuracy_meters); end if;
    v_distance := public.attendance_distance_meters(p_latitude, p_longitude, v_site.latitude, v_site.longitude);
    if v_distance > v_site.radius_meters then raise exception 'OUTSIDE_GEOFENCE:%:%', round(v_distance), v_site.radius_meters; end if;
  end if;

  v_start_time := coalesce(v_record.expected_start_time, v_rule.start_time);
  v_end_time := coalesce(v_record.expected_end_time, v_rule.end_time);
  v_scheduled_start := v_work_date + v_start_time;
  v_scheduled_end := v_work_date + v_end_time;
  if v_end_time < v_start_time then v_scheduled_end := v_scheduled_end + interval '1 day'; end if;

  v_open_ts := v_work_date + v_rule.check_in_open;
  if v_rule.check_in_open > v_start_time then v_open_ts := v_open_ts - interval '1 day'; end if;
  v_close_ts := v_work_date + v_rule.check_in_close;
  if v_close_ts < v_open_ts then v_close_ts := v_close_ts + interval '1 day'; end if;

  -- Early arrival is valid. The server clock in WIB is authoritative and only
  -- the configured final cutoff may reject a check-in.
  if p_action = 'check_in' and v_local_ts > v_close_ts then
    raise exception 'OUTSIDE_CHECK_IN_WINDOW:%:%', v_rule.check_in_open, v_rule.check_in_close;
  end if;

  if p_action = 'check_in' then
    v_late_minutes := greatest(0, floor(extract(epoch from (v_local_ts - v_scheduled_start)) / 60)::integer - v_rule.grace_minutes);
    insert into public.employee_attendance (
      employee_id, date, unit_id, schedule_id, attendance_shift_id, attendance_policy_id,
      attendance_rule_source, expected_start_time, expected_end_time,
      applied_grace_minutes, applied_early_departure_tolerance_minutes,
      site_id, status, time_in, check_in_at,
      check_in_latitude, check_in_longitude, check_in_accuracy_meters, check_in_distance_meters,
      check_in_method, location_status, verification_status, is_late, late_minutes, device_context, notes
    ) values (
      v_employee.id, v_work_date, v_rule.unit_id, v_rule.schedule_id, v_rule.shift_id, v_rule.policy_id,
      v_rule.rule_source, v_start_time, v_end_time,
      v_rule.grace_minutes, v_rule.early_departure_tolerance_minutes,
      v_site.id, case when v_late_minutes > 0 then 'late' else 'present' end,
      v_local_time, v_now, p_latitude, p_longitude, p_accuracy_meters, v_distance,
      case when v_rule.require_geofence then 'geofence' else 'portal' end,
      case when v_rule.require_geofence then 'inside' else 'not_required' end,
      case when v_rule.require_geofence then 'verified' else 'unverified' end,
      v_late_minutes > 0, v_late_minutes, coalesce(p_device_context, '{}'::jsonb),
      'Absensi mandiri melalui portal pegawai.'
    )
    on conflict (employee_id, date) do update set
      unit_id = excluded.unit_id, schedule_id = excluded.schedule_id,
      attendance_shift_id = excluded.attendance_shift_id,
      attendance_policy_id = excluded.attendance_policy_id,
      attendance_rule_source = excluded.attendance_rule_source,
      expected_start_time = excluded.expected_start_time,
      expected_end_time = excluded.expected_end_time,
      applied_grace_minutes = excluded.applied_grace_minutes,
      applied_early_departure_tolerance_minutes = excluded.applied_early_departure_tolerance_minutes,
      site_id = excluded.site_id, status = excluded.status,
      time_in = excluded.time_in, check_in_at = excluded.check_in_at,
      check_in_latitude = excluded.check_in_latitude, check_in_longitude = excluded.check_in_longitude,
      check_in_accuracy_meters = excluded.check_in_accuracy_meters,
      check_in_distance_meters = excluded.check_in_distance_meters,
      check_in_method = excluded.check_in_method, location_status = excluded.location_status,
      verification_status = excluded.verification_status, is_late = excluded.is_late,
      late_minutes = excluded.late_minutes, device_context = excluded.device_context,
      notes = excluded.notes, updated_at = now()
    returning * into v_record;
  else
    v_early_minutes := greatest(0, floor(extract(epoch from (v_scheduled_end - v_local_ts)) / 60)::integer - coalesce(v_record.applied_early_departure_tolerance_minutes, v_rule.early_departure_tolerance_minutes, 0));
    update public.employee_attendance set
      site_id = coalesce(v_site.id, site_id), time_out = v_local_time, check_out_at = v_now,
      check_out_latitude = p_latitude, check_out_longitude = p_longitude,
      check_out_accuracy_meters = p_accuracy_meters, check_out_distance_meters = v_distance,
      check_out_method = case when v_rule.require_geofence then 'geofence' else 'portal' end,
      location_status = case when v_rule.require_geofence then 'inside' else location_status end,
      verification_status = case when v_rule.require_geofence then 'verified' else verification_status end,
      is_early_departure = v_early_minutes > 0, early_departure_minutes = v_early_minutes,
      device_context = coalesce(device_context, '{}'::jsonb) || coalesce(p_device_context, '{}'::jsonb),
      updated_at = now()
    where id = v_record.id returning * into v_record;
  end if;

  return jsonb_build_object(
    'id', v_record.id, 'date', v_record.date, 'status', v_record.status,
    'time_in', v_record.time_in, 'time_out', v_record.time_out,
    'verification_status', v_record.verification_status,
    'location_status', v_record.location_status,
    'late_minutes', v_record.late_minutes,
    'early_departure_minutes', v_record.early_departure_minutes,
    'site_name', v_site.name,
    'unit_id', v_record.unit_id,
    'rule_source', v_record.attendance_rule_source,
    'expected_start_time', v_record.expected_start_time,
    'expected_end_time', v_record.expected_end_time
  );
end;
$$;

comment on function public.record_employee_attendance(text, uuid, double precision, double precision, double precision, jsonb) is
  'Records employee attendance using server time in Asia/Jakarta. Early check-in is accepted; only the final cutoff blocks check-in.';
