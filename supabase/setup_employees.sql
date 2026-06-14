-- =========================================================================
-- SETUP PEGAWAI & ABSENSI PEGAWAI (EMPLOYEES & STAFF ATTENDANCE)
-- =========================================================================

-- 1. CREATE EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  nik text unique,
  full_name text not null,
  position text not null, -- 'kepala_sekolah', 'wakasek', 'guru', 'tu', 'satpam', 'cleaning_service'
  unit_id uuid references public.units(id) on delete set null,
  status text not null check (status in ('active', 'inactive', 'resigned')) default 'active',
  phone text,
  address text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_employees ON public.employees;
CREATE TRIGGER handle_updated_at_employees
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 2. CREATE EMPLOYEE_ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'sick', 'leave')),
  time_in time,
  time_out time,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(employee_id, date)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_employee_attendance ON public.employee_attendance;
CREATE TRIGGER handle_updated_at_employee_attendance
  BEFORE UPDATE ON public.employee_attendance
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 3. RLS POLICIES FOR EMPLOYEES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on employees" ON public.employees 
FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can read employees in their unit" ON public.employees 
FOR SELECT TO authenticated USING (
  public.can_access_unit(unit_id) OR unit_id IS NULL
);

-- 4. RLS POLICIES FOR EMPLOYEE_ATTENDANCE
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on employee_attendance" ON public.employee_attendance 
FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can read employee_attendance in their unit" ON public.employee_attendance 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND (public.can_access_unit(e.unit_id) OR e.unit_id IS NULL)
  )
);

-- 5. INSERT DUMMY DATA FOR EMPLOYEES
INSERT INTO public.employees (id, nik, full_name, position, unit_id, status) VALUES 
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'EMP001', 'Ustadz Ahmad (Guru SDIT)', 'guru', '22222222-2222-2222-2222-222222222222', 'active'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'EMP002', 'Pak Yanto (Satpam)', 'satpam', NULL, 'active'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'EMP003', 'Bu Siti (Cleaning Service SDIT)', 'cleaning_service', '22222222-2222-2222-2222-222222222222', 'active'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'EMP004', 'Ustadz Furqon (Kepala Sekolah SMPIT)', 'kepala_sekolah', '33333333-3333-3333-3333-333333333333', 'active')
ON CONFLICT (nik) DO NOTHING;

-- 6. INSERT DUMMY DATA FOR EMPLOYEE_ATTENDANCE (HARI INI)
INSERT INTO public.employee_attendance (employee_id, date, status, time_in) VALUES 
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', CURRENT_DATE, 'present', '07:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', CURRENT_DATE, 'present', '06:30:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', CURRENT_DATE, 'sick', NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', CURRENT_DATE, 'present', '06:45:00')
ON CONFLICT (employee_id, date) DO NOTHING;
