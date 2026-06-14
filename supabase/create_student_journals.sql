-- =========================================================================
-- CREATE STUDENT JOURNALS
-- Modul Rekam Jejak Perkembangan Siswa / Rekam Medik Pendidikan
-- =========================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.student_journals (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references public.students(id) on delete cascade not null,
    employee_id uuid references public.employees(id) on delete set null,
    category text not null check (category in ('akademik', 'karakter', 'kendala', 'ekskul', 'kasus', 'kesehatan', 'anekdot', 'stppa')),
    title text not null,
    description text not null,
    action_taken text,
    date_recorded date not null default current_date,
    stppa_metrics jsonb,
    visibility text not null default 'internal' check (visibility in ('internal', 'parents')),
    academic_year_id uuid references public.academic_years(id),
    unit_id uuid references public.units(id),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Index untuk mempercepat pencarian berdasarkan siswa dan kategori
CREATE INDEX IF NOT EXISTS idx_student_journals_student ON public.student_journals(student_id);
CREATE INDEX IF NOT EXISTS idx_student_journals_category ON public.student_journals(category);
CREATE INDEX IF NOT EXISTS idx_student_journals_unit ON public.student_journals(unit_id);

-- 2. Trigger Updated At
DROP TRIGGER IF EXISTS handle_student_journals_updated_at ON public.student_journals;
CREATE TRIGGER handle_student_journals_updated_at BEFORE UPDATE ON public.student_journals
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. RLS (Row Level Security)
ALTER TABLE public.student_journals ENABLE ROW LEVEL SECURITY;

-- Semua authenticated user bisa melihat
DROP POLICY IF EXISTS "Users can read all journals" ON public.student_journals;
CREATE POLICY "Users can read all journals" 
ON public.student_journals 
FOR SELECT TO authenticated USING (true);

-- Insert, Update, Delete untuk Guru/Admin
DROP POLICY IF EXISTS "Users can insert journals" ON public.student_journals;
CREATE POLICY "Users can insert journals" 
ON public.student_journals 
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update journals" ON public.student_journals;
CREATE POLICY "Users can update journals" 
ON public.student_journals 
FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can delete journals" ON public.student_journals;
CREATE POLICY "Users can delete journals" 
ON public.student_journals 
FOR DELETE TO authenticated USING (true);
