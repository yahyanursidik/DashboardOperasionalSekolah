alter table public.units
  add column if not exists code text,
  add column if not exists education_level text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists principal_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.units drop constraint if exists units_education_level_check;
alter table public.units add constraint units_education_level_check
  check (education_level is null or education_level in ('preschool', 'elementary', 'junior', 'senior', 'nonformal', 'support'));

alter table public.academic_years
  add column if not exists status text not null default 'planned',
  add column if not exists locked_at timestamptz,
  add column if not exists notes text;

alter table public.academic_years drop constraint if exists academic_years_status_check;
alter table public.academic_years add constraint academic_years_status_check
  check (status in ('planned', 'active', 'closed'));
alter table public.academic_years drop constraint if exists academic_years_date_check;
alter table public.academic_years add constraint academic_years_date_check
  check (end_date is null or start_date is null or end_date > start_date);

alter table public.semesters
  add column if not exists status text not null default 'planned',
  add column if not exists locked_at timestamptz,
  add column if not exists notes text;

alter table public.semesters drop constraint if exists semesters_status_check;
alter table public.semesters add constraint semesters_status_check
  check (status in ('planned', 'active', 'closed'));
alter table public.semesters drop constraint if exists semesters_date_check;
alter table public.semesters add constraint semesters_date_check
  check (end_date is null or start_date is null or end_date > start_date);

with ranked as (
  select id, row_number() over (order by start_date desc nulls last, created_at desc) as position
  from public.academic_years where is_active
)
update public.academic_years year_record
set is_active = false
from ranked where year_record.id = ranked.id and ranked.position > 1;

with ranked as (
  select id, row_number() over (order by start_date desc nulls last, created_at desc) as position
  from public.semesters where is_active
)
update public.semesters semester_record
set is_active = false
from ranked where semester_record.id = ranked.id and ranked.position > 1;

update public.academic_years set status = 'active' where is_active;
update public.semesters set status = 'active' where is_active;

create unique index if not exists units_code_unique_idx on public.units (lower(code)) where code is not null;
create unique index if not exists academic_years_single_active_idx on public.academic_years (is_active) where is_active;
create unique index if not exists semesters_single_active_idx on public.semesters (is_active) where is_active;
create index if not exists units_active_order_idx on public.units (is_active, sort_order, name);
create index if not exists academic_years_status_dates_idx on public.academic_years (status, start_date desc);
create index if not exists semesters_year_status_idx on public.semesters (academic_year_id, status, start_date);

create table if not exists public.unit_academic_period_settings (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  learning_start_date date,
  learning_end_date date,
  student_entry_date date,
  report_distribution_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, semester_id),
  check (learning_end_date is null or learning_start_date is null or learning_end_date >= learning_start_date)
);

create index if not exists unit_academic_period_settings_scope_idx
  on public.unit_academic_period_settings (academic_year_id, semester_id, unit_id);

drop trigger if exists set_updated_at_unit_academic_period_settings on public.unit_academic_period_settings;
create trigger set_updated_at_unit_academic_period_settings
  before update on public.unit_academic_period_settings
  for each row execute procedure public.handle_updated_at();

create or replace function public.master_data_is_manager(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('super_admin') or public.has_role('ketua_yayasan')
    or public.has_role('kepsek') or public.has_role('wakasek')
    or public.has_role('kepala_tu') or public.has_role('admin_tu')
    or public.has_role('admin_sekolah')
    or (public.has_role('admin_unit') and target_unit_id is not null and public.can_access_unit(target_unit_id));
$$;

create or replace function public.master_data_activate_period(p_academic_year_id uuid, p_semester_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare semester_year_id uuid;
begin
  if not public.master_data_is_manager(null) then
    raise exception 'Anda tidak memiliki kewenangan mengaktifkan periode akademik.';
  end if;

  select academic_year_id into semester_year_id from public.semesters where id = p_semester_id;
  if semester_year_id is null or semester_year_id <> p_academic_year_id then
    raise exception 'Semester harus berasal dari tahun ajaran yang dipilih.';
  end if;

  update public.academic_years
  set is_active = false, status = case when status = 'active' then 'planned' else status end
  where is_active or status = 'active';
  update public.semesters
  set is_active = false, status = case when status = 'active' then 'planned' else status end
  where is_active or status = 'active';

  update public.academic_years set is_active = true, status = 'active', locked_at = null
  where id = p_academic_year_id;
  update public.semesters set is_active = true, status = 'active', locked_at = null
  where id = p_semester_id;
end;
$$;

create or replace function public.master_data_close_period(p_academic_year_id uuid, p_semester_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.master_data_is_manager(null) then
    raise exception 'Anda tidak memiliki kewenangan menutup periode akademik.';
  end if;
  if p_semester_id is not null then
    update public.semesters set is_active = false, status = 'closed', locked_at = now()
    where id = p_semester_id and academic_year_id = p_academic_year_id;
  else
    update public.semesters set is_active = false, status = 'closed', locked_at = coalesce(locked_at, now())
    where academic_year_id = p_academic_year_id;
    update public.academic_years set is_active = false, status = 'closed', locked_at = now()
    where id = p_academic_year_id;
  end if;
end;
$$;

alter table public.unit_academic_period_settings enable row level security;

drop policy if exists "Super admins can do all on units" on public.units;
drop policy if exists "Master data managers manage units" on public.units;
create policy "Master data managers manage units" on public.units for all to authenticated
  using (public.master_data_is_manager(id)) with check (public.master_data_is_manager(id));

drop policy if exists "Super admins can do all on academic_years" on public.academic_years;
drop policy if exists "Master data managers manage academic years" on public.academic_years;
create policy "Master data managers manage academic years" on public.academic_years for all to authenticated
  using (public.master_data_is_manager(null)) with check (public.master_data_is_manager(null));

drop policy if exists "Super admins can do all on semesters" on public.semesters;
drop policy if exists "Master data managers manage semesters" on public.semesters;
create policy "Master data managers manage semesters" on public.semesters for all to authenticated
  using (public.master_data_is_manager(null)) with check (public.master_data_is_manager(null));

drop policy if exists "Master data managers manage unit period settings" on public.unit_academic_period_settings;
create policy "Master data managers manage unit period settings" on public.unit_academic_period_settings for all to authenticated
  using (public.master_data_is_manager(unit_id)) with check (public.master_data_is_manager(unit_id));
drop policy if exists "Authenticated users view unit period settings" on public.unit_academic_period_settings;
create policy "Authenticated users view unit period settings" on public.unit_academic_period_settings for select to authenticated
  using (public.can_access_unit(unit_id));

grant select, insert, update, delete on public.unit_academic_period_settings to authenticated;
grant execute on function public.master_data_is_manager(uuid) to authenticated;
grant execute on function public.master_data_activate_period(uuid, uuid) to authenticated;
grant execute on function public.master_data_close_period(uuid, uuid) to authenticated;

comment on table public.unit_academic_period_settings is 'Tanggal operasional pembelajaran per unit untuk satu semester tanpa memecah konteks tahun ajaran global.';
comment on function public.master_data_activate_period(uuid, uuid) is 'Mengaktifkan tepat satu pasangan tahun ajaran dan semester secara atomik untuk seluruh sistem.';
