-- Penggajian: komponen gaji yang dapat dikonfigurasi, gaji per pegawai, periode gaji bulanan,
-- dan slip yang dihitung server dari absensi, izin, dan lembur.
--
-- Akses: data gaji hanya untuk pengelola gaji; pegawai membaca slipnya sendiri setelah periode
-- disetujui/dibayar.

create or replace function public.is_payroll_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(array['super_admin','ketua_yayasan','hrd','admin_keuangan','kepala_tu']);
$$;
grant execute on function public.is_payroll_manager() to authenticated;

create table if not exists public.payroll_components (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('earning', 'deduction')),
  calc text not null check (calc in ('fixed', 'per_attendance_day', 'per_late_minute', 'per_absent_day', 'per_overtime_hour', 'percent_of_base')),
  default_amount numeric(14,2) not null default 0 check (default_amount >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_salary_items (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  component_id uuid not null references public.payroll_components(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (employee_id, component_id)
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_month date not null check (extract(day from period_month) = 1),
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  work_days integer not null default 22 check (work_days between 1 and 31),
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'cancelled')),
  notes text,
  generated_at timestamptz,
  created_by uuid default auth.uid(),
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payroll_runs_period_unit_key on public.payroll_runs(period_month, coalesce(unit_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status <> 'cancelled';

create table if not exists public.payroll_slips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  employee_name text not null,
  position text,
  unit_name text,
  present_days integer not null default 0,
  leave_days integer not null default 0,
  absent_days integer not null default 0,
  late_minutes integer not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  gross_amount numeric(14,2) not null default 0,
  deduction_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create table if not exists public.payroll_slip_lines (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.payroll_slips(id) on delete cascade,
  component_id uuid references public.payroll_components(id) on delete set null,
  name text not null,
  kind text not null check (kind in ('earning', 'deduction')),
  quantity numeric(10,2) not null default 1,
  rate numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0,
  sort_order integer not null default 0
);
create index if not exists payroll_slips_employee_idx on public.payroll_slips(employee_id);
create index if not exists payroll_slip_lines_slip_idx on public.payroll_slip_lines(slip_id, sort_order);

-- Compute every active employee's slip for a draft run from attendance, leave and paid overtime.
create or replace function public.payroll_generate(p_run_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  run public.payroll_runs%rowtype;
  period_start date;
  period_end date;
  emp record;
  comp record;
  slip_id uuid;
  present integer; leave_count integer; absent integer; late integer; overtime numeric;
  base numeric; qty numeric; rate numeric; line_amount numeric; gross numeric; deductions numeric;
  slip_count integer := 0;
begin
  if not public.is_payroll_manager() then raise exception 'Anda tidak memiliki izin mengelola penggajian.'; end if;
  select * into run from public.payroll_runs where id = p_run_id for update;
  if not found then raise exception 'Periode gaji tidak ditemukan.'; end if;
  if run.status <> 'draft' then raise exception 'Periode gaji yang sudah disetujui tidak dapat dihitung ulang. Buka kembali sebagai draf terlebih dahulu.'; end if;
  period_start := run.period_month;
  period_end := (run.period_month + interval '1 month - 1 day')::date;

  delete from public.payroll_slips where run_id = run.id;

  for emp in
    select e.id, e.full_name, e.position, u.name as unit_name
    from public.employees e left join public.units u on u.id = e.unit_id
    where e.status = 'active' and (run.unit_id is null or e.unit_id = run.unit_id)
    order by e.full_name
  loop
    select count(*) filter (where a.status in ('present', 'late')), coalesce(sum(a.late_minutes) filter (where a.status in ('present', 'late')), 0)
      into present, late
      from public.employee_attendance a
     where a.employee_id = emp.id and a.date between period_start and period_end;
    select coalesce(sum((least(l.end_date, period_end) - greatest(l.start_date, period_start)) + 1), 0)
      into leave_count
      from public.leave_requests l
     where l.employee_id = emp.id and l.status = 'approved' and l.start_date <= period_end and l.end_date >= period_start;
    absent := greatest(0, run.work_days - present - leave_count);
    select coalesce(round(sum(o.actual_minutes) / 60.0, 2), 0) into overtime
      from public.employee_overtime o
     where o.employee_id = emp.id and o.status in ('approved', 'completed') and o.compensation_type = 'paid'
       and o.overtime_date between period_start and period_end;

    insert into public.payroll_slips (run_id, employee_id, employee_name, position, unit_name, present_days, leave_days, absent_days, late_minutes, overtime_hours)
    values (run.id, emp.id, emp.full_name, emp.position, emp.unit_name, present, leave_count, absent, late, overtime)
    returning id into slip_id;

    -- Base salary = the employee's 'gaji_pokok' amount (used by percent_of_base components).
    select coalesce(si.amount, c.default_amount, 0) into base
      from public.payroll_components c
      left join public.employee_salary_items si on si.component_id = c.id and si.employee_id = emp.id and si.is_active
     where c.code = 'gaji_pokok' and c.is_active;
    base := coalesce(base, 0);

    gross := 0; deductions := 0;
    for comp in
      select c.*, si.amount as override_amount
      from public.payroll_components c
      left join public.employee_salary_items si on si.component_id = c.id and si.employee_id = emp.id and si.is_active
      where c.is_active
      order by c.kind, c.sort_order, c.name
    loop
      rate := coalesce(comp.override_amount, comp.default_amount);
      qty := case comp.calc
        when 'fixed' then 1
        when 'per_attendance_day' then present
        when 'per_late_minute' then late
        when 'per_absent_day' then absent
        when 'per_overtime_hour' then overtime
        when 'percent_of_base' then base / 100.0
      end;
      line_amount := round(coalesce(rate, 0) * coalesce(qty, 0), 0);
      continue when line_amount <= 0;
      insert into public.payroll_slip_lines (slip_id, component_id, name, kind, quantity, rate, amount, sort_order)
      values (slip_id, comp.id, comp.name, comp.kind, case when comp.calc = 'percent_of_base' then rate else qty end,
              case when comp.calc = 'percent_of_base' then base else rate end, line_amount, comp.sort_order);
      if comp.kind = 'earning' then gross := gross + line_amount; else deductions := deductions + line_amount; end if;
    end loop;

    update public.payroll_slips set gross_amount = gross, deduction_amount = deductions, net_amount = gross - deductions where id = slip_id;
    slip_count := slip_count + 1;
  end loop;

  update public.payroll_runs set generated_at = now(), updated_at = now() where id = run.id;
  return slip_count;
end;
$$;
revoke all on function public.payroll_generate(uuid) from public, anon;
grant execute on function public.payroll_generate(uuid) to authenticated;

-- Status workflow with audit fields.
create or replace function public.payroll_set_status(p_run_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  run public.payroll_runs%rowtype;
begin
  if not public.is_payroll_manager() then raise exception 'Anda tidak memiliki izin mengelola penggajian.'; end if;
  select * into run from public.payroll_runs where id = p_run_id for update;
  if not found then raise exception 'Periode gaji tidak ditemukan.'; end if;
  if not ((run.status = 'draft' and p_status in ('approved', 'cancelled'))
       or (run.status = 'approved' and p_status in ('paid', 'draft', 'cancelled'))) then
    raise exception 'Perubahan status dari % ke % tidak diizinkan.', run.status, p_status;
  end if;
  if p_status = 'approved' and not exists (select 1 from public.payroll_slips where run_id = run.id) then
    raise exception 'Hitung slip gaji terlebih dahulu sebelum menyetujui.';
  end if;
  update public.payroll_runs set
    status = p_status,
    approved_by = case when p_status = 'approved' then auth.uid() when p_status = 'draft' then null else approved_by end,
    approved_at = case when p_status = 'approved' then now() when p_status = 'draft' then null else approved_at end,
    paid_at = case when p_status = 'paid' then now() else paid_at end,
    updated_at = now()
  where id = run.id;
end;
$$;
revoke all on function public.payroll_set_status(uuid, text) from public, anon;
grant execute on function public.payroll_set_status(uuid, text) to authenticated;

alter table public.payroll_components enable row level security;
alter table public.employee_salary_items enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_slips enable row level security;
alter table public.payroll_slip_lines enable row level security;

drop policy if exists "Payroll managers manage components" on public.payroll_components;
create policy "Payroll managers manage components" on public.payroll_components for all to authenticated
  using (public.is_payroll_manager()) with check (public.is_payroll_manager());
drop policy if exists "Payroll managers manage salary items" on public.employee_salary_items;
create policy "Payroll managers manage salary items" on public.employee_salary_items for all to authenticated
  using (public.is_payroll_manager()) with check (public.is_payroll_manager());
drop policy if exists "Payroll managers manage runs" on public.payroll_runs;
create policy "Payroll managers manage runs" on public.payroll_runs for all to authenticated
  using (public.is_payroll_manager()) with check (public.is_payroll_manager());
-- Slips and lines are written only by payroll_generate; managers read, employees read their own released slips.
drop policy if exists "Payroll managers read slips" on public.payroll_slips;
create policy "Payroll managers read slips" on public.payroll_slips for select to authenticated using (public.is_payroll_manager());
-- Security-definer helpers avoid policy recursion between payroll_runs and payroll_slips.
create or replace function public.payroll_run_is_released(p_run_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.payroll_runs r where r.id = p_run_id and r.status in ('approved', 'paid'));
$$;
create or replace function public.payroll_employee_in_run(p_run_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.payroll_slips s where s.run_id = p_run_id and s.employee_id = public.current_employee_id());
$$;
create or replace function public.payroll_slip_is_own_released(p_slip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.payroll_slips s join public.payroll_runs r on r.id = s.run_id
    where s.id = p_slip_id and s.employee_id = public.current_employee_id() and r.status in ('approved', 'paid')
  );
$$;
grant execute on function public.payroll_run_is_released(uuid), public.payroll_employee_in_run(uuid), public.payroll_slip_is_own_released(uuid) to authenticated;

drop policy if exists "Employees read own released slips" on public.payroll_slips;
create policy "Employees read own released slips" on public.payroll_slips for select to authenticated
  using (employee_id = public.current_employee_id() and public.payroll_run_is_released(run_id));
drop policy if exists "Payroll managers read slip lines" on public.payroll_slip_lines;
create policy "Payroll managers read slip lines" on public.payroll_slip_lines for select to authenticated using (public.is_payroll_manager());
drop policy if exists "Employees read own released slip lines" on public.payroll_slip_lines;
create policy "Employees read own released slip lines" on public.payroll_slip_lines for select to authenticated
  using (public.payroll_slip_is_own_released(slip_id));
drop policy if exists "Employees read released run periods" on public.payroll_runs;
create policy "Employees read released run periods" on public.payroll_runs for select to authenticated
  using (status in ('approved', 'paid') and public.payroll_employee_in_run(id));

grant select, insert, update, delete on public.payroll_components, public.employee_salary_items, public.payroll_runs to authenticated;
grant select on public.payroll_slips, public.payroll_slip_lines to authenticated;
revoke all on public.payroll_components, public.employee_salary_items, public.payroll_runs, public.payroll_slips, public.payroll_slip_lines from anon;

-- Starter components; amounts are set by the school (BPJS employee shares use the statutory %).
insert into public.payroll_components (code, name, kind, calc, default_amount, sort_order) values
  ('gaji_pokok', 'Gaji Pokok', 'earning', 'fixed', 0, 1),
  ('tunjangan_jabatan', 'Tunjangan Jabatan', 'earning', 'fixed', 0, 2),
  ('tunjangan_transport', 'Tunjangan Transport (per hari hadir)', 'earning', 'per_attendance_day', 0, 3),
  ('uang_makan', 'Uang Makan (per hari hadir)', 'earning', 'per_attendance_day', 0, 4),
  ('lembur', 'Lembur (per jam)', 'earning', 'per_overtime_hour', 0, 5),
  ('potongan_terlambat', 'Potongan Keterlambatan (per menit)', 'deduction', 'per_late_minute', 0, 1),
  ('potongan_alpa', 'Potongan Tidak Hadir (per hari)', 'deduction', 'per_absent_day', 0, 2),
  ('bpjs_kesehatan', 'BPJS Kesehatan (1% gaji pokok)', 'deduction', 'percent_of_base', 1, 3),
  ('bpjs_jht', 'BPJS Ketenagakerjaan JHT (2% gaji pokok)', 'deduction', 'percent_of_base', 2, 4)
on conflict (code) do nothing;

notify pgrst, 'reload schema';
