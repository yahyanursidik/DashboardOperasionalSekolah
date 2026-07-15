-- Sarpras quality management: multi-unit lifecycle, maintenance, and stocktake.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete set null,
  code text unique,
  name text not null,
  type text not null default 'Ruang Kelas',
  capacity integer not null default 1 check (capacity > 0),
  location text,
  status text not null default 'Aktif',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_schedules (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  recurrence_type text not null default 'Pekanan',
  day_of_week text,
  specific_date date,
  date_of_month integer,
  start_time time not null,
  end_time time not null,
  activity_name text not null,
  academic_year text,
  status text not null default 'Aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table if exists public.assets
  add column if not exists room_id uuid references public.rooms(id) on delete set null,
  add column if not exists funding_source text,
  add column if not exists vendor text,
  add column if not exists warranty_until date,
  add column if not exists useful_life_years integer check (useful_life_years is null or useful_life_years > 0),
  add column if not exists responsible_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists last_stocktake_at timestamptz,
  add column if not exists next_maintenance_date date,
  add column if not exists disposal_reason text,
  add column if not exists disposed_at timestamptz;

alter table if exists public.rooms
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists responsible_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists condition text not null default 'Baik',
  add column if not exists last_inspected_at timestamptz,
  add column if not exists safety_notes text;

alter table if exists public.room_schedules
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists requester_id uuid references public.employees(id) on delete set null,
  add column if not exists purpose text,
  add column if not exists approved_by uuid references public.employees(id) on delete set null;

alter table if exists public.asset_loans
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists actual_return_date timestamptz,
  add column if not exists condition_out text,
  add column if not exists condition_in text,
  add column if not exists return_notes text;

alter table if exists public.procurements
  add column if not exists needed_by date,
  add column if not exists priority text not null default 'normal',
  add column if not exists budget_source text,
  add column if not exists vendor text,
  add column if not exists approved_at timestamptz,
  add column if not exists ordered_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists received_by uuid references public.employees(id) on delete set null;

alter table if exists public.procurements drop constraint if exists procurements_status_check;
alter table if exists public.procurements
  add constraint procurements_status_check check (status in ('Menunggu', 'Ditinjau', 'Disetujui', 'Dipesan', 'Diterima', 'Ditolak', 'Selesai'));
alter table if exists public.procurements drop constraint if exists procurements_priority_check;
alter table if exists public.procurements
  add constraint procurements_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));

create table if not exists public.asset_maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique,
  unit_id uuid references public.units(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  operational_report_id uuid unique references public.staff_operational_reports(id) on delete set null,
  reported_by uuid references public.employees(id) on delete set null,
  assigned_to uuid references public.employees(id) on delete set null,
  title text not null,
  description text not null,
  location text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'reported' check (status in ('reported', 'verified', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'rejected')),
  inspection_notes text,
  resolution_notes text,
  estimated_cost numeric not null default 0 check (estimated_cost >= 0),
  actual_cost numeric not null default 0 check (actual_cost >= 0),
  expense_id uuid references public.school_expenses(id) on delete set null,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_stocktakes (
  id uuid primary key default gen_random_uuid(),
  stocktake_number text unique,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  scope_location text,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'cancelled')),
  started_by uuid references public.employees(id) on delete set null,
  completed_by uuid references public.employees(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_stocktake_items (
  id uuid primary key default gen_random_uuid(),
  stocktake_id uuid not null references public.asset_stocktakes(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  expected_location text,
  actual_location text,
  expected_condition text,
  actual_condition text,
  finding text not null default 'unchecked' check (finding in ('unchecked', 'found', 'moved', 'damaged', 'missing')),
  checked_by uuid references public.employees(id) on delete set null,
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stocktake_id, asset_id)
);

create index if not exists assets_unit_status_idx on public.assets(unit_id, status);
create index if not exists assets_room_idx on public.assets(room_id);
create index if not exists asset_loans_unit_status_idx on public.asset_loans(unit_id, status, end_date);
create index if not exists procurements_unit_status_idx on public.procurements(unit_id, status, created_at desc);
create index if not exists maintenance_unit_status_idx on public.asset_maintenance_requests(unit_id, status, priority, created_at desc);
create index if not exists maintenance_asset_idx on public.asset_maintenance_requests(asset_id, created_at desc);
create index if not exists stocktakes_unit_status_idx on public.asset_stocktakes(unit_id, status, created_at desc);
create index if not exists stocktake_items_session_idx on public.asset_stocktake_items(stocktake_id, finding);

update public.asset_loans loan set unit_id = asset.unit_id
from public.assets asset where loan.asset_id = asset.id and loan.unit_id is null;
update public.room_schedules schedule set unit_id = room.unit_id
from public.rooms room where schedule.room_id = room.id and schedule.unit_id is null;

create or replace function public.set_sarpras_derived_unit()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'asset_loans' and new.unit_id is null then
    select unit_id into new.unit_id from public.assets where id = new.asset_id;
  elsif tg_table_name = 'room_schedules' and new.unit_id is null then
    select unit_id into new.unit_id from public.rooms where id = new.room_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_asset_loan_unit on public.asset_loans;
create trigger set_asset_loan_unit before insert or update on public.asset_loans
for each row execute function public.set_sarpras_derived_unit();
drop trigger if exists set_room_schedule_unit on public.room_schedules;
create trigger set_room_schedule_unit before insert or update on public.room_schedules
for each row execute function public.set_sarpras_derived_unit();

create or replace function public.sarpras_is_manager(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.auth_user_roles() scope
    where scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit')
      and (scope.role_name in ('super_admin', 'ketua_yayasan') or scope.unit_id is null or (target_unit_id is not null and scope.unit_id = target_unit_id))
  );
$$;

create or replace function public.set_sarpras_numbers()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'asset_maintenance_requests' and new.ticket_number is null then
    new.ticket_number := 'MNT-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  elsif tg_table_name = 'asset_stocktakes' and new.stocktake_number is null then
    new.stocktake_number := 'SO-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

drop trigger if exists set_maintenance_ticket_number on public.asset_maintenance_requests;
create trigger set_maintenance_ticket_number before insert on public.asset_maintenance_requests
for each row execute function public.set_sarpras_numbers();
drop trigger if exists set_stocktake_number on public.asset_stocktakes;
create trigger set_stocktake_number before insert on public.asset_stocktakes
for each row execute function public.set_sarpras_numbers();
drop trigger if exists handle_asset_maintenance_updated_at on public.asset_maintenance_requests;
create trigger handle_asset_maintenance_updated_at before update on public.asset_maintenance_requests
for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_asset_stocktakes_updated_at on public.asset_stocktakes;
create trigger handle_asset_stocktakes_updated_at before update on public.asset_stocktakes
for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_asset_stocktake_items_updated_at on public.asset_stocktake_items;
create trigger handle_asset_stocktake_items_updated_at before update on public.asset_stocktake_items
for each row execute procedure public.handle_updated_at();

create or replace function public.create_maintenance_from_staff_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category = 'facility_damage' then
    insert into public.asset_maintenance_requests (
      unit_id, operational_report_id, reported_by, title, description, location, priority
    ) values (
      new.unit_id, new.id, new.employee_id, new.title, new.description, new.location, new.priority
    ) on conflict (operational_report_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_maintenance_from_staff_report on public.staff_operational_reports;
create trigger create_maintenance_from_staff_report after insert on public.staff_operational_reports
for each row execute function public.create_maintenance_from_staff_report();

insert into public.asset_maintenance_requests (unit_id, operational_report_id, reported_by, title, description, location, priority, status)
select report.unit_id, report.id, report.employee_id, report.title, report.description, report.location, report.priority,
  case when report.status in ('resolved', 'closed') then 'completed' else 'reported' end
from public.staff_operational_reports report
where report.category = 'facility_damage'
on conflict (operational_report_id) do nothing;

create or replace function public.sarpras_set_loan_status(
  target_loan_id uuid,
  target_status text,
  return_condition text default null,
  return_note text default null
) returns public.asset_loans language plpgsql security definer set search_path = public as $$
declare v_loan public.asset_loans; v_asset public.assets; v_employee uuid;
begin
  select * into v_loan from public.asset_loans where id = target_loan_id for update;
  if v_loan.id is null then raise exception 'LOAN_NOT_FOUND'; end if;
  select * into v_asset from public.assets where id = v_loan.asset_id for update;
  if not public.sarpras_is_manager(coalesce(v_loan.unit_id, v_asset.unit_id)) then raise exception 'SARPRAS_ACCESS_DENIED'; end if;
  select public.current_employee_id() into v_employee;
  if target_status = 'Disetujui' then
    if v_loan.status <> 'Menunggu' or v_asset.status <> 'Tersedia' then raise exception 'ASSET_NOT_AVAILABLE'; end if;
    update public.asset_loans set status = target_status, approved_by = v_employee, approved_at = now(), condition_out = v_asset.condition where id = target_loan_id returning * into v_loan;
    update public.assets set status = 'Dipinjam' where id = v_asset.id;
  elsif target_status = 'Ditolak' then
    if v_loan.status <> 'Menunggu' then raise exception 'INVALID_LOAN_TRANSITION'; end if;
    update public.asset_loans set status = target_status, approved_by = v_employee, approved_at = now(), notes = coalesce(return_note, notes) where id = target_loan_id returning * into v_loan;
  elsif target_status = 'Dikembalikan' then
    if v_loan.status <> 'Disetujui' then raise exception 'INVALID_LOAN_TRANSITION'; end if;
    update public.asset_loans set status = target_status, actual_return_date = now(), condition_in = coalesce(return_condition, v_asset.condition), return_notes = return_note where id = target_loan_id returning * into v_loan;
    update public.assets set status = case when coalesce(return_condition, condition) = 'Baik' then 'Tersedia' else 'Diperbaiki' end, condition = coalesce(return_condition, condition) where id = v_asset.id;
  else
    raise exception 'INVALID_LOAN_STATUS';
  end if;
  return v_loan;
end;
$$;

create or replace function public.start_asset_stocktake(target_unit_id uuid, target_title text, target_location text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_stocktake_id uuid; v_employee uuid;
begin
  if not public.sarpras_is_manager(target_unit_id) then raise exception 'SARPRAS_ACCESS_DENIED'; end if;
  select public.current_employee_id() into v_employee;
  insert into public.asset_stocktakes(unit_id, title, scope_location, status, started_by, started_at)
  values (target_unit_id, target_title, nullif(target_location, ''), 'in_progress', v_employee, now()) returning id into v_stocktake_id;
  insert into public.asset_stocktake_items(stocktake_id, asset_id, expected_location, expected_condition)
  select v_stocktake_id, asset.id, asset.location, asset.condition from public.assets asset
  where (target_unit_id is null or asset.unit_id = target_unit_id)
    and (target_location is null or target_location = '' or asset.location = target_location)
    and asset.status <> 'Dihapus';
  return v_stocktake_id;
end;
$$;

create or replace function public.receive_procurement_as_assets(target_procurement_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_procurement public.procurements; v_index integer; v_unit_price numeric;
begin
  select * into v_procurement from public.procurements where id = target_procurement_id for update;
  if v_procurement.id is null then raise exception 'PROCUREMENT_NOT_FOUND'; end if;
  if not public.sarpras_is_manager(v_procurement.unit_id) then raise exception 'SARPRAS_ACCESS_DENIED'; end if;
  if v_procurement.status <> 'Dipesan' then raise exception 'PROCUREMENT_NOT_ORDERED'; end if;
  v_unit_price := v_procurement.estimated_price / greatest(v_procurement.quantity, 1);
  for v_index in 1..v_procurement.quantity loop
    insert into public.assets(unit_id, code, name, category, condition, status, purchase_date, purchase_price, funding_source, vendor, notes)
    values (
      v_procurement.unit_id,
      'PRC-' || to_char(current_date, 'YYMMDD') || '-' || upper(substr(replace(v_procurement.id::text, '-', ''), 1, 6)) || '-' || lpad(v_index::text, 3, '0'),
      v_procurement.item_name, 'Lainnya', 'Baik', 'Tersedia', current_date, v_unit_price,
      coalesce(v_procurement.budget_source, 'Pengadaan sekolah'), v_procurement.vendor,
      'Diterima dari pengadaan ' || v_procurement.id::text
    );
  end loop;
  update public.procurements set status = 'Diterima', received_at = now(), received_by = public.current_employee_id() where id = v_procurement.id;
  return v_procurement.quantity;
end;
$$;

create or replace function public.complete_asset_stocktake(target_stocktake_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_session public.asset_stocktakes; v_employee uuid; v_unchecked integer;
begin
  select * into v_session from public.asset_stocktakes where id = target_stocktake_id for update;
  if not public.sarpras_is_manager(v_session.unit_id) then raise exception 'SARPRAS_ACCESS_DENIED'; end if;
  select count(*) into v_unchecked from public.asset_stocktake_items where stocktake_id = target_stocktake_id and finding = 'unchecked';
  if v_unchecked > 0 then raise exception 'STOCKTAKE_HAS_UNCHECKED_ITEMS'; end if;
  select public.current_employee_id() into v_employee;
  update public.asset_stocktakes set status = 'completed', completed_by = v_employee, completed_at = now() where id = target_stocktake_id;
  update public.assets asset set last_stocktake_at = now(), location = coalesce(item.actual_location, asset.location), condition = coalesce(item.actual_condition, asset.condition)
  from public.asset_stocktake_items item where item.stocktake_id = target_stocktake_id and item.asset_id = asset.id and item.finding <> 'missing';
end;
$$;

alter table public.asset_maintenance_requests enable row level security;
alter table public.asset_stocktakes enable row level security;
alter table public.asset_stocktake_items enable row level security;
alter table public.rooms enable row level security;
alter table public.room_schedules enable row level security;

drop policy if exists "Allow authenticated access to assets" on public.assets;
drop policy if exists "Allow authenticated access to asset_loans" on public.asset_loans;
drop policy if exists "Allow authenticated access to procurements" on public.procurements;
drop policy if exists "Sarpras managers manage assets" on public.assets;
create policy "Sarpras managers manage assets" on public.assets for all to authenticated
using (public.sarpras_is_manager(unit_id)) with check (public.sarpras_is_manager(unit_id));
drop policy if exists "Sarpras managers manage loans" on public.asset_loans;
create policy "Sarpras managers manage loans" on public.asset_loans for all to authenticated
using (public.sarpras_is_manager(unit_id)) with check (public.sarpras_is_manager(unit_id));
drop policy if exists "Borrowers read own asset loans" on public.asset_loans;
create policy "Borrowers read own asset loans" on public.asset_loans for select to authenticated
using (borrower_id = public.current_employee_id());
drop policy if exists "Sarpras managers manage procurements" on public.procurements;
create policy "Sarpras managers manage procurements" on public.procurements for all to authenticated
using (public.sarpras_is_manager(unit_id)) with check (public.sarpras_is_manager(unit_id));
drop policy if exists "Sarpras managers manage rooms" on public.rooms;
create policy "Sarpras managers manage rooms" on public.rooms for all to authenticated
using (public.sarpras_is_manager(unit_id)) with check (public.sarpras_is_manager(unit_id));
drop policy if exists "Sarpras managers manage room schedules" on public.room_schedules;
create policy "Sarpras managers manage room schedules" on public.room_schedules for all to authenticated
using (public.sarpras_is_manager(unit_id)) with check (public.sarpras_is_manager(unit_id));

drop policy if exists "Sarpras managers manage maintenance" on public.asset_maintenance_requests;
create policy "Sarpras managers manage maintenance" on public.asset_maintenance_requests for all to authenticated
using (public.sarpras_is_manager(unit_id) or assigned_to = public.current_employee_id())
with check (public.sarpras_is_manager(unit_id) or assigned_to = public.current_employee_id());
drop policy if exists "Sarpras managers manage stocktakes" on public.asset_stocktakes;
create policy "Sarpras managers manage stocktakes" on public.asset_stocktakes for all to authenticated
using (public.sarpras_is_manager(unit_id)) with check (public.sarpras_is_manager(unit_id));
drop policy if exists "Sarpras managers manage stocktake items" on public.asset_stocktake_items;
create policy "Sarpras managers manage stocktake items" on public.asset_stocktake_items for all to authenticated
using (exists (select 1 from public.asset_stocktakes session where session.id = stocktake_id and public.sarpras_is_manager(session.unit_id)))
with check (exists (select 1 from public.asset_stocktakes session where session.id = stocktake_id and public.sarpras_is_manager(session.unit_id)));

revoke all on function public.sarpras_is_manager(uuid) from public;
revoke all on function public.sarpras_set_loan_status(uuid, text, text, text) from public;
revoke all on function public.start_asset_stocktake(uuid, text, text) from public;
revoke all on function public.complete_asset_stocktake(uuid) from public;
revoke all on function public.receive_procurement_as_assets(uuid) from public;
grant execute on function public.sarpras_is_manager(uuid) to authenticated;
grant execute on function public.sarpras_set_loan_status(uuid, text, text, text) to authenticated;
grant execute on function public.start_asset_stocktake(uuid, text, text) to authenticated;
grant execute on function public.complete_asset_stocktake(uuid) to authenticated;
grant execute on function public.receive_procurement_as_assets(uuid) to authenticated;
grant select, insert, update on public.asset_maintenance_requests, public.asset_stocktakes, public.asset_stocktake_items to authenticated;
grant select, insert, update, delete on public.rooms, public.room_schedules to authenticated;
