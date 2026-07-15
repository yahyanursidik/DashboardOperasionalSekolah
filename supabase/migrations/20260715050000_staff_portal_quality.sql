-- Staff portal quality: secure access, operational reporting, and scoped workflows.

-- Kept here as well as in the teacher migration so this migration can be run
-- independently from the Supabase SQL editor.
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid() and e.status = 'active'
  limit 1;
$$;

create or replace function public.staff_has_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where e.user_id = auth.uid()
      and e.status = 'active'
      and e.position in (
        'cleaning_service', 'satpam', 'sarpras', 'bendahara', 'school_center',
        'tu', 'pustakawan', 'laboran', 'penanggung_jawab', 'lainnya'
      )
  );
$$;

create or replace function public.get_staff_login_email_by_identifier(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select e.email
  from public.employees e
  where e.status = 'active'
    and (lower(e.email) = lower(trim(p_identifier)) or e.nik = trim(p_identifier))
    and e.position in (
      'cleaning_service', 'satpam', 'sarpras', 'bendahara', 'school_center',
      'tu', 'pustakawan', 'laboran', 'penanggung_jawab', 'lainnya'
    )
  limit 1;
$$;

create or replace function public.staff_operations_is_manager(target_unit_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.auth_user_roles() scope
    where scope.role_name in (
      'super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu',
      'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'
    )
      and (
        scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'hrd')
        or scope.unit_id is null or target_unit_id is null or scope.unit_id = target_unit_id
      )
  );
$$;

create table if not exists public.employee_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(employee_id, announcement_id)
);

create index if not exists employee_announcement_reads_employee_idx
  on public.employee_announcement_reads(employee_id, read_at desc);

alter table public.employee_announcement_reads enable row level security;
drop policy if exists "Employees manage own announcement reads" on public.employee_announcement_reads;
create policy "Employees manage own announcement reads"
  on public.employee_announcement_reads for all to authenticated
  using (employee_id = public.current_employee_id())
  with check (employee_id = public.current_employee_id());
drop policy if exists "Managers read employee announcement receipts" on public.employee_announcement_reads;
create policy "Managers read employee announcement receipts"
  on public.employee_announcement_reads for select to authenticated
  using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.staff_operations_is_manager(e.unit_id)
  ));

drop policy if exists "Employees read own profile" on public.employees;
create policy "Employees read own profile"
  on public.employees for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.staff_operational_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique,
  employee_id uuid not null references public.employees(id) on delete cascade,
  unit_id uuid references public.units(id),
  category text not null check (category in (
    'cleanliness', 'security_incident', 'facility_damage', 'supply_request',
    'service_issue', 'administration', 'finance_handover', 'health_safety', 'other'
  )),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  title text not null,
  description text not null,
  location text,
  occurred_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in (
    'submitted', 'in_review', 'assigned', 'resolved', 'closed', 'rejected'
  )),
  assigned_to uuid references public.employees(id),
  resolution_note text,
  resolved_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_staff_operational_report_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.report_number is null then
    new.report_number := 'OPS-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

drop trigger if exists set_staff_operational_report_number on public.staff_operational_reports;
create trigger set_staff_operational_report_number
  before insert on public.staff_operational_reports
  for each row execute function public.set_staff_operational_report_number();

drop trigger if exists handle_staff_operational_reports_updated_at on public.staff_operational_reports;
create trigger handle_staff_operational_reports_updated_at
  before update on public.staff_operational_reports
  for each row execute procedure public.handle_updated_at();

create index if not exists staff_operational_reports_employee_idx
  on public.staff_operational_reports(employee_id, created_at desc);
create index if not exists staff_operational_reports_unit_status_idx
  on public.staff_operational_reports(unit_id, status, created_at desc);
create index if not exists staff_operational_reports_assigned_idx
  on public.staff_operational_reports(assigned_to, status);

alter table public.staff_operational_reports enable row level security;

drop policy if exists "Staff create own operational reports" on public.staff_operational_reports;
create policy "Staff create own operational reports"
  on public.staff_operational_reports for insert to authenticated
  with check (employee_id = public.current_employee_id() and public.staff_has_portal_access());

drop policy if exists "Staff read own operational reports" on public.staff_operational_reports;
create policy "Staff read own operational reports"
  on public.staff_operational_reports for select to authenticated
  using (employee_id = public.current_employee_id() or assigned_to = public.current_employee_id());

drop policy if exists "Staff update own submitted operational reports" on public.staff_operational_reports;
create policy "Staff update own submitted operational reports"
  on public.staff_operational_reports for update to authenticated
  using (employee_id = public.current_employee_id() and status = 'submitted')
  with check (employee_id = public.current_employee_id() and status = 'submitted');

drop policy if exists "Assigned staff update operational reports" on public.staff_operational_reports;
create policy "Assigned staff update operational reports"
  on public.staff_operational_reports for update to authenticated
  using (assigned_to = public.current_employee_id() and status in ('in_review', 'assigned'))
  with check (assigned_to = public.current_employee_id() and status in ('assigned', 'resolved'));

drop policy if exists "Managers manage operational reports" on public.staff_operational_reports;
create policy "Managers manage operational reports"
  on public.staff_operational_reports for all to authenticated
  using (public.staff_operations_is_manager(unit_id))
  with check (public.staff_operations_is_manager(unit_id));

revoke all on function public.get_staff_login_email_by_identifier(text) from public;
revoke all on function public.current_employee_id() from public;
revoke all on function public.staff_has_portal_access() from public;
revoke all on function public.staff_operations_is_manager(uuid) from public;
grant execute on function public.get_staff_login_email_by_identifier(text) to anon, authenticated;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.staff_has_portal_access() to authenticated;
grant execute on function public.staff_operations_is_manager(uuid) to authenticated;
grant select, insert, update on public.staff_operational_reports to authenticated;
grant select, insert, update on public.employee_announcement_reads to authenticated;
