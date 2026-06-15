-- ==========================================
-- SISTEM REKRUTMEN & PENEMPATAN PEGAWAI
-- Tabel: recruitment_vacancies, recruitment_applicants
-- ==========================================

-- 1. Create table for job vacancies
CREATE TABLE IF NOT EXISTS public.recruitment_vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    position TEXT NOT NULL, -- e.g., 'guru', 'tu', 'satpam', 'cleaning_service', 'kepala_sekolah'
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    quota INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
    description TEXT,
    requirements TEXT,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create table for applicants
CREATE TABLE IF NOT EXISTS public.recruitment_applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vacancy_id UUID NOT NULL REFERENCES public.recruitment_vacancies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    last_education TEXT,
    cv_url TEXT,
    status TEXT NOT NULL DEFAULT 'berkas_masuk' CHECK (status IN ('berkas_masuk', 'seleksi_berkas', 'ujian_tulis', 'wawancara', 'lulus', 'ditolak')),
    
    -- Scoring
    score_diniyah INTEGER CHECK (score_diniyah >= 0 AND score_diniyah <= 100),
    score_pedagogik INTEGER CHECK (score_pedagogik >= 0 AND score_pedagogik <= 100),
    score_wawancara INTEGER CHECK (score_wawancara >= 0 AND score_wawancara <= 100),
    
    -- Notes
    interviewer_notes TEXT,
    rejection_notes TEXT,
    
    -- Placement
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Linked once placed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_recruitment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recruitment_vacancies_updated_at ON public.recruitment_vacancies;
CREATE TRIGGER update_recruitment_vacancies_updated_at
BEFORE UPDATE ON public.recruitment_vacancies
FOR EACH ROW EXECUTE FUNCTION update_recruitment_updated_at();

DROP TRIGGER IF EXISTS update_recruitment_applicants_updated_at ON public.recruitment_applicants;
CREATE TRIGGER update_recruitment_applicants_updated_at
BEFORE UPDATE ON public.recruitment_applicants
FOR EACH ROW EXECUTE FUNCTION update_recruitment_updated_at();

-- 4. Enable RLS
ALTER TABLE public.recruitment_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_applicants ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Enable read access for all users on recruitment_vacancies" 
ON public.recruitment_vacancies FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users on recruitment_vacancies" 
ON public.recruitment_vacancies FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable read access for all users on recruitment_applicants" 
ON public.recruitment_applicants FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users on recruitment_applicants" 
ON public.recruitment_applicants FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Add comments
COMMENT ON TABLE public.recruitment_vacancies IS 'Daftar lowongan pekerjaan yang dibuka oleh sekolah/yayasan';
COMMENT ON TABLE public.recruitment_applicants IS 'Daftar pelamar, nilai seleksi, dan status rekrutmen';
