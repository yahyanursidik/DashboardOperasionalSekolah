-- =========================================================================
-- FIX EMPLOYEES RLS
-- =========================================================================

-- Izinkan semua user yang sudah login (authenticated) untuk membaca data employees.
-- Ini penting agar saat memunculkan nama guru/penguji di Portal Orang Tua atau 
-- aplikasi guru, relasi ke tabel employees tidak diblokir oleh RLS.

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.employees;

CREATE POLICY "Enable read access for all authenticated users" 
ON public.employees 
FOR SELECT 
TO authenticated 
USING (true);
