-- =========================================================================
-- FIX RLS EMPLOYEES UNTUK HRD
-- =========================================================================

-- Izinkan role 'hrd' untuk dapat Menambah, Mengubah, dan Menghapus data pegawai
DROP POLICY IF EXISTS "HRD can manage employees" ON public.employees;

CREATE POLICY "HRD can manage employees" 
ON public.employees 
FOR ALL TO authenticated 
USING (public.has_role('hrd')) 
WITH CHECK (public.has_role('hrd'));

-- Izinkan role 'admin' (jika belum ada) untuk kelola pegawai secara penuh
DROP POLICY IF EXISTS "Admin can manage employees" ON public.employees;

CREATE POLICY "Admin can manage employees" 
ON public.employees 
FOR ALL TO authenticated 
USING (public.has_role('admin')) 
WITH CHECK (public.has_role('admin'));
