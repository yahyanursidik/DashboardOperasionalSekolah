-- Employee attendance quality upgrade: server time, multi-unit geofence, and corrections.

create table if not exists public.attendance_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_meters integer not null default 150 check (radius_meters between 25 and 2000),
  accuracy_limit_meters integer not null default 100 check (accuracy_limit_meters between 10 and 1000),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_site_units (
  site_id uuid not null references public.attendance_sites(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (site_id, unit_id)
);

create table if not exists public.attendance_policies (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete cascade,
  name text not null default 'Kebijakan Presensi',
  require_geofence boolean not null default false,
  allow_correction_request boolean not null default true,
  check_in_open time not null default '05:00',
  check_in_close time not null default '10:00',
  default_start_time time not null default '07:00',
  default_end_time time not null default '15:00',
  grace_minutes integer not null default 10 check (grace_minutes between 0 and 180),
  early_departure_tolerance_minutes integer not null default 0 check (early_departure_tolerance_minutes between 0 and 180),
  max_accuracy_meters integer not null default 100 check (max_accuracy_meters between 10 and 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists attendance_policies_unit_unique
  on public.attendance_policies(unit_id) where unit_id is not null;
create unique index if not exists attendance_policies_global_unique
  on public.attendance_policies((unit_id is null)) where unit_id is null;

alter table public.employee_attendance
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists schedule_id uuid references public.employee_schedules(id) on delete set null,
  add column if not exists site_id uuid references public.attendance_sites(id) on delete set null,
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_at timestamptz,
  add column if not exists check_in_latitude double precision,
  add column if not exists check_in_longitude double precision,
  add column if not exists check_out_latitude double precision,
  add column if not exists check_out_longitude double precision,
  add column if not exists check_in_accuracy_meters double precision,
  add column if not exists check_out_accuracy_meters double precision,
  add column if not exists check_in_distance_meters double precision,
  add column if not exists check_out_distance_meters double precision,
  add column if not exists check_in_method text not null default 'legacy',
  add column if not exists check_out_method text,
  add column if not exists location_status text not null default 'unavailable',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists is_late boolean not null default false,
  add column if not exists late_minutes integer not null default 0,
  add column if not exists is_early_departure boolean not null default false,
  add column if not exists early_departure_minutes integer not null default 0,
  add column if not exists device_context jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

do $$ begin
  alter table public.employee_attendance add constraint employee_attendance_check_in_method_check
    check (check_in_method in ('legacy', 'geofence', 'portal', 'admin', 'approved_exception'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employee_attendance add constraint employee_attendance_check_out_method_check
    check (check_out_method is null or check_out_method in ('legacy', 'geofence', 'portal', 'admin', 'approved_exception'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employee_attendance add constraint employee_attendance_location_status_check
    check (location_status in ('inside', 'outside', 'unavailable', 'not_required'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.employee_attendance add constraint employee_attendance_verification_status_check
    check (verification_status in ('verified', 'unverified', 'pending_review', 'approved_exception', 'manual', 'rejected'));
exception when duplicate_object then null; end $$;

create table if not exists public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_id uuid references public.employee_attendance(id) on delete set null,
  request_date date not null,
  attendance_action text not null check (attendance_action in ('check_in', 'check_out')),
  request_type text not null check (request_type in ('location_issue', 'missed_attendance', 'offsite_duty', 'time_correction')),
  requested_time time not null,
  reason text not null check (char_length(trim(reason)) >= 10),
  evidence_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_corrections_employee_date_idx
  on public.attendance_correction_requests(employee_id, request_date desc);
create index if not exists attendance_corrections_status_idx
  on public.attendance_correction_requests(status, created_at desc);
create unique index if not exists attendance_corrections_one_pending_action_idx
  on public.attendance_correction_requests(employee_id, request_date, attendance_action)
  where status = 'pending';
create index if not exists employee_attendance_verification_idx
  on public.employee_attendance(date desc, verification_status);

drop trigger if exists handle_updated_at_attendance_sites on public.attendance_sites;
create trigger handle_updated_at_attendance_sites before update on public.attendance_sites
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_updated_at_attendance_policies on public.attendance_policies;
create trigger handle_updated_at_attendance_policies before update on public.attendance_policies
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_updated_at_attendance_corrections on public.attendance_correction_requests;
create trigger handle_updated_at_attendance_corrections before update on public.attendance_correction_requests
  for each row execute procedure public.handle_updated_at();

create or replace function public.attendance_is_manager(target_unit_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auth_user_roles() role_scope
    where role_scope.role_name in (
      'super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu',
      'admin_tu', 'admin_sekolah', 'admin_unit', 'operator_absensi', 'hrd'
    )
      and (
        role_scope.role_name in ('super_admin', 'ketua_yayasan')
        or role_scope.unit_id is null
        or target_unit_id is null
        or role_scope.unit_id = target_unit_id
      )
  );
$$;

create or replace function public.attendance_distance_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
strict
as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

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
  v_policy public.attendance_policies%rowtype;
  v_schedule public.employee_schedules%rowtype;
  v_now timestamptz := clock_timestamp();
  v_local_ts timestamp;
  v_work_date date;
  v_local_time time;
  v_day_name text;
  v_distance double precision;
  v_require_geofence boolean := false;
  v_max_accuracy integer := 100;
  v_grace integer := 10;
  v_default_start time := '07:00';
  v_default_end time := '15:00';
  v_check_in_open time := '05:00';
  v_check_in_close time := '10:00';
  v_start_time time;
  v_end_time time;
  v_scheduled_start timestamp;
  v_scheduled_end timestamp;
  v_late_minutes integer := 0;
  v_early_minutes integer := 0;
  v_site_valid boolean := false;
begin
  if p_action not in ('check_in', 'check_out') then
    raise exception 'ATTENDANCE_ACTION_INVALID';
  end if;
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

  v_day_name := (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from v_work_date)::integer + 1];
  select * into v_schedule
  from public.employee_schedules
  where employee_id = v_employee.id and day_of_week = v_day_name
  order by start_time asc
  limit 1;

  select * into v_policy
  from public.attendance_policies
  where is_active
    and (unit_id = coalesce(v_schedule.unit_id, v_employee.unit_id) or unit_id is null)
  order by (unit_id is not null) desc
  limit 1;
  if v_policy.id is not null then
    v_require_geofence := v_policy.require_geofence;
    v_max_accuracy := v_policy.max_accuracy_meters;
    v_grace := v_policy.grace_minutes;
    v_default_start := v_policy.default_start_time;
    v_default_end := v_policy.default_end_time;
    v_check_in_open := v_policy.check_in_open;
    v_check_in_close := v_policy.check_in_close;
  end if;

  if p_action = 'check_in' and v_schedule.id is null
    and (v_local_time < v_check_in_open or v_local_time > v_check_in_close) then
    raise exception 'OUTSIDE_CHECK_IN_WINDOW:%:%', v_check_in_open, v_check_in_close;
  end if;

  if p_site_id is not null then
    select * into v_site from public.attendance_sites where id = p_site_id and is_active;
    if v_site.id is null then raise exception 'ATTENDANCE_SITE_INVALID'; end if;
    select (
      not exists (select 1 from public.attendance_site_units su where su.site_id = v_site.id)
      or exists (
        select 1 from public.attendance_site_units su
        where su.site_id = v_site.id
          and (
            su.unit_id = v_employee.unit_id
            or exists (
              select 1 from public.employee_schedules valid_schedule
              where valid_schedule.employee_id = v_employee.id
                and valid_schedule.day_of_week = v_day_name
                and valid_schedule.unit_id = su.unit_id
            )
          )
      )
    ) into v_site_valid;
    if not v_site_valid then raise exception 'ATTENDANCE_SITE_NOT_ASSIGNED'; end if;
  end if;

  if v_require_geofence then
    if v_site.id is null then raise exception 'ATTENDANCE_SITE_REQUIRED'; end if;
    if p_latitude is null or p_longitude is null or p_accuracy_meters is null then
      raise exception 'LOCATION_REQUIRED';
    end if;
    if p_accuracy_meters > least(v_max_accuracy, v_site.accuracy_limit_meters) then
      raise exception 'LOCATION_ACCURACY_LOW:%', round(p_accuracy_meters);
    end if;
    v_distance := public.attendance_distance_meters(p_latitude, p_longitude, v_site.latitude, v_site.longitude);
    if v_distance > v_site.radius_meters then
      raise exception 'OUTSIDE_GEOFENCE:%:%', round(v_distance), v_site.radius_meters;
    end if;
  end if;

  v_start_time := coalesce(v_schedule.start_time, v_default_start);
  select max(end_time) into v_end_time
  from public.employee_schedules
  where employee_id = v_employee.id and day_of_week = v_day_name;
  v_end_time := coalesce(v_end_time, v_default_end);
  v_scheduled_start := v_work_date + v_start_time;
  v_scheduled_end := v_work_date + v_end_time;
  if v_end_time < v_start_time then v_scheduled_end := v_scheduled_end + interval '1 day'; end if;

  if p_action = 'check_in' and v_schedule.id is not null
    and (v_local_ts < v_scheduled_start - interval '3 hours' or v_local_ts > v_scheduled_start + interval '6 hours') then
    raise exception 'OUTSIDE_SCHEDULE_CHECK_IN_WINDOW';
  end if;

  if p_action = 'check_in' then
    v_late_minutes := greatest(0, floor(extract(epoch from (v_local_time - v_start_time)) / 60)::integer - v_grace);
    insert into public.employee_attendance (
      employee_id, date, unit_id, schedule_id, site_id, status, time_in, check_in_at,
      check_in_latitude, check_in_longitude, check_in_accuracy_meters, check_in_distance_meters,
      check_in_method, location_status, verification_status, is_late, late_minutes, device_context, notes
    ) values (
      v_employee.id, v_work_date, coalesce(v_schedule.unit_id, v_employee.unit_id), v_schedule.id, v_site.id,
      case when v_late_minutes > 0 then 'late' else 'present' end,
      v_local_time, v_now, p_latitude, p_longitude, p_accuracy_meters, v_distance,
      case when v_require_geofence then 'geofence' else 'portal' end,
      case when v_require_geofence then 'inside' else 'not_required' end,
      case when v_require_geofence then 'verified' else 'unverified' end,
      v_late_minutes > 0, v_late_minutes, coalesce(p_device_context, '{}'::jsonb),
      'Absensi mandiri melalui portal pegawai.'
    )
    on conflict (employee_id, date) do update set
      unit_id = excluded.unit_id, schedule_id = excluded.schedule_id, site_id = excluded.site_id,
      status = excluded.status, time_in = excluded.time_in, check_in_at = excluded.check_in_at,
      check_in_latitude = excluded.check_in_latitude, check_in_longitude = excluded.check_in_longitude,
      check_in_accuracy_meters = excluded.check_in_accuracy_meters,
      check_in_distance_meters = excluded.check_in_distance_meters,
      check_in_method = excluded.check_in_method, location_status = excluded.location_status,
      verification_status = excluded.verification_status, is_late = excluded.is_late,
      late_minutes = excluded.late_minutes, device_context = excluded.device_context,
      notes = excluded.notes, updated_at = now()
    returning * into v_record;
  else
    v_early_minutes := greatest(0, floor(extract(epoch from (v_scheduled_end - v_local_ts)) / 60)::integer - coalesce(v_policy.early_departure_tolerance_minutes, 0));
    update public.employee_attendance set
      site_id = coalesce(v_site.id, site_id), time_out = v_local_time, check_out_at = v_now,
      check_out_latitude = p_latitude, check_out_longitude = p_longitude,
      check_out_accuracy_meters = p_accuracy_meters, check_out_distance_meters = v_distance,
      check_out_method = case when v_require_geofence then 'geofence' else 'portal' end,
      location_status = case when v_require_geofence then 'inside' else location_status end,
      verification_status = case when v_require_geofence then 'verified' else verification_status end,
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
    'site_name', v_site.name
  );
end;
$$;

create or replace function public.review_attendance_correction(
  p_request_id uuid,
  p_decision text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.attendance_correction_requests%rowtype;
  v_employee public.employees%rowtype;
  v_attendance public.employee_attendance%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'REVIEW_DECISION_INVALID'; end if;
  select * into v_request from public.attendance_correction_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'CORRECTION_NOT_FOUND'; end if;
  if v_request.status <> 'pending' then raise exception 'CORRECTION_ALREADY_REVIEWED'; end if;
  select * into v_employee from public.employees where id = v_request.employee_id;
  if not public.attendance_is_manager(v_employee.unit_id) then raise exception 'ATTENDANCE_REVIEW_FORBIDDEN'; end if;

  update public.attendance_correction_requests set
    status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_review_note), '')
  where id = p_request_id;

  if p_decision = 'approved' then
    insert into public.employee_attendance (
      employee_id, date, unit_id, status, time_in, time_out, check_in_at, check_out_at,
      check_in_method, check_out_method, location_status, verification_status,
      reviewed_by, reviewed_at, review_note, notes
    ) values (
      v_request.employee_id, v_request.request_date, v_employee.unit_id, 'present',
      case when v_request.attendance_action = 'check_in' then v_request.requested_time else null end,
      case when v_request.attendance_action = 'check_out' then v_request.requested_time else null end,
      case when v_request.attendance_action = 'check_in' and v_request.requested_time is not null
        then (v_request.request_date + v_request.requested_time) at time zone 'Asia/Jakarta' else null end,
      case when v_request.attendance_action = 'check_out' and v_request.requested_time is not null
        then (v_request.request_date + v_request.requested_time) at time zone 'Asia/Jakarta' else null end,
      case when v_request.attendance_action = 'check_in' then 'approved_exception' else 'legacy' end,
      case when v_request.attendance_action = 'check_out' then 'approved_exception' else null end,
      'unavailable', 'approved_exception', auth.uid(), now(), p_review_note,
      'Koreksi presensi disetujui: ' || v_request.reason
    )
    on conflict (employee_id, date) do update set
      time_in = case when v_request.attendance_action = 'check_in' then v_request.requested_time else public.employee_attendance.time_in end,
      time_out = case when v_request.attendance_action = 'check_out' then v_request.requested_time else public.employee_attendance.time_out end,
      check_in_method = case when v_request.attendance_action = 'check_in' then 'approved_exception' else public.employee_attendance.check_in_method end,
      check_out_method = case when v_request.attendance_action = 'check_out' then 'approved_exception' else public.employee_attendance.check_out_method end,
      verification_status = 'approved_exception', reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = p_review_note, notes = 'Koreksi presensi disetujui: ' || v_request.reason, updated_at = now()
    returning * into v_attendance;
    update public.attendance_correction_requests set attendance_id = v_attendance.id where id = p_request_id;
  end if;

  return jsonb_build_object('id', p_request_id, 'status', p_decision, 'attendance_id', v_attendance.id);
end;
$$;

alter table public.attendance_sites enable row level security;
alter table public.attendance_site_units enable row level security;
alter table public.attendance_policies enable row level security;
alter table public.attendance_correction_requests enable row level security;

drop policy if exists "Authenticated read attendance sites" on public.attendance_sites;
create policy "Authenticated read attendance sites" on public.attendance_sites for select to authenticated using (true);
drop policy if exists "Attendance managers manage sites" on public.attendance_sites;
create policy "Attendance managers manage sites" on public.attendance_sites for all to authenticated
  using (public.attendance_is_manager(null)) with check (public.attendance_is_manager(null));

drop policy if exists "Authenticated read attendance site units" on public.attendance_site_units;
create policy "Authenticated read attendance site units" on public.attendance_site_units for select to authenticated using (true);
drop policy if exists "Attendance managers manage site units" on public.attendance_site_units;
create policy "Attendance managers manage site units" on public.attendance_site_units for all to authenticated
  using (public.attendance_is_manager(unit_id)) with check (public.attendance_is_manager(unit_id));

drop policy if exists "Authenticated read attendance policies" on public.attendance_policies;
create policy "Authenticated read attendance policies" on public.attendance_policies for select to authenticated using (true);
drop policy if exists "Attendance managers manage policies" on public.attendance_policies;
create policy "Attendance managers manage policies" on public.attendance_policies for all to authenticated
  using (public.attendance_is_manager(unit_id)) with check (public.attendance_is_manager(unit_id));

drop policy if exists "Employees read own corrections" on public.attendance_correction_requests;
create policy "Employees read own corrections" on public.attendance_correction_requests for select to authenticated
  using (exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()));
drop policy if exists "Employees create own corrections" on public.attendance_correction_requests;
create policy "Employees create own corrections" on public.attendance_correction_requests for insert to authenticated
  with check (
    status = 'pending'
    and request_date between ((clock_timestamp() at time zone 'Asia/Jakarta')::date - 30) and (clock_timestamp() at time zone 'Asia/Jakarta')::date
    and exists (
    select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid() and e.status = 'active'
  ));
drop policy if exists "Employees cancel own corrections" on public.attendance_correction_requests;
create policy "Employees cancel own corrections" on public.attendance_correction_requests for update to authenticated
  using (status = 'pending' and exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()))
  with check (status = 'cancelled' and exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()));
drop policy if exists "Attendance managers manage corrections" on public.attendance_correction_requests;
create policy "Attendance managers manage corrections" on public.attendance_correction_requests for all to authenticated
  using (exists (select 1 from public.employees e where e.id = employee_id and public.attendance_is_manager(e.unit_id)))
  with check (exists (select 1 from public.employees e where e.id = employee_id and public.attendance_is_manager(e.unit_id)));

drop policy if exists "Active employees insert own attendance" on public.employee_attendance;
drop policy if exists "Active employees update own attendance" on public.employee_attendance;
drop policy if exists "Active employees read own attendance" on public.employee_attendance;
create policy "Active employees read own attendance" on public.employee_attendance for select to authenticated
  using (exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid() and e.status = 'active'));
drop policy if exists "Attendance managers create attendance" on public.employee_attendance;
create policy "Attendance managers create attendance" on public.employee_attendance for insert to authenticated
  with check (exists (select 1 from public.employees e where e.id = employee_id and public.attendance_is_manager(e.unit_id)));
drop policy if exists "Attendance managers update attendance" on public.employee_attendance;
create policy "Attendance managers update attendance" on public.employee_attendance for update to authenticated
  using (exists (select 1 from public.employees e where e.id = employee_id and public.attendance_is_manager(e.unit_id)))
  with check (exists (select 1 from public.employees e where e.id = employee_id and public.attendance_is_manager(e.unit_id)));

grant select on public.attendance_sites, public.attendance_site_units, public.attendance_policies to authenticated;
grant insert, update, delete on public.attendance_sites, public.attendance_site_units, public.attendance_policies to authenticated;
grant select, insert, update on public.attendance_correction_requests to authenticated;
revoke all on function public.record_employee_attendance(text, uuid, double precision, double precision, double precision, jsonb) from public;
revoke all on function public.review_attendance_correction(uuid, text, text) from public;
grant execute on function public.record_employee_attendance(text, uuid, double precision, double precision, double precision, jsonb) to authenticated;
grant execute on function public.review_attendance_correction(uuid, text, text) to authenticated;

insert into public.attendance_policies (unit_id, name, require_geofence)
select u.id, 'Kebijakan Presensi ' || u.name, false
from public.units u
where not exists (select 1 from public.attendance_policies p where p.unit_id = u.id)
on conflict do nothing;

insert into public.attendance_policies (unit_id, name, require_geofence)
select null, 'Kebijakan Presensi Lintas Unit', false
where not exists (select 1 from public.attendance_policies where unit_id is null);
