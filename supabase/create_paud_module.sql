-- =========================================================================
-- CREATE PAUD MODULE (KB/TK)
-- =========================================================================

-- Domain enum for STPPA Checklist Scale
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stppa_scale') THEN
        CREATE TYPE stppa_scale AS ENUM ('BB', 'MB', 'BSH', 'BSB');
    END IF;
END $$;

-- 1. PAUD ACTIVITIES (Jurnal Foto Kegiatan Per Siswa)
CREATE TABLE IF NOT EXISTS public.paud_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Guru
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PAUD STPPA ASSESSMENTS (Penilaian Perkembangan & Rapor Narasi)
CREATE TABLE IF NOT EXISTS public.paud_stppa_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    
    period_name TEXT NOT NULL, -- e.g. "Bulan Juli 2026" atau "Semester Ganjil"
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Nilai Agama & Moral
    agama_moral_scale stppa_scale,
    agama_moral_desc TEXT,
    
    -- Fisik Motorik
    fisik_motorik_scale stppa_scale,
    fisik_motorik_desc TEXT,
    
    -- Kognitif
    kognitif_scale stppa_scale,
    kognitif_desc TEXT,
    
    -- Bahasa
    bahasa_scale stppa_scale,
    bahasa_desc TEXT,
    
    -- Sosial Emosional
    sosial_emosional_scale stppa_scale,
    sosial_emosional_desc TEXT,
    
    -- Seni
    seni_scale stppa_scale,
    seni_desc TEXT,

    -- Catatan Pertumbuhan Anak (Bisa diisi saat evaluasi bulanan/semester)
    growth_weight NUMERIC, -- Berat Badan (kg)
    growth_height NUMERIC, -- Tinggi Badan (cm)
    growth_head NUMERIC,   -- Lingkar Kepala (cm)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuration
ALTER TABLE public.paud_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paud_stppa_assessments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admin full access for paud_activities" ON public.paud_activities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit', 'kepsek')));
CREATE POLICY "Admin full access for paud_stppa_assessments" ON public.paud_stppa_assessments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin_unit', 'kepsek')));

-- Teachers access
CREATE POLICY "Teachers access for paud_activities" ON public.paud_activities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('guru', 'wali_kelas')));
CREATE POLICY "Teachers access for paud_stppa_assessments" ON public.paud_stppa_assessments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('guru', 'wali_kelas')));

-- Parents access (Hanya bisa melihat data anak mereka sendiri)
CREATE POLICY "Parents can view their children paud_activities" ON public.paud_activities FOR SELECT TO authenticated USING (student_id IN (SELECT student_id FROM student_parent_links spl JOIN parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));
CREATE POLICY "Parents can view their children paud_stppa_assessments" ON public.paud_stppa_assessments FOR SELECT TO authenticated USING (student_id IN (SELECT student_id FROM student_parent_links spl JOIN parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));
