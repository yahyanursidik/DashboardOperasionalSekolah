-- Upgrade Teachers Schema

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS gender text check (gender in ('L', 'P')),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS role_title text,
  ADD COLUMN IF NOT EXISTS unit_id uuid references public.units(id),
  ADD COLUMN IF NOT EXISTS is_active boolean default true;

-- Update teachers status check constraint
ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_status_check;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_status_check CHECK (status in ('active', 'inactive', 'on_leave', 'contract', 'part_time'));

-- Update teacher_assignments
ALTER TABLE public.teacher_assignments
  ADD COLUMN IF NOT EXISTS unit_id uuid references public.units(id),
  ADD COLUMN IF NOT EXISTS is_active boolean default true;

-- Update teacher_assignments role check constraint
ALTER TABLE public.teacher_assignments DROP CONSTRAINT IF EXISTS teacher_assignments_role_type_check;
ALTER TABLE public.teacher_assignments ADD CONSTRAINT teacher_assignments_role_type_check CHECK (role_type in ('homeroom', 'subject', 'substitute', 'wali_kelas', 'guru_mapel', 'guru_quran', 'guru_diniyah', 'staff'));
