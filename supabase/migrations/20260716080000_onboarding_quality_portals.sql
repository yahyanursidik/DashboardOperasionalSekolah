-- Role-aware, multi-unit onboarding and policy acknowledgement.

alter table public.onboarding_materials
  drop constraint if exists onboarding_materials_material_type_check;

alter table public.onboarding_materials
  add constraint onboarding_materials_material_type_check
  check (material_type in ('pdf', 'audio', 'video', 'image', 'youtube', 'gdrive', 's3_link'));

alter table public.onboarding_materials
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists category text not null default 'general',
  add column if not exists audience text[] not null default array['parents']::text[],
  add column if not exists is_required boolean not null default false,
  add column if not exists estimated_minutes integer not null default 5,
  add column if not exists version_label text not null default '1.0',
  add column if not exists publish_start_at timestamptz,
  add column if not exists publish_end_at timestamptz,
  add column if not exists acknowledgement_required boolean not null default false,
  add column if not exists acknowledgement_text text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.onboarding_materials
  drop constraint if exists onboarding_materials_category_check,
  drop constraint if exists onboarding_materials_audience_check,
  drop constraint if exists onboarding_materials_estimated_minutes_check,
  drop constraint if exists onboarding_materials_publish_window_check;

alter table public.onboarding_materials
  add constraint onboarding_materials_category_check
    check (category in ('orientation', 'academic', 'quran', 'student_welfare', 'finance', 'safety', 'policy', 'technology', 'general')),
  add constraint onboarding_materials_audience_check
    check (cardinality(audience) > 0 and audience <@ array['all', 'parents', 'teachers', 'staff']::text[]),
  add constraint onboarding_materials_estimated_minutes_check
    check (estimated_minutes between 1 and 600),
  add constraint onboarding_materials_publish_window_check
    check (publish_end_at is null or publish_start_at is null or publish_end_at > publish_start_at);

update public.onboarding_materials
set audience = array['parents']::text[]
where audience is null or cardinality(audience) = 0;

create index if not exists onboarding_materials_scope_idx
  on public.onboarding_materials(status, unit_id, order_index);
create index if not exists onboarding_materials_publish_window_idx
  on public.onboarding_materials(publish_start_at, publish_end_at);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.onboarding_materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  acknowledged_at timestamptz,
  acknowledgement_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(material_id, user_id)
);

create index if not exists onboarding_progress_user_idx
  on public.onboarding_progress(user_id, completed_at, acknowledged_at);

drop trigger if exists set_updated_at_onboarding_progress on public.onboarding_progress;
create trigger set_updated_at_onboarding_progress
  before update on public.onboarding_progress
  for each row execute procedure public.handle_updated_at();

create or replace function public.onboarding_is_manager(target_unit_id uuid default null)
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
    or public.has_role('admin_tu')
    or public.has_role('admin_sekolah')
    or public.has_role('admin_dokumen')
    or public.has_role('hrd')
    or (
      public.has_role('admin_unit')
      and target_unit_id is not null
      and public.can_access_unit(target_unit_id)
    );
$$;

create or replace function public.onboarding_viewer_matches(material public.onboarding_materials)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    material.status = 'published'
    and (material.publish_start_at is null or material.publish_start_at <= now())
    and (material.publish_end_at is null or material.publish_end_at >= now())
    and (
      material.unit_id is null
      or public.can_access_unit(material.unit_id)
      or exists (
        select 1 from public.employees employee
        where employee.user_id = auth.uid()
          and employee.status = 'active'
          and employee.unit_id = material.unit_id
      )
      or exists (
        select 1
        from public.parents parent
        join public.student_parent_links link on link.parent_id = parent.id
        join public.students student on student.id = link.student_id
        where parent.user_id = auth.uid() and student.unit_id = material.unit_id
      )
    )
    and (
      'all' = any(material.audience)
      or ('parents' = any(material.audience) and exists (select 1 from public.parents parent where parent.user_id = auth.uid()))
      or ('teachers' = any(material.audience) and exists (
        select 1 from public.employees employee
        where employee.user_id = auth.uid() and employee.status = 'active'
          and employee.position in ('guru', 'guru_quran', 'wali_kelas', 'kepala_sekolah', 'wakil_kepala_sekolah', 'kepala_unit', 'wakil_kepala_unit')
      ))
      or ('staff' = any(material.audience) and exists (
        select 1 from public.employees employee
        where employee.user_id = auth.uid() and employee.status = 'active'
          and employee.position not in ('guru', 'guru_quran', 'wali_kelas')
      ))
    );
$$;

alter table public.onboarding_progress enable row level security;

drop policy if exists "Admins have full access to onboarding materials" on public.onboarding_materials;
drop policy if exists "Authenticated users can view published onboarding materials" on public.onboarding_materials;
drop policy if exists "Onboarding managers manage materials" on public.onboarding_materials;
create policy "Onboarding managers manage materials"
  on public.onboarding_materials for all to authenticated
  using (public.onboarding_is_manager(unit_id))
  with check (public.onboarding_is_manager(unit_id));

drop policy if exists "Scoped users view published onboarding materials" on public.onboarding_materials;
create policy "Scoped users view published onboarding materials"
  on public.onboarding_materials for select to authenticated
  using (public.onboarding_viewer_matches(onboarding_materials));

drop policy if exists "Users manage own onboarding progress" on public.onboarding_progress;
create policy "Users manage own onboarding progress"
  on public.onboarding_progress for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.onboarding_materials material
      where material.id = material_id
        and (public.onboarding_viewer_matches(material) or public.onboarding_is_manager(material.unit_id))
    )
  );

drop policy if exists "Onboarding managers view progress" on public.onboarding_progress;
create policy "Onboarding managers view progress"
  on public.onboarding_progress for select to authenticated
  using (
    exists (
      select 1 from public.onboarding_materials material
      where material.id = material_id and public.onboarding_is_manager(material.unit_id)
    )
  );

drop policy if exists "Onboarding managers insert files" on storage.objects;
create policy "Onboarding managers insert files" on storage.objects for insert to authenticated
  with check (bucket_id = 'onboarding_materials' and (public.onboarding_is_manager(null) or public.has_role('admin_unit')));
drop policy if exists "Onboarding managers update files" on storage.objects;
create policy "Onboarding managers update files" on storage.objects for update to authenticated
  using (bucket_id = 'onboarding_materials' and (public.onboarding_is_manager(null) or public.has_role('admin_unit')))
  with check (bucket_id = 'onboarding_materials' and (public.onboarding_is_manager(null) or public.has_role('admin_unit')));
drop policy if exists "Onboarding managers delete files" on storage.objects;
create policy "Onboarding managers delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'onboarding_materials' and (public.onboarding_is_manager(null) or public.has_role('admin_unit')));

grant select, insert, update, delete on public.onboarding_progress to authenticated;
grant execute on function public.onboarding_is_manager(uuid) to authenticated;
grant execute on function public.onboarding_viewer_matches(public.onboarding_materials) to authenticated;

comment on table public.onboarding_materials is 'Materi orientasi, kebijakan, dan panduan berbasis unit serta audiens portal.';
comment on table public.onboarding_progress is 'Progres baca dan bukti persetujuan versi materi onboarding per akun.';
