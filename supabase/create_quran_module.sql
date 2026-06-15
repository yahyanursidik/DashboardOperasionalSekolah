-- =========================================================================
-- CREATE QURAN MODULE (Tahsin & Tahfidz) - COMPREHENSIVE
-- =========================================================================

-- 1. QURAN RECORDS (Mutaba'ah Harian)
CREATE TABLE IF NOT EXISTS public.quran_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, -- Track class at the time
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Evaluator
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    record_type TEXT NOT NULL CHECK (record_type IN ('tahsin', 'tahfidz')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    surah_or_jilid TEXT NOT NULL,
    ayat_or_page TEXT NOT NULL,
    fluency_score TEXT NOT NULL CHECK (fluency_score IN ('Sangat Lancar', 'Lancar', 'Kurang Lancar', 'Mengulang')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- In case the table already exists from an older version, add the class_id column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quran_records' AND column_name='class_id') THEN
        ALTER TABLE public.quran_records ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. QURAN TARGETS (Target Hafalan/Tahsin per Kelas)
CREATE TABLE IF NOT EXISTS public.quran_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    target_type TEXT NOT NULL CHECK (target_type IN ('tahsin', 'tahfidz')),
    description TEXT NOT NULL,
    target_amount INT NOT NULL DEFAULT 1, -- e.g. 1 juz, or 20 halaman
    amount_unit TEXT NOT NULL DEFAULT 'halaman', -- e.g. 'halaman', 'ayat', 'juz'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(class_id, academic_year_id, semester_id, target_type)
);

-- 3. QURAN ASSESSMENTS (Munaqosyah/Ujian)
CREATE TABLE IF NOT EXISTS public.quran_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Penguji
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('tahsin_jilid', 'tahfidz_juz', 'tasmi')),
    title TEXT NOT NULL, -- e.g. "Munaqosyah Juz 30"
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    score NUMERIC NOT NULL,
    predicate TEXT NOT NULL, -- e.g. "Mumtaz", "Jayyid Jiddan"
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuration
ALTER TABLE public.quran_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_assessments ENABLE ROW LEVEL SECURITY;

-- Admins full access
DROP POLICY IF EXISTS "Admin full access for quran_records" ON public.quran_records;
CREATE POLICY "Admin full access for quran_records" ON public.quran_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')));

DROP POLICY IF EXISTS "Admin full access for quran_targets" ON public.quran_targets;
CREATE POLICY "Admin full access for quran_targets" ON public.quran_targets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')));

DROP POLICY IF EXISTS "Admin full access for quran_assessments" ON public.quran_assessments;
CREATE POLICY "Admin full access for quran_assessments" ON public.quran_assessments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')));

-- Teachers access
DROP POLICY IF EXISTS "Teachers access for quran_records" ON public.quran_records;
CREATE POLICY "Teachers access for quran_records" ON public.quran_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'guru'));

DROP POLICY IF EXISTS "Teachers access for quran_targets" ON public.quran_targets;
CREATE POLICY "Teachers access for quran_targets" ON public.quran_targets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'guru'));

DROP POLICY IF EXISTS "Teachers access for quran_assessments" ON public.quran_assessments;
CREATE POLICY "Teachers access for quran_assessments" ON public.quran_assessments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'guru'));

-- Parents access
DROP POLICY IF EXISTS "Parents can view their children quran_records" ON public.quran_records;
CREATE POLICY "Parents can view their children quran_records" ON public.quran_records FOR SELECT TO authenticated USING (student_id IN (SELECT student_id FROM student_parent_links spl JOIN parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Parents can view quran_targets" ON public.quran_targets;
CREATE POLICY "Parents can view quran_targets" ON public.quran_targets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Parents can view their children quran_assessments" ON public.quran_assessments;
CREATE POLICY "Parents can view their children quran_assessments" ON public.quran_assessments FOR SELECT TO authenticated USING (student_id IN (SELECT student_id FROM student_parent_links spl JOIN parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));

-- Dummy Data for Demonstration
INSERT INTO public.quran_records (student_id, class_id, employee_id, academic_year_id, semester_id, record_type, date, surah_or_jilid, ayat_or_page, fluency_score, notes)
SELECT 
    s.id as student_id,
    s.class_id,
    e.id as employee_id,
    ay.id as academic_year_id,
    sem.id as semester_id,
    'tahfidz' as record_type,
    CURRENT_DATE as date,
    'An-Naba''' as surah_or_jilid,
    '1-20' as ayat_or_page,
    'Sangat Lancar' as fluency_score,
    'Makharijul huruf sangat baik' as notes
FROM students s
CROSS JOIN employees e
CROSS JOIN academic_years ay
CROSS JOIN semesters sem
WHERE ay.is_active = true AND sem.is_active = true
LIMIT 1
ON CONFLICT DO NOTHING;
