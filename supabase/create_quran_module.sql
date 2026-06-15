-- =========================================================================
-- CREATE QURAN MODULE (Tahsin & Tahfidz)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.quran_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
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

-- RLS Configuration
ALTER TABLE public.quran_records ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admin full access for quran_records" 
ON public.quran_records FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')
    )
);

-- Teachers can read and write all for now (simplicity)
CREATE POLICY "Teachers access for quran_records" 
ON public.quran_records FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'guru'
    )
);

-- Parents can read their children's records
CREATE POLICY "Parents can view their children quran_records" 
ON public.quran_records FOR SELECT TO authenticated 
USING (
    student_id IN (
        SELECT student_id FROM student_parent_links spl
        JOIN parents p ON spl.parent_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- Students can read their own records
CREATE POLICY "Students can view their own quran_records" 
ON public.quran_records FOR SELECT TO authenticated 
USING (
    student_id IN (
        SELECT id FROM students WHERE user_id = auth.uid()
    )
);

-- Dummy Data for Demonstration
INSERT INTO public.quran_records (student_id, employee_id, academic_year_id, semester_id, record_type, date, surah_or_jilid, ayat_or_page, fluency_score, notes)
SELECT 
    s.id as student_id,
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
