-- ==============================================================================
-- Migration: Add Curriculum Deep Learning (SD) & Thematic (PAUD) structures
-- ==============================================================================

DROP TABLE IF EXISTS public.subject_curriculums CASCADE;
DROP TABLE IF EXISTS public.paud_themes CASCADE;


-- 1. Table: subject_curriculums
CREATE TABLE IF NOT EXISTS public.subject_curriculums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    grade_level INT NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    cp_text TEXT,
    atp_text TEXT,
    kktp_text TEXT,
    prota_data JSONB,
    prosem_data JSONB,
    learning_plan_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(subject_id, grade_level, academic_year_id)
);

-- 2. Table: paud_curriculums
CREATE TABLE IF NOT EXISTS public.paud_curriculums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    grade_level INT NOT NULL,
    atp_text TEXT,
    prota_data JSONB,
    prosem_data JSONB,
    rppm_data JSONB,
    rpph_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(unit_id, grade_level, academic_year_id)
);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_subject_curriculums BEFORE UPDATE ON public.subject_curriculums FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER handle_updated_at_paud_curriculums BEFORE UPDATE ON public.paud_curriculums FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- RLS policies
ALTER TABLE public.subject_curriculums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to subject_curriculums" ON public.subject_curriculums FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select access to subject_curriculums" ON public.subject_curriculums FOR SELECT USING (true);

ALTER TABLE public.paud_curriculums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to paud_curriculums" ON public.paud_curriculums FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select access to paud_curriculums" ON public.paud_curriculums FOR SELECT USING (true);
