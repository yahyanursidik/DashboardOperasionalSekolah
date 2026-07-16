-- Attendance for meetings and incidental activities is intentionally separated
-- from daily work attendance so multiple events can be recorded on one date.

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) >= 3),
  event_type text not null default 'meeting' check (event_type in ('meeting', 'training', 'school_activity', 'religious_activity', 'committee', 'other')),
  unit_id uuid references public.units(id) on delete set null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  check_in_close time not null,
  grace_minutes integer not null default 10 check (grace_minutes between 0 and 180),
  site_id uuid references public.attendance_sites(id) on delete set null,
  require_geofence boolean not null default false,
  description text,
  status text not null default 'published' check (status in ('draft', 'published', 'completed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time <> start_time)
);

create table if not exists public.attendance_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.attendance_events(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  participation_type text not null default 'required' check (participation_type in ('required', 'optional')),
  notes text,
  created_at timestamptz not null default now(),
  unique (event_id, employee_id)
);

create table if not exists public.attendance_event_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.attendance_events(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'excused')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  late_minutes integer not null default 0 check (late_minutes >= 0),
  site_id uuid references public.attendance_sites(id) on delete set null,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy_meters double precision,
  check_in_distance_meters double precision,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'manual', 'excused')),
  device_context jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, employee_id)
);

create index if not exists attendance_events_date_idx on public.attendance_events(event_date, status);
create index if not exists attendance_events_unit_idx on public.attendance_events(unit_id, event_date);
create index if not exists attendance_event_participants_employee_idx on public.attendance_event_participants(employee_id, event_id);
create index if not exists attendance_event_records_employee_idx on public.attendance_event_records(employee_id, event_id);

drop trigger if exists handle_updated_at_attendance_events on public.attendance_events;
create trigger handle_updated_at_attendance_events before update on public.attendance_events
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_updated_at_attendance_event_records on public.attendance_event_records;
create trigger handle_updated_at_attendance_event_records before update on public.attendance_event_records
  for each row execute procedure public.handle_updated_at();

create or replace function public.employee_can_access_attendance_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attendance_event_participants participant
    join public.employees employee on employee.id = participant.employee_id
    where participant.event_id = p_event_id
      and employee.user_id = auth.uid()
      and employee.status = 'active'
  );
$$;

create or replace function public.record_employee_event_attendance(
  p_event_id uuid,
  p_action text,
  p_site_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null,
  p_device_context jsonb default '{}'::jsonb
)
returns public.attendance_event_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_event public.attendance_events%rowtype;
  v_site public.attendance_sites%rowtype;
  v_record public.attendance_event_records%rowtype;
  v_now timestamptz := now();
  v_local_ts timestamp := now() at time zone 'Asia/Jakarta';
  v_start_ts timestamp;
  v_close_ts timestamp;
  v_distance double precision;
  v_late integer := 0;
begin
  if p_action not in ('check_in', 'check_out') then raise exception 'EVENT_ATTENDANCE_ACTION_INVALID'; end if;

  select * into v_employee from public.employees where user_id = auth.uid() and status = 'active' limit 1;
  if v_employee.id is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;

  select event.* into v_event
  from public.attendance_events event
  join public.attendance_event_participants participant on participant.event_id = event.id
  where event.id = p_event_id and participant.employee_id = v_employee.id;
  if v_event.id is null then raise exception 'EVENT_NOT_ASSIGNED'; end if;
  if v_event.status <> 'published' then raise exception 'EVENT_NOT_OPEN'; end if;
  if v_local_ts::date <> v_event.event_date then raise exception 'EVENT_NOT_TODAY'; end if;

  v_start_ts := v_event.event_date + v_event.start_time;
  v_close_ts := v_event.event_date + v_event.check_in_close;
  if v_event.check_in_close < v_event.start_time then v_close_ts := v_close_ts + interval '1 day'; end if;

  select * into v_record from public.attendance_event_records
  where event_id = v_event.id and employee_id = v_employee.id;

  if p_action = 'check_in' then
    if v_record.check_in_at is not null then raise exception 'EVENT_ALREADY_CHECKED_IN'; end if;
    -- Early arrivals are valid; only the final check-in cutoff blocks the action.
    if v_local_ts > v_close_ts then raise exception 'EVENT_CHECK_IN_CLOSED'; end if;

    if v_event.require_geofence then
      if v_event.site_id is null then raise exception 'EVENT_SITE_NOT_CONFIGURED'; end if;
      if p_site_id is distinct from v_event.site_id then raise exception 'EVENT_SITE_INVALID'; end if;
      if p_latitude is null or p_longitude is null or p_accuracy_meters is null then raise exception 'LOCATION_REQUIRED'; end if;
      select * into v_site from public.attendance_sites where id = v_event.site_id and is_active;
      if v_site.id is null then raise exception 'EVENT_SITE_INVALID'; end if;
      if p_accuracy_meters > v_site.accuracy_limit_meters then raise exception 'LOCATION_ACCURACY_LOW:%', round(p_accuracy_meters); end if;
      v_distance := public.attendance_distance_meters(p_latitude, p_longitude, v_site.latitude, v_site.longitude);
      if v_distance > v_site.radius_meters then raise exception 'OUTSIDE_GEOFENCE:%:%', round(v_distance), v_site.radius_meters; end if;
    end if;

    v_late := greatest(0, floor(extract(epoch from (v_local_ts - v_start_ts)) / 60)::integer - v_event.grace_minutes);
    insert into public.attendance_event_records (
      event_id, employee_id, status, check_in_at, late_minutes, site_id,
      check_in_latitude, check_in_longitude, check_in_accuracy_meters, check_in_distance_meters,
      verification_status, device_context
    ) values (
      v_event.id, v_employee.id, case when v_late > 0 then 'late' else 'present' end, v_now, v_late, v_event.site_id,
      p_latitude, p_longitude, p_accuracy_meters, v_distance,
      case when v_event.require_geofence then 'verified' else 'unverified' end, coalesce(p_device_context, '{}'::jsonb)
    )
    on conflict (event_id, employee_id) do update set
      status = excluded.status, check_in_at = excluded.check_in_at, late_minutes = excluded.late_minutes,
      site_id = excluded.site_id, check_in_latitude = excluded.check_in_latitude,
      check_in_longitude = excluded.check_in_longitude, check_in_accuracy_meters = excluded.check_in_accuracy_meters,
      check_in_distance_meters = excluded.check_in_distance_meters,
      verification_status = excluded.verification_status, device_context = excluded.device_context
    returning * into v_record;
  else
    if v_record.check_in_at is null then raise exception 'EVENT_CHECK_IN_REQUIRED'; end if;
    if v_record.check_out_at is not null then raise exception 'EVENT_ALREADY_CHECKED_OUT'; end if;
    update public.attendance_event_records set check_out_at = v_now where id = v_record.id returning * into v_record;
  end if;

  return v_record;
end;
$$;

create or replace function public.finalize_attendance_event(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.attendance_events%rowtype;
  v_count integer;
begin
  select * into v_event from public.attendance_events where id = p_event_id;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if not public.attendance_is_manager(v_event.unit_id) then raise exception 'ATTENDANCE_ACCESS_DENIED'; end if;
  if v_event.event_date > (now() at time zone 'Asia/Jakarta')::date then raise exception 'EVENT_NOT_FINISHED'; end if;

  insert into public.attendance_event_records (event_id, employee_id, status, verification_status)
  select participant.event_id, participant.employee_id, 'absent', 'manual'
  from public.attendance_event_participants participant
  where participant.event_id = p_event_id
    and participant.participation_type = 'required'
  on conflict (event_id, employee_id) do nothing;
  get diagnostics v_count = row_count;

  update public.attendance_events set status = 'completed' where id = p_event_id;
  return v_count;
end;
$$;

alter table public.attendance_events enable row level security;
alter table public.attendance_event_participants enable row level security;
alter table public.attendance_event_records enable row level security;

drop policy if exists "Attendance managers manage events" on public.attendance_events;
create policy "Attendance managers manage events" on public.attendance_events for all to authenticated
  using (public.attendance_is_manager(unit_id)) with check (public.attendance_is_manager(unit_id));
drop policy if exists "Employees view assigned events" on public.attendance_events;
create policy "Employees view assigned events" on public.attendance_events for select to authenticated
  using (public.employee_can_access_attendance_event(id));

drop policy if exists "Attendance managers manage event participants" on public.attendance_event_participants;
create policy "Attendance managers manage event participants" on public.attendance_event_participants for all to authenticated
  using (public.attendance_is_manager((select event.unit_id from public.attendance_events event where event.id = event_id)))
  with check (public.attendance_is_manager((select event.unit_id from public.attendance_events event where event.id = event_id)));
drop policy if exists "Employees view own event participation" on public.attendance_event_participants;
create policy "Employees view own event participation" on public.attendance_event_participants for select to authenticated
  using (exists (select 1 from public.employees employee where employee.id = employee_id and employee.user_id = auth.uid()));

drop policy if exists "Attendance managers manage event records" on public.attendance_event_records;
create policy "Attendance managers manage event records" on public.attendance_event_records for all to authenticated
  using (public.attendance_is_manager((select event.unit_id from public.attendance_events event where event.id = event_id)))
  with check (public.attendance_is_manager((select event.unit_id from public.attendance_events event where event.id = event_id)));
drop policy if exists "Employees view own event records" on public.attendance_event_records;
create policy "Employees view own event records" on public.attendance_event_records for select to authenticated
  using (exists (select 1 from public.employees employee where employee.id = employee_id and employee.user_id = auth.uid()));

revoke all on function public.employee_can_access_attendance_event(uuid) from public;
revoke all on function public.record_employee_event_attendance(uuid, text, uuid, double precision, double precision, double precision, jsonb) from public;
revoke all on function public.finalize_attendance_event(uuid) from public;
grant execute on function public.employee_can_access_attendance_event(uuid) to authenticated;
grant execute on function public.record_employee_event_attendance(uuid, text, uuid, double precision, double precision, double precision, jsonb) to authenticated;
grant execute on function public.finalize_attendance_event(uuid) to authenticated;
grant select, insert, update, delete on public.attendance_events to authenticated;
grant select, insert, update, delete on public.attendance_event_participants to authenticated;
grant select, insert, update, delete on public.attendance_event_records to authenticated;

-- PostgREST normally refreshes automatically after DDL, but an explicit reload
-- prevents a stale schema cache when this migration is run from the SQL editor.
notify pgrst, 'reload schema';
