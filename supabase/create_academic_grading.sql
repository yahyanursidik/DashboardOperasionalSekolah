-- ==========================================
-- SISTEM AKADEMIK & E-RAPOR
-- Tabel: academic_grades, academic_report_cards
-- ==========================================

-- 1. Create table for academic grades
CREATE TABLE IF NOT EXISTS public.academic_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    grade_type TEXT NOT NULL, -- 'tugas_1', 'tugas_2', 'uts', 'uas', dll
    score TEXT, -- Teks agar bisa input angka (85) atau kualitatif (BSH, BSB)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, class_id, semester_id, grade_type)
);

-- 2. Create table for academic report cards (Master e-Rapor)
CREATE TABLE IF NOT EXISTS public.academic_report_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    
    -- Sikap dan Predikat
    spiritual_predicate TEXT, -- A/B/C atau Sangat Baik/Baik/Cukup
    spiritual_notes TEXT,
    social_predicate TEXT,
    social_notes TEXT,
    
    -- Muatan Diniyah Khusus (Kualitatif/Teks)
    tahsin_predicate TEXT,
    tahfidz_predicate TEXT,
    
    -- Tambahan
    extracurricular TEXT,
    achievements TEXT,
    homeroom_notes TEXT,
    
    -- Status
    is_finalized BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id, semester_id)
);

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_academic_grades') THEN
        CREATE TRIGGER set_updated_at_academic_grades
        BEFORE UPDATE ON public.academic_grades
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_academic_report_cards') THEN
        CREATE TRIGGER set_updated_at_academic_report_cards
        BEFORE UPDATE ON public.academic_report_cards
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.academic_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_report_cards ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write based on roles
CREATE POLICY "Allow authenticated read access on academic_grades" ON public.academic_grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access on academic_grades" ON public.academic_grades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update access on academic_grades" ON public.academic_grades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete access on academic_grades" ON public.academic_grades FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access on academic_report_cards" ON public.academic_report_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access on academic_report_cards" ON public.academic_report_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update access on academic_report_cards" ON public.academic_report_cards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete access on academic_report_cards" ON public.academic_report_cards FOR DELETE TO authenticated USING (true);
