-- =========================================================================
-- BUAT TABEL SYSTEM_SETTINGS (Pengaturan Sistem Global)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuration
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Izinkan SEMUA orang membaca settings (termasuk yang belum login)
-- Ini penting agar logo & nama sekolah bisa tampil di halaman login
DROP POLICY IF EXISTS "Public read access for system_settings" ON public.system_settings;
CREATE POLICY "Public read access for system_settings" 
ON public.system_settings 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Izinkan authenticated users untuk update
DROP POLICY IF EXISTS "Authenticated users can update system_settings" ON public.system_settings;
CREATE POLICY "Authenticated users can update system_settings" 
ON public.system_settings 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Izinkan authenticated users untuk insert
DROP POLICY IF EXISTS "Authenticated users can insert system_settings" ON public.system_settings;
CREATE POLICY "Authenticated users can insert system_settings" 
ON public.system_settings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Insert nilai default
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('app_name', 'TSLS Admin OS', 'Nama Aplikasi / Sekolah'),
  ('logo_url', '', 'URL Logo Sekolah')
ON CONFLICT (key) DO NOTHING;
