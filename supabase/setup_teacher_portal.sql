-- =========================================================================
-- PERSIAPAN PORTAL GURU (TEACHER PORTAL SETUP)
-- =========================================================================

-- 1. Tambahkan kolom email ke tabel employees untuk opsi login
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text unique;

-- 2. Update data dummy agar bisa dipakai login
UPDATE public.employees SET email = 'guru1@sekolah.demo' WHERE nik = 'EMP001';
UPDATE public.employees SET email = 'kepsek@sekolah.demo' WHERE nik = 'EMP004';
