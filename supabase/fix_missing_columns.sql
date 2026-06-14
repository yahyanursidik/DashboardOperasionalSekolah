-- =========================================================================
-- FIX SCHEMA & RE-INSERT DATA
-- Jalankan script ini jika data gagal masuk karena kolom tidak ditemukan
-- =========================================================================

-- 1. PASTIKAN KOLOM CLASS_ID ADA DI STUDENTS
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS class_id uuid references public.classes(id) on delete set null,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes_admin text;

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'dropped_out'));

-- 2. RE-INSERT DUMMY DATA YANG MUNGKIN GAGAL SEBELUMNYA
INSERT INTO public.students (id, nis, nisn, full_name, unit_id, class_id, gender, status) VALUES 
('99999999-9999-9999-9999-999999999101', '2425003', '0102030407', 'Aisyah Putri', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666661', 'P', 'active'),
('99999999-9999-9999-9999-999999999102', '2425004', '0102030408', 'Fatimah Az-Zahra', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666661', 'P', 'active'),
('99999999-9999-9999-9999-999999999103', '2425005', '0102030409', 'Muhammad Ali', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666662', 'L', 'active'),
('99999999-9999-9999-9999-999999999104', '2425006', '0102030410', 'Umar bin Khattab', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666662', 'L', 'active'),
('99999999-9999-9999-9999-999999999105', '2425007', '0102030411', 'Zaid bin Tsabit', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666661', 'L', 'active'),
('99999999-9999-9999-9999-999999999106', '2425008', '0102030412', 'Hafsah binti Umar', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666663', 'P', 'active'),
('99999999-9999-9999-9999-999999999107', '2425009', '0102030413', 'Ruqayyah', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666663', 'P', 'active'),
('99999999-9999-9999-9999-999999999108', '2425010', '0102030414', 'Usamah bin Zaid', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666664', 'L', 'active'),
('99999999-9999-9999-9999-999999999109', '2425011', '0102030415', 'Bilal bin Rabah', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666664', 'L', 'active'),
('99999999-9999-9999-9999-999999999110', '2425012', '0102030416', 'Zubair bin Awwam', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666664', 'L', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.parents (id, full_name, phone, email) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101', 'Bapak Ali Akbar', '081111111111', 'ali.akbar@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102', 'Ibu Khadijah', '082222222222', 'khadijah@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103', 'Bapak Usman Hasan', '083333333333', 'usman.hasan@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104', 'Bapak Zaid Abdullah', '084444444444', 'zaid.abdullah@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105', 'Ibu Aisyah', '085555555555', 'aisyah@ortu.demo')
ON CONFLICT DO NOTHING;

INSERT INTO public.student_parent_links (student_id, parent_id, relationship, is_primary) VALUES 
('99999999-9999-9999-9999-999999999101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101', 'father', true),
('99999999-9999-9999-9999-999999999102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102', 'mother', true),
('99999999-9999-9999-9999-999999999103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103', 'father', true),
('99999999-9999-9999-9999-999999999104', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104', 'father', true),
('99999999-9999-9999-9999-999999999105', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105', 'mother', true)
ON CONFLICT DO NOTHING;
