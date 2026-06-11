-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. roles
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. units (defined before user_roles because user_roles references units)
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role_id uuid references public.roles(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete cascade,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, role_id, unit_id)
);

-- 5. academic_years
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  is_active boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. semesters
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid references public.academic_years(id) on delete cascade not null,
  name text not null check (name in ('Ganjil', 'Genap')),
  start_date date,
  end_date date,
  is_active boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 7. classes
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete cascade not null,
  academic_year_id uuid references public.academic_years(id) on delete cascade not null,
  name text not null,
  grade_level int not null,
  capacity int,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 8. students
create table public.students (
  id uuid primary key default gen_random_uuid(),
  nis text unique not null,
  nisn text unique,
  full_name text not null,
  unit_id uuid references public.units(id) not null,
  status text not null check (status in ('active', 'graduated', 'transferred', 'dropped_out')) default 'active',
  gender text not null check (gender in ('L', 'P')),
  date_of_birth date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 9. parents
create table public.parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  full_name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 10. student_parent_links
create table public.student_parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  parent_id uuid references public.parents(id) on delete cascade not null,
  relationship text not null check (relationship in ('father', 'mother', 'guardian')),
  is_primary boolean default false,
  created_at timestamptz default now() not null,
  unique(student_id, parent_id)
);

-- 11. teachers
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  nip text unique,
  full_name text not null,
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 12. teacher_assignments
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  unit_id uuid references public.units(id) not null,
  role_type text not null check (role_type in ('homeroom', 'subject_teacher', 'coordinator')),
  class_id uuid references public.classes(id),
  academic_year_id uuid references public.academic_years(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 13. admin_tasks
create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id),
  unit_id uuid references public.units(id),
  status text not null check (status in ('pending', 'in_progress', 'completed', 'cancelled')) default 'pending',
  due_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 14. audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  created_at timestamptz default now() not null
);

-- Create trigger function for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to relevant tables
create trigger handle_updated_at_profiles before update on public.profiles for each row execute procedure handle_updated_at();
create trigger handle_updated_at_roles before update on public.roles for each row execute procedure handle_updated_at();
create trigger handle_updated_at_units before update on public.units for each row execute procedure handle_updated_at();
create trigger handle_updated_at_user_roles before update on public.user_roles for each row execute procedure handle_updated_at();
create trigger handle_updated_at_academic_years before update on public.academic_years for each row execute procedure handle_updated_at();
create trigger handle_updated_at_semesters before update on public.semesters for each row execute procedure handle_updated_at();
create trigger handle_updated_at_classes before update on public.classes for each row execute procedure handle_updated_at();
create trigger handle_updated_at_students before update on public.students for each row execute procedure handle_updated_at();
create trigger handle_updated_at_parents before update on public.parents for each row execute procedure handle_updated_at();
create trigger handle_updated_at_teachers before update on public.teachers for each row execute procedure handle_updated_at();
create trigger handle_updated_at_teacher_assignments before update on public.teacher_assignments for each row execute procedure handle_updated_at();
create trigger handle_updated_at_admin_tasks before update on public.admin_tasks for each row execute procedure handle_updated_at();

-- Auto create profile on auth user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for common filters
create index idx_classes_unit_id on public.classes(unit_id);
create index idx_classes_academic_year_id on public.classes(academic_year_id);
create index idx_students_unit_id on public.students(unit_id);
create index idx_students_status on public.students(status);
create index idx_teacher_assignments_teacher_id on public.teacher_assignments(teacher_id);
create index idx_teacher_assignments_unit_id on public.teacher_assignments(unit_id);
create index idx_admin_tasks_assigned_to on public.admin_tasks(assigned_to);
create index idx_admin_tasks_unit_id on public.admin_tasks(unit_id);
create index idx_admin_tasks_status on public.admin_tasks(status);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.units enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.student_parent_links enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.admin_tasks enable row level security;
alter table public.audit_logs enable row level security;

-- Create basic RLS policies (Allow all for authenticated users temporarily for development)
create policy "Allow authenticated full access to profiles" on public.profiles for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to roles" on public.roles for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to user_roles" on public.user_roles for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to units" on public.units for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to academic_years" on public.academic_years for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to semesters" on public.semesters for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to classes" on public.classes for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to students" on public.students for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to parents" on public.parents for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to student_parent_links" on public.student_parent_links for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to teachers" on public.teachers for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to teacher_assignments" on public.teacher_assignments for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to admin_tasks" on public.admin_tasks for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to audit_logs" on public.audit_logs for all to authenticated using (true) with check (true);
