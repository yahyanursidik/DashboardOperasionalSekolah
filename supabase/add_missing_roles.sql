-- ADD MISSING ROLES TO DATABASE
-- Run this in the Supabase SQL Editor to make these roles available in the Superadmin Settings

INSERT INTO public.roles (name, description) VALUES 
('admin_keuangan', 'Admin Keuangan / Bendahara (Hanya akses modul keuangan)'),
('admin_spmb', 'Admin Penerimaan Siswa Baru (Hanya akses modul SPMB)')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;
