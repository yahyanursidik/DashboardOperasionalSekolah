-- =========================================================================
-- SETUP MULTI-TUPOKSI GURU (TEACHER ROLES)
-- =========================================================================

-- 1. Tambahkan array teacher_roles ke tabel employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS teacher_roles text[] DEFAULT '{}';

-- 2. Tambahkan kolom homeroom_teacher_id ke tabel classes (Wali Kelas)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS homeroom_teacher_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- 3. Update data dummy agar bisa dipakai testing fitur Multi-Role
-- Ustadz Ahmad: Wali Kelas & Guru Mata Pelajaran
UPDATE public.employees 
SET teacher_roles = ARRAY['Wali Kelas', 'Guru Mata Pelajaran', 'Guru Piket']
WHERE nik = 'EMP001';

-- Kepala Sekolah: juga bertugas sebagai Guru BK (contoh)
UPDATE public.employees 
SET teacher_roles = ARRAY['Guru Bimbingan dan Konseling', 'Guru Ekstrakurikuler']
WHERE nik = 'EMP004';

-- 4. Jadikan Ustadz Ahmad sebagai Wali Kelas 1A
UPDATE public.classes 
SET homeroom_teacher_id = (SELECT id FROM public.employees WHERE nik = 'EMP001')
WHERE name = '1A (Abu Bakar)';
