-- Management reporting governance: auditable exports across units and periods.

create table if not exists public.report_export_logs (
  id uuid primary key default gen_random_uuid(),
  report_key text not null,
  report_label text not null,
  unit_id uuid references public.units(id) on delete set null,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  semester_id uuid references public.semesters(id) on delete set null,
  date_from date,
  date_to date,
  export_format text not null check (export_format in ('csv', 'xlsx', 'pdf', 'print')),
  row_count integer not null default 0 check (row_count >= 0),
  filters jsonb not null default '{}'::jsonb,
  exported_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  exported_by_name text,
  created_at timestamptz not null default now()
);

create or replace function public.set_report_export_actor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.exported_by := auth.uid();
  select profile.full_name into new.exported_by_name from public.profiles profile where profile.id = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_report_export_actor on public.report_export_logs;
create trigger set_report_export_actor before insert on public.report_export_logs
for each row execute function public.set_report_export_actor();

create index if not exists report_export_logs_scope_idx
  on public.report_export_logs(unit_id, created_at desc);
create index if not exists report_export_logs_report_idx
  on public.report_export_logs(report_key, created_at desc);

alter table public.report_export_logs enable row level security;

create or replace function public.can_manage_reports(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.auth_user_roles() scope
    where scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_sekolah', 'admin_unit')
      and (
        scope.role_name in ('super_admin', 'ketua_yayasan')
        or (scope.unit_id is null and target_unit_id is null)
        or (target_unit_id is not null and (scope.unit_id is null or scope.unit_id = target_unit_id))
      )
  );
$$;

drop policy if exists "Report managers read export logs" on public.report_export_logs;
create policy "Report managers read export logs" on public.report_export_logs for select to authenticated
using (public.can_manage_reports(unit_id));

drop policy if exists "Report managers create export logs" on public.report_export_logs;
create policy "Report managers create export logs" on public.report_export_logs for insert to authenticated
with check (exported_by = auth.uid() and public.can_manage_reports(unit_id));

revoke all on function public.can_manage_reports(uuid) from public;
grant execute on function public.can_manage_reports(uuid) to authenticated;
grant select, insert on public.report_export_logs to authenticated;
