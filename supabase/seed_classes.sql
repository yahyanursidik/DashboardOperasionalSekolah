-- =========================================================================
-- RE-SEED CLASSES & FIX RLS
-- =========================================================================

-- 1. PASTIKAN RLS TIDAK MEMBLOKIR (Kadang RLS Classes juga perlu di-reset)
DROP POLICY IF EXISTS "Users can read classes in their unit" ON public.classes;
CREATE POLICY "Users can read classes in their unit" ON public.classes 
FOR SELECT TO authenticated USING (true); -- Sementara buka akses read ke semua kelas

-- 2. RE-INSERT DATA KELAS (Jaga-jaga jika sebelumnya gagal masuk)
INSERT INTO public.classes (id, name, unit_id, academic_year_id, capacity, grade_level) VALUES 
('66666666-6666-6666-6666-666666666661', '1A (Abu Bakar)', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 30, 1),
('66666666-6666-6666-6666-666666666662', '1B (Umar)', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 30, 1),
('66666666-6666-6666-6666-666666666663', '7A (Aisyah)', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 32, 7),
('66666666-6666-6666-6666-666666666664', '7B (Khadijah)', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 32, 7)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  unit_id = EXCLUDED.unit_id,
  academic_year_id = EXCLUDED.academic_year_id;

-- 3. FIX CLASS_ID DI STUDENTS (Jaga-jaga ada siswa yang kehilangan kelas)
UPDATE public.students SET class_id = '66666666-6666-6666-6666-666666666661' WHERE unit_id = '22222222-2222-2222-2222-222222222222' AND class_id IS NULL;
UPDATE public.students SET class_id = '66666666-6666-6666-6666-666666666663' WHERE unit_id = '33333333-3333-3333-3333-333333333333' AND class_id IS NULL;
