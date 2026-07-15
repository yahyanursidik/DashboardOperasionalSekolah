-- Finance and treasury upgrade for multi-unit Islamic schools.

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(), unit_id uuid references public.units(id),
  type text not null check (type in ('income', 'expense')), name text not null, description text,
  is_recurring boolean default false, default_amount numeric default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.student_invoices (
  id uuid primary key default gen_random_uuid(), student_id uuid references public.students(id) on delete cascade,
  external_student_id uuid references public.external_students(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id), academic_year_id uuid references public.academic_years(id),
  unit_id uuid references public.units(id), title text not null, month text, amount numeric not null default 0,
  discount numeric not null default 0, paid_amount numeric not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'cancelled')),
  due_date date, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.student_invoices(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade, external_student_id uuid references public.external_students(id) on delete cascade,
  amount_paid numeric not null, payment_method text not null check (payment_method in ('cash', 'transfer', 'qris', 'virtual_account')),
  payment_date date not null default current_date, reference_number text, proof_image_url text,
  status text not null default 'pending_verification' check (status in ('pending_verification', 'verified', 'rejected')),
  verified_by uuid references public.employees(id), verified_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.school_expenses (
  id uuid primary key default gen_random_uuid(), unit_id uuid references public.units(id),
  category_id uuid not null references public.finance_categories(id), academic_year_id uuid references public.academic_years(id),
  amount numeric not null, expense_date date not null default current_date, title text not null, description text,
  recorded_by uuid references public.employees(id), proof_image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.finance_categories enable row level security;
alter table public.student_invoices enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.school_expenses enable row level security;

alter table public.finance_categories
  add column if not exists account_code text,
  add column if not exists fund_type text not null default 'operational',
  add column if not exists is_restricted boolean not null default false,
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'finance_categories_fund_type_check'
  ) then
    alter table public.finance_categories
      add constraint finance_categories_fund_type_check
      check (fund_type in ('operational', 'tuition', 'bos', 'ziswaf', 'scholarship', 'building', 'activity'));
  end if;
end $$;

alter table public.student_invoices
  add column if not exists invoice_number text,
  add column if not exists issue_date date not null default current_date,
  add column if not exists billing_period_start date,
  add column if not exists billing_period_end date;

alter table public.payment_transactions
  add column if not exists receipt_number text,
  add column if not exists cash_account_id uuid,
  add column if not exists rejection_reason text;

alter table public.school_expenses
  add column if not exists status text not null default 'draft',
  add column if not exists vendor_name text,
  add column if not exists invoice_number text,
  add column if not exists payment_method text,
  add column if not exists reference_number text,
  add column if not exists cash_account_id uuid,
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_by uuid references public.employees(id),
  add column if not exists approved_at timestamptz,
  add column if not exists approval_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'school_expenses_status_check'
  ) then
    alter table public.school_expenses
      add constraint school_expenses_status_check
      check (status in ('draft', 'submitted', 'approved', 'rejected', 'paid', 'void'));
  end if;
end $$;

create table if not exists public.finance_cash_accounts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id),
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('cash', 'bank', 'qris', 'virtual_account')),
  bank_name text,
  account_number text,
  account_holder text,
  opening_balance numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code)
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id),
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
  normal_balance text not null check (normal_balance in ('debit', 'credit')),
  fund_type text not null default 'operational',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code)
);

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id),
  academic_year_id uuid references public.academic_years(id) not null,
  account_id uuid references public.finance_accounts(id),
  category_id uuid references public.finance_categories(id),
  name text not null,
  period_type text not null default 'annual' check (period_type in ('annual', 'semester', 'monthly', 'program')),
  planned_amount numeric not null default 0 check (planned_amount >= 0),
  notes text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_journal_entries (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id),
  academic_year_id uuid references public.academic_years(id),
  entry_number text not null unique,
  entry_date date not null default current_date,
  description text not null,
  source_type text not null default 'manual',
  source_id uuid,
  status text not null default 'draft' check (status in ('draft', 'posted', 'void')),
  created_by uuid references public.employees(id),
  posted_by uuid references public.employees(id),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.finance_journal_entries(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id),
  description text,
  debit numeric not null default 0 check (debit >= 0),
  credit numeric not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

alter table public.payment_transactions
  drop constraint if exists payment_transactions_cash_account_id_fkey;
alter table public.payment_transactions
  add constraint payment_transactions_cash_account_id_fkey
  foreign key (cash_account_id) references public.finance_cash_accounts(id);

alter table public.school_expenses
  drop constraint if exists school_expenses_cash_account_id_fkey;
alter table public.school_expenses
  add constraint school_expenses_cash_account_id_fkey
  foreign key (cash_account_id) references public.finance_cash_accounts(id);

create index if not exists idx_finance_budgets_year_unit on public.finance_budgets(academic_year_id, unit_id);
create index if not exists idx_finance_journal_entries_date on public.finance_journal_entries(entry_date, unit_id);
create index if not exists idx_finance_journal_lines_entry on public.finance_journal_lines(journal_entry_id);
create unique index if not exists idx_finance_journal_source on public.finance_journal_entries(source_type, source_id) where source_id is not null and status <> 'void';
create index if not exists idx_school_expenses_status on public.school_expenses(status);
create unique index if not exists idx_student_invoices_number on public.student_invoices(invoice_number) where invoice_number is not null;
create unique index if not exists idx_payment_receipt_number on public.payment_transactions(receipt_number) where receipt_number is not null;

alter table public.finance_cash_accounts enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_journal_entries enable row level security;
alter table public.finance_journal_lines enable row level security;

create or replace function public.can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role('super_admin')
    or public.has_role('ketua_yayasan')
    or public.has_role('kepsek')
    or public.has_role('kepala_tu')
    or public.has_role('admin_keuangan')
    or exists (
      select 1 from public.employees e
      where e.user_id = auth.uid()
        and e.status = 'active'
        and (lower(coalesce(e.position, '')) like '%bendahara%' or lower(coalesce(e.position, '')) like '%keuangan%')
    );
$$;

create or replace function public.get_finance_login_email_by_identifier(p_identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(e.email), '')
  from public.employees e
  where e.status = 'active'
    and (lower(btrim(e.email)) = lower(btrim(p_identifier)) or btrim(e.nik) = btrim(p_identifier))
    and (
      lower(coalesce(e.position, '')) like '%bendahara%'
      or lower(coalesce(e.position, '')) like '%keuangan%'
      or exists (
        select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
        where ur.user_id = e.user_id and r.name in ('super_admin', 'ketua_yayasan', 'kepala_tu', 'admin_keuangan')
      )
    )
  limit 1;
$$;

grant execute on function public.get_finance_login_email_by_identifier(text) to anon, authenticated;

drop policy if exists "Allow authenticated full access to finance_categories" on public.finance_categories;
drop policy if exists "Allow authenticated full access to student_invoices" on public.student_invoices;
drop policy if exists "Allow authenticated full access to payment_transactions" on public.payment_transactions;
drop policy if exists "Allow authenticated full access to school_expenses" on public.school_expenses;
drop policy if exists "Finance staff manage categories" on public.finance_categories;
drop policy if exists "Finance staff manage invoices" on public.student_invoices;
drop policy if exists "Parents read linked invoices" on public.student_invoices;
drop policy if exists "Finance staff manage payments" on public.payment_transactions;
drop policy if exists "Parents read linked payments" on public.payment_transactions;
drop policy if exists "Parents submit linked payments" on public.payment_transactions;
drop policy if exists "Finance staff manage expenses" on public.school_expenses;
drop policy if exists "Finance staff read students" on public.students;

create policy "Finance staff manage categories" on public.finance_categories for all to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance());
create policy "Finance staff manage invoices" on public.student_invoices for all to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance());
create policy "Parents read linked invoices" on public.student_invoices for select to authenticated using (
  student_id in (
    select spl.student_id from public.student_parent_links spl
    join public.parents p on p.id = spl.parent_id
    where p.user_id = auth.uid() and coalesce(spl.can_access_parent_portal, true)
  )
);
create policy "Finance staff manage payments" on public.payment_transactions for all to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance());
create policy "Parents read linked payments" on public.payment_transactions for select to authenticated using (
  student_id in (
    select spl.student_id from public.student_parent_links spl
    join public.parents p on p.id = spl.parent_id
    where p.user_id = auth.uid() and coalesce(spl.can_access_parent_portal, true)
  )
);
create policy "Parents submit linked payments" on public.payment_transactions for insert to authenticated with check (
  status = 'pending_verification'
  and student_id in (
    select spl.student_id from public.student_parent_links spl
    join public.parents p on p.id = spl.parent_id
    where p.user_id = auth.uid() and coalesce(spl.can_access_parent_portal, true)
  )
);
create policy "Finance staff manage expenses" on public.school_expenses for all to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance());
create policy "Finance staff read students" on public.students for select to authenticated using (public.can_manage_finance());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'finance_cash_accounts', 'finance_accounts', 'finance_budgets',
    'finance_journal_entries', 'finance_journal_lines'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'Finance staff manage records'
    ) then
      execute format(
        'create policy "Finance staff manage records" on public.%I for all to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance())',
        table_name
      );
    end if;
  end loop;
end $$;

insert into public.finance_cash_accounts (code, name, account_type, bank_name, account_holder, opening_balance)
values
  ('KAS-UTAMA', 'Kas Tunai Utama', 'cash', null, null, 0),
  ('BANK-SYARIAH', 'Rekening Operasional Syariah', 'bank', 'Bank Syariah Indonesia', 'Yayasan/Sekolah', 0)
on conflict do nothing;

insert into public.finance_accounts (code, name, account_type, normal_balance, fund_type, description)
values
  ('1101', 'Kas Tunai', 'asset', 'debit', 'operational', 'Kas operasional bendahara'),
  ('1102', 'Bank Syariah', 'asset', 'debit', 'operational', 'Rekening bank utama sekolah'),
  ('1201', 'Piutang Pendidikan', 'asset', 'debit', 'tuition', 'Tagihan pendidikan yang belum diterima'),
  ('2101', 'Utang Usaha', 'liability', 'credit', 'operational', 'Kewajiban kepada pemasok'),
  ('3101', 'Dana Bersih Yayasan', 'equity', 'credit', 'operational', 'Saldo dana bersih lembaga'),
  ('4101', 'Pendapatan SPP', 'income', 'credit', 'tuition', 'Pendapatan SPP dan layanan pendidikan'),
  ('4201', 'Dana BOS', 'income', 'credit', 'bos', 'Penerimaan dana BOS'),
  ('4301', 'Dana ZISWAF', 'income', 'credit', 'ziswaf', 'Dana zakat, infak, sedekah, dan wakaf'),
  ('5101', 'Beban SDM', 'expense', 'debit', 'operational', 'Gaji, honor, dan pengembangan SDM'),
  ('5201', 'Beban Pembelajaran', 'expense', 'debit', 'operational', 'Kegiatan belajar dan bahan ajar'),
  ('5301', 'Beban Sarpras', 'expense', 'debit', 'building', 'Pemeliharaan sarana dan prasarana')
on conflict do nothing;

update public.finance_categories set account_code = '4101', fund_type = 'tuition' where account_code is null and type = 'income' and name ilike '%SPP%';
update public.finance_categories set account_code = '5101' where account_code is null and type = 'expense' and (name ilike '%Gaji%' or name ilike '%Honor%');
update public.finance_categories set account_code = '5201' where account_code is null and type = 'expense' and (name ilike '%ATK%' or name ilike '%Pembelajaran%');
update public.finance_categories set account_code = '5301', fund_type = 'building' where account_code is null and type = 'expense' and (name ilike '%Gedung%' or name ilike '%Pemeliharaan%');

create or replace function public.update_invoice_status_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid numeric;
  v_net numeric;
begin
  select coalesce(sum(amount_paid), 0) into v_paid from public.payment_transactions where invoice_id = v_invoice_id and status = 'verified';
  select greatest(0, amount - coalesce(discount, 0)) into v_net from public.student_invoices where id = v_invoice_id;
  update public.student_invoices set paid_amount = v_paid, status = case when v_paid >= v_net then 'paid' when v_paid > 0 then 'partial' else 'unpaid' end where id = v_invoice_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_update_invoice_status on public.payment_transactions;
create trigger trigger_update_invoice_status after insert or update or delete on public.payment_transactions for each row execute function public.update_invoice_status_on_payment();

create or replace function public.finance_post_invoice_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_receivable uuid;
  v_income uuid;
  v_account_code text;
  v_net numeric;
begin
  v_net := greatest(0, new.amount - coalesce(new.discount, 0));
  if v_net = 0 then return new; end if;
  select account_code into v_account_code from public.finance_categories where id = new.category_id;
  select id into v_receivable from public.finance_accounts where code = '1201' and (unit_id = new.unit_id or unit_id is null) order by (unit_id = new.unit_id) desc limit 1;
  select id into v_income from public.finance_accounts where code = coalesce(v_account_code, '4101') and (unit_id = new.unit_id or unit_id is null) order by (unit_id = new.unit_id) desc limit 1;
  if v_receivable is null or v_income is null then return new; end if;
  insert into public.finance_journal_entries (unit_id, academic_year_id, entry_number, entry_date, description, source_type, source_id, status, posted_at)
  values (new.unit_id, new.academic_year_id, 'INV-' || left(new.id::text, 8), coalesce(new.issue_date, current_date), new.title, 'invoice', new.id, 'draft', null)
  on conflict do nothing returning id into v_entry_id;
  if v_entry_id is not null then
    insert into public.finance_journal_lines (journal_entry_id, account_id, description, debit, credit)
    values (v_entry_id, v_receivable, new.title, v_net, 0), (v_entry_id, v_income, new.title, 0, v_net);
    update public.finance_journal_entries set status = 'posted', posted_at = now() where id = v_entry_id;
  end if;
  return new;
end;
$$;

create or replace function public.finance_post_payment_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_cash uuid;
  v_receivable uuid;
  v_unit uuid;
  v_year uuid;
  v_title text;
  v_cash_code text;
begin
  if new.status <> 'verified' or (tg_op = 'UPDATE' and old.status = 'verified') then return new; end if;
  select unit_id, academic_year_id, title into v_unit, v_year, v_title from public.student_invoices where id = new.invoice_id;
  v_cash_code := case when new.payment_method = 'cash' then '1101' else '1102' end;
  select id into v_cash from public.finance_accounts where code = v_cash_code and (unit_id = v_unit or unit_id is null) order by (unit_id = v_unit) desc limit 1;
  select id into v_receivable from public.finance_accounts where code = '1201' and (unit_id = v_unit or unit_id is null) order by (unit_id = v_unit) desc limit 1;
  if v_cash is null or v_receivable is null then return new; end if;
  insert into public.finance_journal_entries (unit_id, academic_year_id, entry_number, entry_date, description, source_type, source_id, status, posted_at)
  values (v_unit, v_year, 'PAY-' || left(new.id::text, 8), new.payment_date, 'Pembayaran ' || coalesce(v_title, 'tagihan siswa'), 'payment', new.id, 'draft', null)
  on conflict do nothing returning id into v_entry_id;
  if v_entry_id is not null then
    insert into public.finance_journal_lines (journal_entry_id, account_id, description, debit, credit)
    values (v_entry_id, v_cash, v_title, new.amount_paid, 0), (v_entry_id, v_receivable, v_title, 0, new.amount_paid);
    update public.finance_journal_entries set status = 'posted', posted_at = now() where id = v_entry_id;
  end if;
  return new;
end;
$$;

create or replace function public.finance_post_expense_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_cash uuid;
  v_expense uuid;
  v_account_code text;
  v_cash_code text;
begin
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then return new; end if;
  select account_code into v_account_code from public.finance_categories where id = new.category_id;
  v_cash_code := case when new.payment_method = 'cash' then '1101' else '1102' end;
  select id into v_cash from public.finance_accounts where code = v_cash_code and (unit_id = new.unit_id or unit_id is null) order by (unit_id = new.unit_id) desc limit 1;
  select id into v_expense from public.finance_accounts where code = coalesce(v_account_code, '5301') and (unit_id = new.unit_id or unit_id is null) order by (unit_id = new.unit_id) desc limit 1;
  if v_cash is null or v_expense is null then return new; end if;
  insert into public.finance_journal_entries (unit_id, academic_year_id, entry_number, entry_date, description, source_type, source_id, status, posted_at)
  values (new.unit_id, new.academic_year_id, 'EXP-' || left(new.id::text, 8), new.expense_date, new.title, 'expense', new.id, 'draft', null)
  on conflict do nothing returning id into v_entry_id;
  if v_entry_id is not null then
    insert into public.finance_journal_lines (journal_entry_id, account_id, description, debit, credit)
    values (v_entry_id, v_expense, new.title, new.amount, 0), (v_entry_id, v_cash, new.title, 0, new.amount);
    update public.finance_journal_entries set status = 'posted', posted_at = now() where id = v_entry_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_finance_post_invoice_journal on public.student_invoices;
create trigger trigger_finance_post_invoice_journal after insert on public.student_invoices for each row execute function public.finance_post_invoice_journal();
drop trigger if exists trigger_finance_post_payment_journal on public.payment_transactions;
create trigger trigger_finance_post_payment_journal after insert or update of status on public.payment_transactions for each row execute function public.finance_post_payment_journal();
drop trigger if exists trigger_finance_post_expense_journal on public.school_expenses;
create trigger trigger_finance_post_expense_journal after insert or update of status on public.school_expenses for each row execute function public.finance_post_expense_journal();

create table if not exists public.finance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists finance_audit_logs_entity_idx on public.finance_audit_logs(entity_type, entity_id, created_at desc);
alter table public.finance_audit_logs enable row level security;
drop policy if exists "Finance staff read audit logs" on public.finance_audit_logs;
create policy "Finance staff read audit logs" on public.finance_audit_logs for select to authenticated using (public.can_manage_finance());

create or replace function public.finance_capture_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.finance_audit_logs (entity_type, entity_id, action, old_data, new_data, changed_by)
  values (
    tg_table_name,
    v_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.finance_protect_posted_journal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'posted' then
    raise exception 'Jurnal yang sudah diposting tidak dapat diubah atau dihapus. Buat jurnal pembalik untuk koreksi.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trigger_finance_protect_posted_journal on public.finance_journal_entries;
create trigger trigger_finance_protect_posted_journal before update or delete on public.finance_journal_entries for each row execute function public.finance_protect_posted_journal();

create or replace function public.finance_protect_posted_lines()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_status text;
begin
  v_entry_id := case when tg_op = 'DELETE' then old.journal_entry_id else new.journal_entry_id end;
  select status into v_status from public.finance_journal_entries where id = v_entry_id;
  if v_status = 'posted' then
    raise exception 'Baris jurnal yang sudah diposting tidak dapat diubah. Buat jurnal pembalik untuk koreksi.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trigger_finance_protect_posted_lines on public.finance_journal_lines;
create trigger trigger_finance_protect_posted_lines before insert or update or delete on public.finance_journal_lines for each row execute function public.finance_protect_posted_lines();

drop trigger if exists trigger_finance_audit_invoices on public.student_invoices;
create trigger trigger_finance_audit_invoices after insert or update or delete on public.student_invoices for each row execute function public.finance_capture_audit();
drop trigger if exists trigger_finance_audit_payments on public.payment_transactions;
create trigger trigger_finance_audit_payments after insert or update or delete on public.payment_transactions for each row execute function public.finance_capture_audit();
drop trigger if exists trigger_finance_audit_expenses on public.school_expenses;
create trigger trigger_finance_audit_expenses after insert or update or delete on public.school_expenses for each row execute function public.finance_capture_audit();
drop trigger if exists trigger_finance_audit_budgets on public.finance_budgets;
create trigger trigger_finance_audit_budgets after insert or update or delete on public.finance_budgets for each row execute function public.finance_capture_audit();
drop trigger if exists trigger_finance_audit_journals on public.finance_journal_entries;
create trigger trigger_finance_audit_journals after insert or update or delete on public.finance_journal_entries for each row execute function public.finance_capture_audit();
drop trigger if exists trigger_finance_audit_journal_lines on public.finance_journal_lines;
create trigger trigger_finance_audit_journal_lines after insert or update or delete on public.finance_journal_lines for each row execute function public.finance_capture_audit();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated upload payment proofs" on storage.objects;
drop policy if exists "Authenticated read payment proofs" on storage.objects;
drop policy if exists "Owners upload payment proofs" on storage.objects;
drop policy if exists "Owners and finance read payment proofs" on storage.objects;
drop policy if exists "Owners delete failed payment proofs" on storage.objects;
create policy "Owners upload payment proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (owner_id = auth.uid()::text or public.can_manage_finance()));
create policy "Owners and finance read payment proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (owner_id = auth.uid()::text or public.can_manage_finance()));
create policy "Owners delete failed payment proofs" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-proofs' and owner_id = auth.uid()::text);

notify pgrst, 'reload schema';
