-- Role-based attendance shifts. Explicit employee schedules remain the most
-- specific source; assigned shifts provide a reusable weekly work schedule.

create table if not exists public.attendance_shifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit_id uuid references public.units(id) on delete cascade,
  position text not null,
  schedule_type text not null default 'standby'
    check (schedule_type in ('piket', 'shift_keamanan', 'shift_kebersihan', 'standby')),
  days_of_week text[] not null default array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']::text[],
  start_time time not null,
  end_time time not null,
  check_in_open time not null,
  check_in_close time not null,
  grace_minutes integer not null default 10 check (grace_minutes between 0 and 180),
  early_departure_tolerance_minutes integer not null default 0
    check (early_departure_tolerance_minutes between 0 and 180),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_shifts_days_check check (
    cardinality(days_of_week) > 0
    and days_of_week <@ array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']::text[]
  )
);

create table if not exists public.attendance_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid not null references public.attendance_shifts(id) on delete cascade,
  is_active boolean not null default true,
  notes text,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists attendance_shift_assignments_one_active_employee
  on public.attendance_shift_assignments(employee_id) where is_active;
create index if not exists attendance_shifts_position_unit_idx
  on public.attendance_shifts(position, unit_id, is_active);

alter table public.employee_schedules
  add column if not exists attendance_shift_id uuid references public.attendance_shifts(id) on delete cascade,
  add column if not exists attendance_shift_assignment_id uuid references public.attendance_shift_assignments(id) on delete cascade;

alter table public.employee_attendance
  add column if not exists attendance_shift_id uuid references public.attendance_shifts(id) on delete set null;

create unique index if not exists employee_schedules_shift_assignment_day_unique
  on public.employee_schedules(attendance_shift_assignment_id, day_of_week)
  where attendance_shift_assignment_id is not null;
create index if not exists employee_attendance_shift_date_idx
  on public.employee_attendance(attendance_shift_id, date desc);

drop trigger if exists handle_attendance_shifts_updated_at on public.attendance_shifts;
create trigger handle_attendance_shifts_updated_at
  before update on public.attendance_shifts
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_attendance_shift_assignments_updated_at on public.attendance_shift_assignments;
create trigger handle_attendance_shift_assignments_updated_at
  before update on public.attendance_shift_assignments
  for each row execute procedure public.handle_updated_at();

create or replace function public.sync_attendance_shift_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.attendance_shift_assignments%rowtype;
  v_shift public.attendance_shifts%rowtype;
  v_day text;
begin
  if tg_op = 'DELETE' then
    delete from public.employee_schedules where attendance_shift_assignment_id = old.id;
    return old;
  end if;

  v_assignment := new;
  delete from public.employee_schedules where attendance_shift_assignment_id = v_assignment.id;
  if not v_assignment.is_active then return new; end if;

  select * into v_shift from public.attendance_shifts where id = v_assignment.shift_id and is_active;
  if v_shift.id is null then return new; end if;

  foreach v_day in array v_shift.days_of_week loop
    insert into public.employee_schedules (
      employee_id, day_of_week, start_time, end_time, schedule_type, subject,
      unit_id, attendance_shift_id, attendance_shift_assignment_id
    ) values (
      v_assignment.employee_id, v_day, v_shift.start_time, v_shift.end_time,
      v_shift.schedule_type, v_shift.name, v_shift.unit_id,
      v_shift.id, v_assignment.id
    )
    on conflict (attendance_shift_assignment_id, day_of_week)
      where attendance_shift_assignment_id is not null
    do update set
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      schedule_type = excluded.schedule_type,
      subject = excluded.subject,
      unit_id = excluded.unit_id,
      attendance_shift_id = excluded.attendance_shift_id,
      updated_at = now();
  end loop;
  return new;
end;
$$;

drop trigger if exists sync_attendance_shift_schedule_on_assignment on public.attendance_shift_assignments;
create trigger sync_attendance_shift_schedule_on_assignment
  after insert or update or delete on public.attendance_shift_assignments
  for each row execute function public.sync_attendance_shift_schedule();

create or replace function public.refresh_attendance_shift_schedules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attendance_shift_assignments
  set updated_at = now()
  where shift_id = new.id and is_active;
  return new;
end;
$$;

drop trigger if exists refresh_attendance_shift_schedules_on_shift on public.attendance_shifts;
create trigger refresh_attendance_shift_schedules_on_shift
  after update on public.attendance_shifts
  for each row execute function public.refresh_attendance_shift_schedules();

create or replace function public.assign_employee_attendance_shift(
  p_employee_id uuid,
  p_shift_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_shift public.attendance_shifts%rowtype;
  v_assignment_id uuid;
begin
  select * into v_employee from public.employees where id = p_employee_id and status = 'active';
  if v_employee.id is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if not public.attendance_is_manager(v_employee.unit_id) then raise exception 'ATTENDANCE_ACCESS_DENIED'; end if;

  update public.attendance_shift_assignments
  set is_active = false, updated_at = now()
  where employee_id = p_employee_id and is_active;

  if p_shift_id is null then return null; end if;
  select * into v_shift from public.attendance_shifts where id = p_shift_id and is_active;
  if v_shift.id is null then raise exception 'ATTENDANCE_SHIFT_NOT_FOUND'; end if;
  if v_shift.position <> v_employee.position then raise exception 'ATTENDANCE_SHIFT_POSITION_MISMATCH'; end if;
  if v_shift.unit_id is not null and v_employee.unit_id is distinct from v_shift.unit_id then
    raise exception 'ATTENDANCE_SHIFT_UNIT_MISMATCH';
  end if;

  insert into public.attendance_shift_assignments (employee_id, shift_id, assigned_by)
  values (p_employee_id, p_shift_id, auth.uid())
  returning id into v_assignment_id;
  return v_assignment_id;
end;
$$;

grant execute on function public.assign_employee_attendance_shift(uuid, uuid) to authenticated;

create or replace function public.enforce_employee_attendance_shift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.attendance_shifts%rowtype;
  v_check_ts timestamp;
  v_checkout_ts timestamp;
  v_start_ts timestamp;
  v_end_ts timestamp;
  v_close_ts timestamp;
  v_late integer;
  v_early integer;
  v_check_in_changed boolean;
  v_check_out_changed boolean;
begin
  v_check_in_changed := tg_op = 'INSERT';
  v_check_out_changed := tg_op = 'INSERT';
  if tg_op = 'UPDATE' then
    v_check_in_changed := old.time_in is distinct from new.time_in;
    v_check_out_changed := old.time_out is distinct from new.time_out;
  end if;

  if new.schedule_id is null then return new; end if;
  select shift_record.* into v_shift
  from public.employee_schedules schedule
  join public.attendance_shifts shift_record on shift_record.id = schedule.attendance_shift_id
  where schedule.id = new.schedule_id and shift_record.is_active;
  if v_shift.id is null then return new; end if;

  new.attendance_shift_id := v_shift.id;
  v_start_ts := new.date + v_shift.start_time;
  v_end_ts := new.date + v_shift.end_time;
  if v_shift.end_time < v_shift.start_time then v_end_ts := v_end_ts + interval '1 day'; end if;

  if v_check_in_changed and new.time_in is not null then
    v_check_ts := coalesce(new.check_in_at at time zone 'Asia/Jakarta', new.date + new.time_in);
    v_close_ts := new.date + v_shift.check_in_close;
    if v_shift.check_in_close < v_shift.start_time then v_close_ts := v_close_ts + interval '1 day'; end if;
    -- check_in_open is the normal operating reference, not an early-arrival ban.
    if v_check_ts > v_close_ts then
      raise exception 'OUTSIDE_SHIFT_CHECK_IN_WINDOW:%:%:%', v_shift.name, v_shift.check_in_open, v_shift.check_in_close;
    end if;
    v_late := greatest(0, floor(extract(epoch from (v_check_ts - v_start_ts)) / 60)::integer - v_shift.grace_minutes);
    new.is_late := v_late > 0;
    new.late_minutes := v_late;
    new.status := case when v_late > 0 then 'late' else 'present' end;
  end if;

  if v_check_out_changed and new.time_out is not null then
    v_checkout_ts := coalesce(new.check_out_at at time zone 'Asia/Jakarta', new.date + new.time_out);
    if v_checkout_ts < v_start_ts then v_checkout_ts := v_checkout_ts + interval '1 day'; end if;
    v_early := greatest(0, floor(extract(epoch from (v_end_ts - v_checkout_ts)) / 60)::integer - v_shift.early_departure_tolerance_minutes);
    new.is_early_departure := v_early > 0;
    new.early_departure_minutes := v_early;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_employee_attendance_shift on public.employee_attendance;
create trigger enforce_employee_attendance_shift
  before insert or update on public.employee_attendance
  for each row execute function public.enforce_employee_attendance_shift();

alter table public.attendance_shifts enable row level security;
alter table public.attendance_shift_assignments enable row level security;

drop policy if exists "Employees read applicable attendance shifts" on public.attendance_shifts;
create policy "Employees read applicable attendance shifts"
  on public.attendance_shifts for select to authenticated
  using (
    public.attendance_is_manager(unit_id)
    or exists (
      select 1 from public.attendance_shift_assignments assignment
      join public.employees employee on employee.id = assignment.employee_id
      where assignment.shift_id = attendance_shifts.id
        and assignment.is_active
        and employee.user_id = auth.uid()
    )
  );
drop policy if exists "Managers manage attendance shifts" on public.attendance_shifts;
create policy "Managers manage attendance shifts"
  on public.attendance_shifts for all to authenticated
  using (public.attendance_is_manager(unit_id))
  with check (public.attendance_is_manager(unit_id));

drop policy if exists "Employees read own shift assignment" on public.attendance_shift_assignments;
create policy "Employees read own shift assignment"
  on public.attendance_shift_assignments for select to authenticated
  using (
    public.attendance_is_manager((select employee.unit_id from public.employees employee where employee.id = employee_id))
    or exists (select 1 from public.employees employee where employee.id = employee_id and employee.user_id = auth.uid())
  );
drop policy if exists "Managers manage shift assignments" on public.attendance_shift_assignments;
create policy "Managers manage shift assignments"
  on public.attendance_shift_assignments for all to authenticated
  using (public.attendance_is_manager((select employee.unit_id from public.employees employee where employee.id = employee_id)))
  with check (public.attendance_is_manager((select employee.unit_id from public.employees employee where employee.id = employee_id)));

grant select, insert, update, delete on public.attendance_shifts to authenticated;
grant select, insert, update, delete on public.attendance_shift_assignments to authenticated;

insert into public.attendance_shifts (
  code, name, position, schedule_type, days_of_week,
  start_time, end_time, check_in_open, check_in_close, grace_minutes, notes
) values
  ('cs-pagi', 'Cleaning Service Pagi', 'cleaning_service', 'shift_kebersihan', array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'], '06:00', '14:00', '05:00', '07:00', 10, 'Template lintas unit; sesuaikan sebelum ditugaskan.'),
  ('cs-sore', 'Cleaning Service Sore', 'cleaning_service', 'shift_kebersihan', array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'], '13:00', '21:00', '12:00', '14:00', 10, 'Template lintas unit; sesuaikan sebelum ditugaskan.'),
  ('satpam-pagi', 'Keamanan Pagi', 'satpam', 'shift_keamanan', array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'], '06:00', '18:00', '05:00', '07:00', 10, 'Template lintas unit; sesuaikan sebelum ditugaskan.'),
  ('satpam-malam', 'Keamanan Malam', 'satpam', 'shift_keamanan', array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'], '18:00', '06:00', '17:00', '19:00', 10, 'Template lintas unit; sesuaikan sebelum ditugaskan.')
on conflict (code) do nothing;
