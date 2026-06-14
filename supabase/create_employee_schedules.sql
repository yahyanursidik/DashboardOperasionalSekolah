-- =========================================================================
-- CREATE EMPLOYEE SCHEDULES
-- Modul Jadwal & Shift Pegawai (Opsi A)
-- =========================================================================

-- 1. Create Table
CREATE TABLE public.employee_schedules (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid references public.employees(id) on delete cascade not null,
    day_of_week text not null check (day_of_week in ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    start_time time not null,
    end_time time not null,
    schedule_type text not null check (schedule_type in ('mengajar', 'piket', 'shift_keamanan', 'shift_kebersihan', 'standby')),
    class_id uuid references public.classes(id),
    subject text,
    academic_year_id uuid references public.academic_years(id),
    unit_id uuid references public.units(id), -- Untuk memfilter jadwal per unit
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Index untuk mempercepat query jadwal harian
CREATE INDEX idx_employee_schedules_day ON public.employee_schedules(day_of_week);
CREATE INDEX idx_employee_schedules_emp ON public.employee_schedules(employee_id);

-- 2. Trigger Updated At
CREATE TRIGGER handle_emp_schedules_updated_at BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. RLS (Row Level Security)
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Semua orang yang login bisa melihat jadwal
CREATE POLICY "Users can read all schedules" 
ON public.employee_schedules 
FOR SELECT TO authenticated USING (true);

-- Hanya Admin/HRD yang bisa menambah/mengubah jadwal (Sederhananya authenticated bisa edit jika punya akses di UI)
CREATE POLICY "Users can insert schedules" 
ON public.employee_schedules 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update schedules" 
ON public.employee_schedules 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete schedules" 
ON public.employee_schedules 
FOR DELETE TO authenticated USING (true);

-- 4. INSERT DUMMY DATA
-- Ambil UUID Unit SDIT (biasanya berakhiran 2) dan SMPIT (berakhiran 3)
-- Ambil UUID Employee (bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01)
DO $$
DECLARE
  v_sdit_unit uuid := '22222222-2222-2222-2222-222222222222';
  v_class_1a uuid := '66666666-6666-6666-6666-666666666661';
  v_academic_year uuid := '44444444-4444-4444-4444-444444444444';
  v_employee_guru uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
  v_employee_satpam uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06';
BEGIN
  -- Insert jadwal mengajar untuk guru
  INSERT INTO public.employee_schedules (employee_id, day_of_week, start_time, end_time, schedule_type, class_id, subject, academic_year_id, unit_id)
  VALUES 
    (v_employee_guru, 'Senin', '07:30:00', '09:00:00', 'mengajar', v_class_1a, 'Matematika', v_academic_year, v_sdit_unit),
    (v_employee_guru, 'Selasa', '09:30:00', '11:00:00', 'mengajar', v_class_1a, 'Bahasa Indonesia', v_academic_year, v_sdit_unit),
    (v_employee_guru, 'Rabu', '07:00:00', '15:00:00', 'piket', NULL, NULL, v_academic_year, v_sdit_unit);

  -- Insert jadwal shift satpam
  INSERT INTO public.employee_schedules (employee_id, day_of_week, start_time, end_time, schedule_type, unit_id)
  VALUES 
    (v_employee_satpam, 'Senin', '06:00:00', '18:00:00', 'shift_keamanan', v_sdit_unit),
    (v_employee_satpam, 'Selasa', '18:00:00', '06:00:00', 'shift_keamanan', v_sdit_unit);
EXCEPTION WHEN OTHERS THEN
  -- Ignore duplicate key if it exists
END $$;
