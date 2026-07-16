create table if not exists public.employee_overtime (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  overtime_date date not null,
  planned_start_time time not null,
  planned_end_time time not null,
  check_in_close time not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 240),
  task_type text not null default 'additional_duty' check (task_type in ('additional_duty', 'meeting', 'event', 'emergency', 'replacement', 'other')),
  reason text not null check (char_length(trim(reason)) >= 10),
  request_source text not null default 'employee' check (request_source in ('employee', 'manager')),
  compensation_type text not null default 'pending' check (compensation_type in ('pending', 'paid', 'time_off', 'included', 'none')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  site_id uuid references public.attendance_sites(id) on delete set null,
  require_geofence boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  review_note text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy_meters double precision,
  check_in_distance_meters double precision,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'manual')),
  device_context jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (planned_start_time <> planned_end_time)
);

create index if not exists employee_overtime_date_idx on public.employee_overtime(overtime_date desc, status);
create index if not exists employee_overtime_employee_idx on public.employee_overtime(employee_id, overtime_date desc);
create index if not exists employee_overtime_unit_idx on public.employee_overtime(unit_id, overtime_date desc);

drop trigger if exists handle_updated_at_employee_overtime on public.employee_overtime;
create trigger handle_updated_at_employee_overtime before update on public.employee_overtime
  for each row execute procedure public.handle_updated_at();

create or replace function public.validate_employee_overtime_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule record;
  v_overtime_start timestamp;
  v_overtime_end timestamp;
  v_duty_start timestamp;
  v_duty_end timestamp;
begin
  if new.status not in ('approved', 'completed') then return new; end if;
  v_overtime_start := new.overtime_date + new.planned_start_time;
  v_overtime_end := new.overtime_date + new.planned_end_time;
  if new.planned_end_time < new.planned_start_time then v_overtime_end := v_overtime_end + interval '1 day'; end if;

  select * into v_rule from public.resolve_employee_attendance_rule(new.employee_id, new.overtime_date);
  if v_rule.rule_source <> 'no_schedule' then
    v_duty_start := new.overtime_date + v_rule.start_time;
    v_duty_end := new.overtime_date + v_rule.end_time;
    if v_rule.end_time < v_rule.start_time then v_duty_end := v_duty_end + interval '1 day'; end if;
    if tsrange(v_overtime_start, v_overtime_end, '[)') && tsrange(v_duty_start, v_duty_end, '[)') then
      raise exception 'OVERTIME_OVERLAPS_REGULAR_DUTY:%:%', v_rule.rule_name, v_rule.rule_source;
    end if;
  end if;

  if exists (
    select 1 from public.employee_overtime existing
    where existing.employee_id = new.employee_id
      and existing.id <> new.id
      and existing.status in ('approved', 'completed')
      and tsrange(
        existing.overtime_date + existing.planned_start_time,
        existing.overtime_date + existing.planned_end_time
          + case when existing.planned_end_time < existing.planned_start_time then interval '1 day' else interval '0 day' end,
        '[)'
      ) && tsrange(v_overtime_start, v_overtime_end, '[)')
  ) then
    raise exception 'OVERTIME_SCHEDULE_CONFLICT';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_employee_overtime_schedule_trigger on public.employee_overtime;
create trigger validate_employee_overtime_schedule_trigger
  before insert or update of status, overtime_date, planned_start_time, planned_end_time on public.employee_overtime
  for each row execute function public.validate_employee_overtime_schedule();

create or replace function public.review_employee_overtime(
  p_overtime_id uuid,
  p_status text,
  p_compensation_type text default 'pending',
  p_review_note text default null
)
returns public.employee_overtime
language plpgsql
security definer
set search_path = public
as $$
declare
  v_overtime public.employee_overtime%rowtype;
begin
  if p_status not in ('approved', 'rejected', 'cancelled') then raise exception 'OVERTIME_REVIEW_STATUS_INVALID'; end if;
  if p_compensation_type not in ('pending', 'paid', 'time_off', 'included', 'none') then raise exception 'OVERTIME_COMPENSATION_INVALID'; end if;
  select * into v_overtime from public.employee_overtime where id = p_overtime_id;
  if v_overtime.id is null then raise exception 'OVERTIME_NOT_FOUND'; end if;
  if not public.attendance_is_manager(v_overtime.unit_id) then raise exception 'ATTENDANCE_ACCESS_DENIED'; end if;
  if v_overtime.status = 'completed' then raise exception 'OVERTIME_ALREADY_COMPLETED'; end if;

  update public.employee_overtime set
    status = p_status,
    compensation_type = case when p_status = 'approved' then p_compensation_type else compensation_type end,
    review_note = nullif(trim(p_review_note), ''),
    approved_by = auth.uid(),
    approved_at = now()
  where id = p_overtime_id
  returning * into v_overtime;
  return v_overtime;
end;
$$;

create or replace function public.record_employee_overtime(
  p_overtime_id uuid,
  p_action text,
  p_site_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null,
  p_device_context jsonb default '{}'::jsonb
)
returns public.employee_overtime
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_overtime public.employee_overtime%rowtype;
  v_site public.attendance_sites%rowtype;
  v_now timestamptz := now();
  v_local_ts timestamp := now() at time zone 'Asia/Jakarta';
  v_close_ts timestamp;
  v_planned_start_at timestamptz;
  v_effective_start_at timestamptz;
  v_distance double precision;
  v_minutes integer;
begin
  if p_action not in ('check_in', 'check_out') then raise exception 'OVERTIME_ACTION_INVALID'; end if;
  select * into v_employee from public.employees where user_id = auth.uid() and status = 'active' limit 1;
  if v_employee.id is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  select * into v_overtime from public.employee_overtime where id = p_overtime_id and employee_id = v_employee.id;
  if v_overtime.id is null then raise exception 'OVERTIME_NOT_ASSIGNED'; end if;
  if v_overtime.status <> 'approved' then raise exception 'OVERTIME_NOT_APPROVED'; end if;

  v_close_ts := v_overtime.overtime_date + v_overtime.check_in_close;
  if v_overtime.check_in_close < v_overtime.planned_start_time then v_close_ts := v_close_ts + interval '1 day'; end if;
  if v_local_ts::date <> v_overtime.overtime_date
    and not (v_overtime.planned_end_time < v_overtime.planned_start_time and v_local_ts::date = v_overtime.overtime_date + 1) then
    raise exception 'OVERTIME_NOT_TODAY';
  end if;

  if p_action = 'check_in' then
    if v_overtime.check_in_at is not null then raise exception 'OVERTIME_ALREADY_CHECKED_IN'; end if;
    -- Early arrival on the approved overtime date remains valid.
    if v_local_ts > v_close_ts then raise exception 'OVERTIME_CHECK_IN_CLOSED'; end if;
    if v_overtime.require_geofence then
      if v_overtime.site_id is null then raise exception 'OVERTIME_SITE_NOT_CONFIGURED'; end if;
      if p_site_id is distinct from v_overtime.site_id then raise exception 'OVERTIME_SITE_INVALID'; end if;
      if p_latitude is null or p_longitude is null or p_accuracy_meters is null then raise exception 'LOCATION_REQUIRED'; end if;
      select * into v_site from public.attendance_sites where id = v_overtime.site_id and is_active;
      if v_site.id is null then raise exception 'OVERTIME_SITE_INVALID'; end if;
      if p_accuracy_meters > v_site.accuracy_limit_meters then raise exception 'LOCATION_ACCURACY_LOW:%', round(p_accuracy_meters); end if;
      v_distance := public.attendance_distance_meters(p_latitude, p_longitude, v_site.latitude, v_site.longitude);
      if v_distance > v_site.radius_meters then raise exception 'OUTSIDE_GEOFENCE:%:%', round(v_distance), v_site.radius_meters; end if;
    end if;
    update public.employee_overtime set
      check_in_at = v_now, site_id = coalesce(site_id, p_site_id),
      check_in_latitude = p_latitude, check_in_longitude = p_longitude,
      check_in_accuracy_meters = p_accuracy_meters, check_in_distance_meters = v_distance,
      verification_status = case when require_geofence then 'verified' else 'unverified' end,
      device_context = coalesce(p_device_context, '{}'::jsonb)
    where id = v_overtime.id returning * into v_overtime;
  else
    if v_overtime.check_in_at is null then raise exception 'OVERTIME_CHECK_IN_REQUIRED'; end if;
    if v_overtime.check_out_at is not null then raise exception 'OVERTIME_ALREADY_CHECKED_OUT'; end if;
    v_planned_start_at := (v_overtime.overtime_date + v_overtime.planned_start_time) at time zone 'Asia/Jakarta';
    v_effective_start_at := greatest(v_overtime.check_in_at, v_planned_start_at);
    v_minutes := greatest(0, floor(extract(epoch from (v_now - v_effective_start_at)) / 60)::integer - v_overtime.break_minutes);
    if v_minutes > 960 then raise exception 'OVERTIME_DURATION_REVIEW_REQUIRED'; end if;
    update public.employee_overtime set check_out_at = v_now, actual_minutes = v_minutes, status = 'completed'
    where id = v_overtime.id returning * into v_overtime;
  end if;
  return v_overtime;
end;
$$;

create or replace function public.cancel_employee_overtime_request(p_overtime_id uuid)
returns public.employee_overtime
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_overtime public.employee_overtime%rowtype;
begin
  select id into v_employee_id from public.employees where user_id = auth.uid() and status = 'active' limit 1;
  update public.employee_overtime set status = 'cancelled'
  where id = p_overtime_id and employee_id = v_employee_id and status = 'pending'
  returning * into v_overtime;
  if v_overtime.id is null then raise exception 'OVERTIME_CANNOT_CANCEL'; end if;
  return v_overtime;
end;
$$;

alter table public.employee_overtime enable row level security;

create or replace function public.overtime_finance_can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auth_user_roles() role_scope
    where role_scope.role_name in ('super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepala_tu')
      and (
        role_scope.role_name in ('super_admin', 'ketua_yayasan')
        or role_scope.unit_id is null
        or role_scope.unit_id = target_unit_id
      )
  ) or exists (
    select 1
    from public.employees employee
    where employee.user_id = auth.uid()
      and employee.status = 'active'
      and employee.position = 'bendahara'
      and (employee.unit_id is null or employee.unit_id = target_unit_id)
  );
$$;

drop policy if exists "Attendance managers manage overtime" on public.employee_overtime;
create policy "Attendance managers manage overtime" on public.employee_overtime for all to authenticated
  using (public.attendance_is_manager(unit_id)) with check (public.attendance_is_manager(unit_id));
drop policy if exists "Employees view own overtime" on public.employee_overtime;
create policy "Employees view own overtime" on public.employee_overtime for select to authenticated
  using (exists (select 1 from public.employees employee where employee.id = employee_id and employee.user_id = auth.uid()));
drop policy if exists "Employees request own overtime" on public.employee_overtime;
create policy "Employees request own overtime" on public.employee_overtime for insert to authenticated
  with check (
    status = 'pending' and request_source = 'employee'
    and compensation_type = 'pending' and approved_by is null and approved_at is null
    and check_in_at is null and check_out_at is null and actual_minutes = 0
    and overtime_date >= (now() at time zone 'Asia/Jakarta')::date
    and exists (select 1 from public.employees employee where employee.id = employee_id and employee.user_id = auth.uid() and employee.status = 'active')
  );
drop policy if exists "Finance views completed overtime" on public.employee_overtime;
create policy "Finance views completed overtime" on public.employee_overtime for select to authenticated
  using (status = 'completed' and public.overtime_finance_can_access_unit(unit_id));

revoke all on function public.overtime_finance_can_access_unit(uuid) from public;
grant execute on function public.overtime_finance_can_access_unit(uuid) to authenticated;
revoke all on function public.review_employee_overtime(uuid, text, text, text) from public;
revoke all on function public.record_employee_overtime(uuid, text, uuid, double precision, double precision, double precision, jsonb) from public;
revoke all on function public.cancel_employee_overtime_request(uuid) from public;
grant execute on function public.review_employee_overtime(uuid, text, text, text) to authenticated;
grant execute on function public.record_employee_overtime(uuid, text, uuid, double precision, double precision, double precision, jsonb) to authenticated;
grant execute on function public.cancel_employee_overtime_request(uuid) to authenticated;
grant select, insert, update, delete on public.employee_overtime to authenticated;
