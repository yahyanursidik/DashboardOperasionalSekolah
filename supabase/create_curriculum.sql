-- ==============================================================================
-- Migration: Create Curriculum Modules
-- Description: Creates tables for subjects and curriculum documents.
-- ==============================================================================

-- 1. Table: subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Nasional', 'Khas Sekolah', 'Lainnya')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users on subjects" ON public.subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users on subjects" ON public.subjects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users on subjects" ON public.subjects FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Table: curriculum_documents
CREATE TABLE IF NOT EXISTS public.curriculum_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('Modul Ajar', 'ATP', 'CP', 'Panduan Kurikulum', 'Lainnya')),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, -- Optional, if linked to a specific class
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    file_url TEXT,
    drive_link TEXT,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for curriculum_documents
ALTER TABLE public.curriculum_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on curriculum_documents" ON public.curriculum_documents FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users on curriculum_documents" ON public.curriculum_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users on curriculum_documents" ON public.curriculum_documents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users on curriculum_documents" ON public.curriculum_documents FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to automatically update updated_at on subjects
CREATE OR REPLACE FUNCTION update_subjects_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION update_subjects_updated_at_column();

-- Trigger to automatically update updated_at on curriculum_documents
CREATE OR REPLACE FUNCTION update_curriculum_documents_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_curriculum_documents_updated_at
BEFORE UPDATE ON public.curriculum_documents
FOR EACH ROW
EXECUTE FUNCTION update_curriculum_documents_updated_at_column();

-- Seed some default values
-- Assuming 'Nasional' and 'Khas Sekolah' are used frequently
