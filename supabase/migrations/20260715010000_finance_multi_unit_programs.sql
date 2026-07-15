-- Multi-unit finance: unit tariffs, programs, non-student receipts, and scoped access.

create table if not exists public.finance_programs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  category_id uuid references public.finance_categories(id) on delete set null,
  code text not null,
  name text not null,
  program_type text not null default 'additional' check (program_type in ('extracurricular', 'additional', 'donation', 'facility', 'grant', 'other')),
  description text,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code)
);

create table if not exists public.finance_fee_rates (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  category_id uuid not null references public.finance_categories(id) on delete restrict,
  program_id uuid references public.finance_programs(id) on delete set null,
  name text not null,
  grade_level integer check (grade_level is null or grade_level > 0),
  audience text not null default 'all' check (audience in ('all', 'internal', 'external')),
  billing_cycle text not null default 'once' check (billing_cycle in ('once', 'monthly', 'semester', 'annual', 'program')),
  amount numeric not null check (amount >= 0),
  effective_from date,
  effective_to date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_receipts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  category_id uuid not null references public.finance_categories(id) on delete restrict,
  program_id uuid references public.finance_programs(id) on delete set null,
  cash_account_id uuid not null references public.finance_cash_accounts(id) on delete restrict,
  receipt_number text not null,
  receipt_date date not null default current_date,
  payer_name text,
  description text not null,
  amount numeric not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'transfer', 'qris', 'virtual_account')),
  reference_number text,
  status text not null default 'posted' check (status in ('posted', 'void')),
  recorded_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_number)
);

alter table public.student_invoices
  add column if not exists program_id uuid references public.finance_programs(id) on delete set null,
  add column if not exists fee_rate_id uuid references public.finance_fee_rates(id) on delete set null;

alter table public.school_expenses
  add column if not exists program_id uuid references public.finance_programs(id) on delete set null;

alter table public.finance_budgets
  add column if not exists program_id uuid references public.finance_programs(id) on delete set null;

create index if not exists finance_programs_unit_year_idx on public.finance_programs(unit_id, academic_year_id, is_active);
create index if not exists finance_fee_rates_unit_year_idx on public.finance_fee_rates(unit_id, academic_year_id, is_active);
create index if not exists finance_fee_rates_program_idx on public.finance_fee_rates(program_id);
create index if not exists finance_receipts_unit_year_date_idx on public.finance_receipts(unit_id, academic_year_id, receipt_date desc);
create index if not exists student_invoices_program_idx on public.student_invoices(program_id);
create index if not exists school_expenses_program_idx on public.school_expenses(program_id);
create index if not exists finance_budgets_program_idx on public.finance_budgets(program_id);

alter table public.finance_programs enable row level security;
alter table public.finance_fee_rates enable row level security;
alter table public.finance_receipts enable row level security;

create or replace function public.finance_has_global_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('super_admin')
    or public.has_role('ketua_yayasan')
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.unit_id is null
        and r.name in ('admin_keuangan', 'kepala_tu')
    )
    or exists (
      select 1
      from public.employees e
      where e.user_id = auth.uid()
        and e.status = 'active'
        and e.unit_id is null
        and (lower(coalesce(e.position, '')) like '%bendahara%' or lower(coalesce(e.position, '')) like '%keuangan%')
    );
$$;

create or replace function public.finance_can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_finance()
    and (
      public.finance_has_global_access()
      or (
        target_unit_id is not null
        and (
          exists (
            select 1 from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.unit_id = target_unit_id
              and r.name in ('admin_keuangan', 'kepala_tu', 'kepsek')
          )
          or exists (
            select 1 from public.employees e
            where e.user_id = auth.uid()
              and e.status = 'active'
              and e.unit_id = target_unit_id
              and (lower(coalesce(e.position, '')) like '%bendahara%' or lower(coalesce(e.position, '')) like '%keuangan%')
          )
        )
      )
    );
$$;

-- Replace broad finance policies with unit-aware policies. Global master rows remain readable.
drop policy if exists "Finance staff manage categories" on public.finance_categories;
drop policy if exists "Finance staff manage invoices" on public.student_invoices;
drop policy if exists "Finance staff manage payments" on public.payment_transactions;
drop policy if exists "Finance staff manage expenses" on public.school_expenses;
drop policy if exists "Finance staff manage records" on public.finance_cash_accounts;
drop policy if exists "Finance staff manage records" on public.finance_accounts;
drop policy if exists "Finance staff manage records" on public.finance_budgets;
drop policy if exists "Finance staff manage records" on public.finance_journal_entries;
drop policy if exists "Finance staff manage records" on public.finance_journal_lines;
drop policy if exists "Finance staff read students" on public.students;
drop policy if exists "Finance staff manage scoped categories" on public.finance_categories;
drop policy if exists "Finance staff read shared categories" on public.finance_categories;
drop policy if exists "Finance staff manage scoped invoices" on public.student_invoices;
drop policy if exists "Finance staff manage scoped payments" on public.payment_transactions;
drop policy if exists "Finance staff manage scoped expenses" on public.school_expenses;
drop policy if exists "Finance staff manage scoped cash accounts" on public.finance_cash_accounts;
drop policy if exists "Finance staff read shared cash accounts" on public.finance_cash_accounts;
drop policy if exists "Finance staff manage scoped accounts" on public.finance_accounts;
drop policy if exists "Finance staff read shared accounts" on public.finance_accounts;
drop policy if exists "Finance staff manage scoped budgets" on public.finance_budgets;
drop policy if exists "Finance staff manage scoped journals" on public.finance_journal_entries;
drop policy if exists "Finance staff manage scoped journal lines" on public.finance_journal_lines;
drop policy if exists "Finance staff read scoped students" on public.students;

create policy "Finance staff manage scoped categories" on public.finance_categories for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff read shared categories" on public.finance_categories for select to authenticated
  using (unit_id is null and public.can_manage_finance());
create policy "Finance staff manage scoped invoices" on public.student_invoices for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff manage scoped payments" on public.payment_transactions for all to authenticated
  using (exists (select 1 from public.student_invoices i where i.id = invoice_id and public.finance_can_access_unit(i.unit_id)))
  with check (exists (select 1 from public.student_invoices i where i.id = invoice_id and public.finance_can_access_unit(i.unit_id)));
create policy "Finance staff manage scoped expenses" on public.school_expenses for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff manage scoped cash accounts" on public.finance_cash_accounts for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff read shared cash accounts" on public.finance_cash_accounts for select to authenticated
  using (unit_id is null and public.can_manage_finance());
create policy "Finance staff manage scoped accounts" on public.finance_accounts for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff read shared accounts" on public.finance_accounts for select to authenticated
  using (unit_id is null and public.can_manage_finance());
create policy "Finance staff manage scoped budgets" on public.finance_budgets for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff manage scoped journals" on public.finance_journal_entries for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff manage scoped journal lines" on public.finance_journal_lines for all to authenticated
  using (exists (select 1 from public.finance_journal_entries j where j.id = journal_entry_id and public.finance_can_access_unit(j.unit_id)))
  with check (exists (select 1 from public.finance_journal_entries j where j.id = journal_entry_id and public.finance_can_access_unit(j.unit_id)));
create policy "Finance staff read scoped students" on public.students for select to authenticated
  using (public.finance_can_access_unit(unit_id));

drop policy if exists "Finance staff manage scoped programs" on public.finance_programs;
drop policy if exists "Finance staff manage scoped fee rates" on public.finance_fee_rates;
drop policy if exists "Finance staff manage scoped receipts" on public.finance_receipts;
create policy "Finance staff manage scoped programs" on public.finance_programs for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff manage scoped fee rates" on public.finance_fee_rates for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));
create policy "Finance staff manage scoped receipts" on public.finance_receipts for all to authenticated
  using (public.finance_can_access_unit(unit_id)) with check (public.finance_can_access_unit(unit_id));

create or replace function public.finance_post_receipt_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_cash uuid;
  v_income uuid;
  v_account_code text;
  v_cash_code text;
begin
  if new.status <> 'posted' or (tg_op = 'UPDATE' and old.status = 'posted') then return new; end if;
  select account_code into v_account_code from public.finance_categories where id = new.category_id;
  v_cash_code := case when new.payment_method = 'cash' then '1101' else '1102' end;
  select id into v_cash from public.finance_accounts where code = v_cash_code and (unit_id = new.unit_id or unit_id is null) order by (unit_id = new.unit_id) desc limit 1;
  select id into v_income from public.finance_accounts where code = coalesce(v_account_code, '4101') and (unit_id = new.unit_id or unit_id is null) order by (unit_id = new.unit_id) desc limit 1;
  if v_cash is null or v_income is null then return new; end if;
  insert into public.finance_journal_entries (unit_id, academic_year_id, entry_number, entry_date, description, source_type, source_id, status, posted_at)
  values (new.unit_id, new.academic_year_id, 'RCV-' || left(new.id::text, 8), new.receipt_date, new.description, 'receipt', new.id, 'draft', null)
  on conflict do nothing returning id into v_entry_id;
  if v_entry_id is not null then
    insert into public.finance_journal_lines (journal_entry_id, account_id, description, debit, credit)
    values (v_entry_id, v_cash, new.description, new.amount, 0), (v_entry_id, v_income, new.description, 0, new.amount);
    update public.finance_journal_entries set status = 'posted', posted_at = now() where id = v_entry_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_finance_post_receipt_journal on public.finance_receipts;
create trigger trigger_finance_post_receipt_journal
  after insert or update of status on public.finance_receipts
  for each row execute function public.finance_post_receipt_journal();

drop trigger if exists trigger_finance_audit_receipts on public.finance_receipts;
create trigger trigger_finance_audit_receipts after insert or update or delete on public.finance_receipts
  for each row execute function public.finance_capture_audit();

notify pgrst, 'reload schema';
