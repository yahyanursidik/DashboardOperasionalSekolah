-- Homebased Learning LMS: programs contain subjects, subjects contain materials,
-- and parents submit either a completion checklist or a Google Drive report.

create table if not exists public.hbl_programs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(name)) between 3 and 160)
);

create table if not exists public.hbl_subjects (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hbl_programs(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(name)) between 2 and 120)
);

create table if not exists public.hbl_materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.hbl_subjects(id) on delete cascade,
  title text not null,
  description text,
  resource_type text not null check (resource_type in ('youtube', 'google_drive')),
  resource_url text not null,
  report_type text not null default 'checklist' check (report_type in ('checklist', 'google_drive_link')),
  due_date date,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(title)) between 3 and 180),
  check (resource_url ~* '^https://')
);

create table if not exists public.hbl_program_students (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hbl_programs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table if not exists public.hbl_material_reports (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.hbl_materials(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete restrict,
  checklist_completed boolean not null default false,
  submission_url text,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'needs_revision')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  updated_at timestamptz not null default now(),
  unique (material_id, student_id),
  check (submission_url is null or submission_url ~* '^https://(drive|docs)[.]google[.]com/')
);

create index if not exists hbl_programs_unit_status_idx on public.hbl_programs(unit_id, status);
create index if not exists hbl_subjects_program_sort_idx on public.hbl_subjects(program_id, sort_order, name);
create index if not exists hbl_materials_subject_sort_idx on public.hbl_materials(subject_id, is_published, sort_order);
create index if not exists hbl_program_students_student_idx on public.hbl_program_students(student_id, program_id);
create index if not exists hbl_material_reports_student_idx on public.hbl_material_reports(student_id, status, submitted_at desc);

create or replace function public.hbl_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hbl_programs_set_updated_at on public.hbl_programs;
create trigger hbl_programs_set_updated_at before update on public.hbl_programs
for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_subjects_set_updated_at on public.hbl_subjects;
create trigger hbl_subjects_set_updated_at before update on public.hbl_subjects
for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_materials_set_updated_at on public.hbl_materials;
create trigger hbl_materials_set_updated_at before update on public.hbl_materials
for each row execute function public.hbl_set_updated_at();
drop trigger if exists hbl_material_reports_set_updated_at on public.hbl_material_reports;
create trigger hbl_material_reports_set_updated_at before update on public.hbl_material_reports
for each row execute function public.hbl_set_updated_at();

create or replace function public.hbl_is_manager_for_unit(p_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin()
    or (
      public.can_access_unit(p_unit_id)
      and (
        public.has_role('admin_sekolah')
        or public.has_role('admin_unit')
        or public.has_role('wakasek')
        or public.has_role('kepsek')
      )
    );
$$;

create or replace function public.hbl_can_manage_program(p_program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hbl_programs program
    where program.id = p_program_id and public.hbl_is_manager_for_unit(program.unit_id)
  );
$$;

create or replace function public.hbl_parent_can_access_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.student_parent_links link
    join public.parents parent on parent.id = link.parent_id
    where link.student_id = p_student_id
      and parent.user_id = auth.uid()
      and parent.is_active is distinct from false
      and coalesce(link.can_access_parent_portal, true)
  );
$$;

create or replace function public.hbl_parent_can_access_program(p_program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.hbl_program_students enrollment
    join public.hbl_programs program on program.id = enrollment.program_id
    where enrollment.program_id = p_program_id
      and program.status = 'published'
      and public.hbl_parent_can_access_student(enrollment.student_id)
  );
$$;

create or replace function public.hbl_parent_can_submit(p_material_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.hbl_materials material
    join public.hbl_subjects subject on subject.id = material.subject_id
    join public.hbl_programs program on program.id = subject.program_id
    join public.hbl_program_students enrollment
      on enrollment.program_id = program.id and enrollment.student_id = p_student_id
    where material.id = p_material_id
      and material.is_published
      and program.status = 'published'
      and public.hbl_parent_can_access_student(p_student_id)
  );
$$;

alter table public.hbl_programs enable row level security;
alter table public.hbl_subjects enable row level security;
alter table public.hbl_materials enable row level security;
alter table public.hbl_program_students enable row level security;
alter table public.hbl_material_reports enable row level security;

drop policy if exists "HBL managers manage programs" on public.hbl_programs;
create policy "HBL managers manage programs" on public.hbl_programs for all to authenticated
using (public.hbl_is_manager_for_unit(unit_id)) with check (public.hbl_is_manager_for_unit(unit_id));
drop policy if exists "Parents read assigned HBL programs" on public.hbl_programs;
create policy "Parents read assigned HBL programs" on public.hbl_programs for select to authenticated
using (status = 'published' and public.hbl_parent_can_access_program(id));

drop policy if exists "HBL managers manage subjects" on public.hbl_subjects;
create policy "HBL managers manage subjects" on public.hbl_subjects for all to authenticated
using (public.hbl_can_manage_program(program_id)) with check (public.hbl_can_manage_program(program_id));
drop policy if exists "Parents read assigned HBL subjects" on public.hbl_subjects;
create policy "Parents read assigned HBL subjects" on public.hbl_subjects for select to authenticated
using (public.hbl_parent_can_access_program(program_id));

drop policy if exists "HBL managers manage materials" on public.hbl_materials;
create policy "HBL managers manage materials" on public.hbl_materials for all to authenticated
using (public.hbl_can_manage_program((select subject.program_id from public.hbl_subjects subject where subject.id = hbl_materials.subject_id)))
with check (public.hbl_can_manage_program((select subject.program_id from public.hbl_subjects subject where subject.id = hbl_materials.subject_id)));
drop policy if exists "Parents read published HBL materials" on public.hbl_materials;
create policy "Parents read published HBL materials" on public.hbl_materials for select to authenticated
using (
  is_published
  and public.hbl_parent_can_access_program((select subject.program_id from public.hbl_subjects subject where subject.id = hbl_materials.subject_id))
);

drop policy if exists "HBL managers manage enrollments" on public.hbl_program_students;
create policy "HBL managers manage enrollments" on public.hbl_program_students for all to authenticated
using (public.hbl_can_manage_program(program_id)) with check (public.hbl_can_manage_program(program_id));
drop policy if exists "Parents read own HBL enrollments" on public.hbl_program_students;
create policy "Parents read own HBL enrollments" on public.hbl_program_students for select to authenticated
using (public.hbl_parent_can_access_student(student_id));

drop policy if exists "HBL managers manage reports" on public.hbl_material_reports;
create policy "HBL managers manage reports" on public.hbl_material_reports for all to authenticated
using (
  public.hbl_can_manage_program((
    select subject.program_id from public.hbl_materials material
    join public.hbl_subjects subject on subject.id = material.subject_id
    where material.id = hbl_material_reports.material_id
  ))
)
with check (
  public.hbl_can_manage_program((
    select subject.program_id from public.hbl_materials material
    join public.hbl_subjects subject on subject.id = material.subject_id
    where material.id = hbl_material_reports.material_id
  ))
);
drop policy if exists "Parents create own HBL reports" on public.hbl_material_reports;
create policy "Parents create own HBL reports" on public.hbl_material_reports for insert to authenticated
with check (
  parent_id = any(public.current_parent_ids())
  and public.hbl_parent_can_submit(material_id, student_id)
);
drop policy if exists "Parents read own HBL reports" on public.hbl_material_reports;
create policy "Parents read own HBL reports" on public.hbl_material_reports for select to authenticated
using (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_student(student_id));
drop policy if exists "Parents update own HBL reports" on public.hbl_material_reports;
create policy "Parents update own HBL reports" on public.hbl_material_reports for update to authenticated
using (parent_id = any(public.current_parent_ids()) and public.hbl_parent_can_access_student(student_id))
with check (
  parent_id = any(public.current_parent_ids())
  and public.hbl_parent_can_submit(material_id, student_id)
);

grant select, insert, update, delete on public.hbl_programs to authenticated;
grant select, insert, update, delete on public.hbl_subjects to authenticated;
grant select, insert, update, delete on public.hbl_materials to authenticated;
grant select, insert, update, delete on public.hbl_program_students to authenticated;
grant select, insert, update, delete on public.hbl_material_reports to authenticated;
grant execute on function public.hbl_is_manager_for_unit(uuid) to authenticated;
grant execute on function public.hbl_can_manage_program(uuid) to authenticated;
grant execute on function public.hbl_parent_can_access_student(uuid) to authenticated;
grant execute on function public.hbl_parent_can_access_program(uuid) to authenticated;
grant execute on function public.hbl_parent_can_submit(uuid, uuid) to authenticated;

comment on table public.hbl_programs is 'Homebased Learning program definitions managed from system settings.';
comment on table public.hbl_material_reports is 'Parent completion evidence for Homebased Learning materials.';
