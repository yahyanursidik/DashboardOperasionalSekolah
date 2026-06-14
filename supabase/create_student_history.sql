-- ==============================================================================
-- STUDEN ACADEMIC HISTORY
-- Track student promotion, graduation, and unit transfers
-- ==============================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.student_academic_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  academic_year_id uuid references public.academic_years(id),
  unit_id uuid references public.units(id),
  class_id uuid references public.classes(id),
  status text not null check (status in ('Siswa Baru', 'Pindahan (Masuk)', 'Naik Kelas', 'Tinggal Kelas', 'Pindah Jenjang', 'Lulus', 'Pindah (Keluar)')),
  notes text,
  created_at timestamptz default now() not null,
  created_by uuid references public.profiles(id)
);

-- 2. Enable RLS
ALTER TABLE public.student_academic_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow anyone to read
CREATE POLICY "Enable read access for all users on student_academic_history"
ON public.student_academic_history FOR SELECT
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users on student_academic_history"
ON public.student_academic_history FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "Enable update for authenticated users on student_academic_history"
ON public.student_academic_history FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Enable delete for authenticated users on student_academic_history"
ON public.student_academic_history FOR DELETE
USING (auth.role() = 'authenticated');

-- 4. Initial Seed Data (Optional, just insert for existing active students)
-- For a seamless transition, we can inject a "Siswa Baru" baseline for all current students.
-- Un-comment the line below if we want a baseline, otherwise we can start fresh.
/*
INSERT INTO public.student_academic_history (student_id, unit_id, class_id, status)
SELECT id, unit_id, class_id, 'Siswa Baru' FROM public.students WHERE class_id IS NOT NULL;
*/
