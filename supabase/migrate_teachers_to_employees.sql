-- =========================================================================
-- MIGRASI GURU KE DATA PEGAWAI & PENYELARASAN TABEL TUGAS GURU
-- =========================================================================

-- 1. UBAH STRUKTUR TABEL TEACHER_ASSIGNMENTS
ALTER TABLE public.teacher_assignments 
DROP CONSTRAINT teacher_assignments_teacher_id_fkey;

ALTER TABLE public.teacher_assignments 
RENAME COLUMN teacher_id TO employee_id;

-- Bersihkan data lama yang ID-nya masih merujuk ke tabel teachers
DELETE FROM public.teacher_assignments;

ALTER TABLE public.teacher_assignments 
ADD CONSTRAINT teacher_assignments_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

-- 2. HAPUS TABEL TEACHERS LAMA
-- Karena foreign key dari teacher_assignments sudah dipindah, 
-- tabel teachers aman untuk didrop.
DROP TABLE IF EXISTS public.teachers CASCADE;
