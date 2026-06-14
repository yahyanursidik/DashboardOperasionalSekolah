-- =========================================================================
-- CREATE SUBSTITUTE ASSIGNMENTS
-- Modul Guru Inval / Pengganti (Opsi C)
-- =========================================================================

-- 1. Create Table
CREATE TABLE public.substitute_assignments (
    id uuid primary key default gen_random_uuid(),
    absent_employee_id uuid references public.employees(id) on delete cascade not null,
    substitute_employee_id uuid references public.employees(id) on delete cascade not null,
    date date not null,
    start_time time not null,
    end_time time not null,
    class_id uuid references public.classes(id),
    subject text not null,
    leave_request_id uuid references public.leave_requests(id) on delete set null,
    status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
    notes text,
    academic_year_id uuid references public.academic_years(id),
    unit_id uuid references public.units(id),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    CONSTRAINT diff_employees CHECK (absent_employee_id != substitute_employee_id),
    CONSTRAINT valid_times CHECK (start_time < end_time)
);

-- Index
CREATE INDEX idx_substitutes_date ON public.substitute_assignments(date);
CREATE INDEX idx_substitutes_absent ON public.substitute_assignments(absent_employee_id);
CREATE INDEX idx_substitutes_sub ON public.substitute_assignments(substitute_employee_id);

-- 2. Trigger Updated At
CREATE TRIGGER handle_substitute_assignments_updated_at BEFORE UPDATE ON public.substitute_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. RLS (Row Level Security)
ALTER TABLE public.substitute_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all substitute assignments" 
ON public.substitute_assignments 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert substitute assignments" 
ON public.substitute_assignments 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update substitute assignments" 
ON public.substitute_assignments 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete substitute assignments" 
ON public.substitute_assignments 
FOR DELETE TO authenticated USING (true);

-- 4. INSERT DUMMY DATA
DO $$
DECLARE
  v_sdit_unit uuid := '22222222-2222-2222-2222-222222222222';
  v_class_1a uuid := '66666666-6666-6666-6666-666666666661';
  v_academic_year uuid := '44444444-4444-4444-4444-444444444444';
  v_guru_absen uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'; -- Ustadz Ahmad
  v_guru_inval uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04'; -- Ustadz Zaid
BEGIN
  INSERT INTO public.substitute_assignments (absent_employee_id, substitute_employee_id, date, start_time, end_time, class_id, subject, status, notes, academic_year_id, unit_id)
  VALUES 
    (v_guru_absen, v_guru_inval, CURRENT_DATE + INTERVAL '1 days', '07:30:00', '09:00:00', v_class_1a, 'Matematika', 'scheduled', 'Tolong lanjutkan materi Bab 3 halaman 45', v_academic_year, v_sdit_unit);
EXCEPTION WHEN OTHERS THEN
END $$;
