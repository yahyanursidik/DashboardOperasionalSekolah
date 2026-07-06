-- =========================================================================
-- CREATE TAHFIDZ EXTENSION (Halaqoh, Targets, Journals, Munaqosyah)
-- =========================================================================

-- 1. TAHFIDZ HALAQOHS (Kelompok Tahfidz)
CREATE TABLE IF NOT EXISTS public.tahfidz_halaqohs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g. "Halaqoh Utsman Bin Affan"
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Muhaffizh / Guru
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, academic_year_id, semester_id)
);

-- 2. TAHFIDZ HALAQOH MEMBERS (Anggota Halaqoh)
CREATE TABLE IF NOT EXISTS public.tahfidz_halaqoh_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    halaqoh_id UUID NOT NULL REFERENCES public.tahfidz_halaqohs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(halaqoh_id, student_id)
);

-- 3. TAHFIDZ STUDENT TARGETS (Target Hafalan Personal)
CREATE TABLE IF NOT EXISTS public.tahfidz_student_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    target_type TEXT NOT NULL CHECK (target_type IN ('tahsin', 'tahfidz')),
    description TEXT NOT NULL, -- e.g. "Juz 30"
    target_amount INT NOT NULL DEFAULT 1,
    amount_unit TEXT NOT NULL DEFAULT 'juz', -- 'halaman', 'ayat', 'juz', 'surah'
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MODIFY QURAN RECORDS (Jurnal Setoran)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quran_records' AND column_name='halaqoh_id') THEN
        ALTER TABLE public.quran_records ADD COLUMN halaqoh_id UUID REFERENCES public.tahfidz_halaqohs(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quran_records' AND column_name='tajwid_score') THEN
        ALTER TABLE public.quran_records ADD COLUMN tajwid_score TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quran_records' AND column_name='makhroj_score') THEN
        ALTER TABLE public.quran_records ADD COLUMN makhroj_score TEXT;
    END IF;
END $$;

-- 5. MODIFY QURAN ASSESSMENTS (Munaqosyah)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quran_assessments' AND column_name='examiner_2_id') THEN
        ALTER TABLE public.quran_assessments ADD COLUMN examiner_2_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quran_assessments' AND column_name='status') THEN
        ALTER TABLE public.quran_assessments ADD COLUMN status TEXT DEFAULT 'Lulus' CHECK (status IN ('Lulus', 'Mengulang', 'Lulus Bersyarat'));
    END IF;
END $$;


-- RLS Configuration
ALTER TABLE public.tahfidz_halaqohs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tahfidz_halaqoh_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tahfidz_student_targets ENABLE ROW LEVEL SECURITY;

-- Admins full access
DROP POLICY IF EXISTS "Admin full access for tahfidz_halaqohs" ON public.tahfidz_halaqohs;
CREATE POLICY "Admin full access for tahfidz_halaqohs" ON public.tahfidz_halaqohs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')));

DROP POLICY IF EXISTS "Admin full access for tahfidz_halaqoh_members" ON public.tahfidz_halaqoh_members;
CREATE POLICY "Admin full access for tahfidz_halaqoh_members" ON public.tahfidz_halaqoh_members FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')));

DROP POLICY IF EXISTS "Admin full access for tahfidz_student_targets" ON public.tahfidz_student_targets;
CREATE POLICY "Admin full access for tahfidz_student_targets" ON public.tahfidz_student_targets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit')));

-- Teachers (Muhaffizh) access
DROP POLICY IF EXISTS "Teachers access for tahfidz_halaqohs" ON public.tahfidz_halaqohs;
CREATE POLICY "Teachers access for tahfidz_halaqohs" ON public.tahfidz_halaqohs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'guru'));

DROP POLICY IF EXISTS "Teachers access for tahfidz_halaqoh_members" ON public.tahfidz_halaqoh_members;
CREATE POLICY "Teachers access for tahfidz_halaqoh_members" ON public.tahfidz_halaqoh_members FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'guru'));

DROP POLICY IF EXISTS "Teachers access for tahfidz_student_targets" ON public.tahfidz_student_targets;
CREATE POLICY "Teachers access for tahfidz_student_targets" ON public.tahfidz_student_targets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'guru'));

-- Parents access (View Only)
DROP POLICY IF EXISTS "Parents can view their children tahfidz_student_targets" ON public.tahfidz_student_targets;
CREATE POLICY "Parents can view their children tahfidz_student_targets" ON public.tahfidz_student_targets FOR SELECT TO authenticated USING (student_id IN (SELECT student_id FROM student_parent_links spl JOIN parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Parents can view their children tahfidz_halaqoh_members" ON public.tahfidz_halaqoh_members;
CREATE POLICY "Parents can view their children tahfidz_halaqoh_members" ON public.tahfidz_halaqoh_members FOR SELECT TO authenticated USING (student_id IN (SELECT student_id FROM student_parent_links spl JOIN parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));
