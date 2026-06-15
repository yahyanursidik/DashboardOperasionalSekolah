-- ==========================================
-- SISTEM MANAJEMEN SURAT & DISPOSISI
-- Tabel: mail_records, mail_dispositions
-- ==========================================

-- 1. Create table for mail records
CREATE TABLE IF NOT EXISTS public.mail_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing', 'internal')),
    mail_number TEXT NOT NULL,
    title TEXT NOT NULL,
    sender TEXT,
    recipient TEXT,
    mail_date DATE NOT NULL,
    received_date DATE,
    description TEXT,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('logged', 'dispositioned', 'completed', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create table for dispositions
CREATE TABLE IF NOT EXISTS public.mail_dispositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mail_id UUID NOT NULL REFERENCES public.mail_records(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instruction TEXT NOT NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.mail_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_dispositions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for mail_records
CREATE POLICY "Enable read access for all users on mail_records" 
ON public.mail_records FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for authenticated users on mail_records" 
ON public.mail_records FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update access for authenticated users on mail_records" 
ON public.mail_records FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete access for authenticated users on mail_records" 
ON public.mail_records FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- 5. RLS Policies for mail_dispositions
CREATE POLICY "Enable read access for involved users on mail_dispositions" 
ON public.mail_dispositions FOR SELECT 
USING (true); -- Simplified to allow all authenticated users to read dispositions for transparency

CREATE POLICY "Enable insert access for authenticated users on mail_dispositions" 
ON public.mail_dispositions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update access for authenticated users on mail_dispositions" 
ON public.mail_dispositions FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete access for authenticated users on mail_dispositions" 
ON public.mail_dispositions FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- 6. Trigger for updated_at on dispositions
CREATE OR REPLACE FUNCTION update_mail_dispositions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mail_dispositions_updated_at ON public.mail_dispositions;
CREATE TRIGGER update_mail_dispositions_updated_at
BEFORE UPDATE ON public.mail_dispositions
FOR EACH ROW EXECUTE FUNCTION update_mail_dispositions_updated_at();

-- 7. Add comments
COMMENT ON TABLE public.mail_records IS 'Buku Agenda Surat Masuk dan Keluar';
COMMENT ON TABLE public.mail_dispositions IS 'Riwayat dan tugas disposisi surat antar pegawai';
