-- =========================================================================
-- SCRIPT DATA DEMO: SEKOLAH ISLAM (TSLS OS)
-- Cara Penggunaan: Copy seluruh text ini dan jalankan di SQL Editor Supabase
-- =========================================================================

-- Enable pgcrypto untuk hashing password auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. HAPUS DATA LAMA (OPSIONAL, HATI-HATI JIKA DI PRODUCTION)
-- DELETE FROM auth.users WHERE email LIKE '%@alfatih.demo';
-- DELETE FROM public.units;

-- 2. INSERT UNITS (Unit Pendidikan)
INSERT INTO public.units (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'TKIT Al-Fatih'),
('22222222-2222-2222-2222-222222222222', 'SDIT Al-Fatih'),
('33333333-3333-3333-3333-333333333333', 'SMPIT Al-Fatih')
ON CONFLICT DO NOTHING;

-- 3. INSERT ACADEMIC YEARS & SEMESTERS
INSERT INTO public.academic_years (id, name, start_date, end_date, is_active) VALUES 
('44444444-4444-4444-4444-444444444444', '2024/2025', '2024-07-15', '2025-06-20', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.semesters (id, academic_year_id, name, start_date, end_date, is_active) VALUES 
('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444444', 'Ganjil', '2024-07-15', '2024-12-20', false),
('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444444', 'Genap', '2025-01-05', '2025-06-20', true)
ON CONFLICT DO NOTHING;

-- 4. INSERT CLASSES (Kelas)
INSERT INTO public.classes (id, unit_id, academic_year_id, name, grade_level, capacity) VALUES 
('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '1A - Abu Bakar', 1, 25),
('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '1B - Umar', 1, 25),
('66666666-6666-6666-6666-666666666663', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '7A - Utsman', 7, 30),
('66666666-6666-6666-6666-666666666664', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '7B - Ali', 7, 30)
ON CONFLICT DO NOTHING;

-- 5. INSERT USERS (Auth & Profiles)
-- Password default: password123
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES 
('77777777-7777-7777-7777-777777777771', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ustadz.ahmad@alfatih.demo', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Ustadz Ahmad Al-Hafizh"}', now(), now()),
('77777777-7777-7777-7777-777777777772', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ustadzah.siti@alfatih.demo', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Ustadzah Siti Aisyah"}', now(), now()),
('77777777-7777-7777-7777-777777777773', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bapak.budi@alfatih.demo', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Bapak Budi Santoso"}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. INSERT ROLES & USER ROLES
INSERT INTO public.roles (name, description) VALUES 
('guru', 'Ustadz / Ustadzah Pengajar'),
('wali_murid', 'Orang Tua / Wali Siswa')
ON CONFLICT DO NOTHING;

-- Beri role Guru ke Ustadz Ahmad
INSERT INTO public.user_roles (user_id, role_id) 
SELECT '77777777-7777-7777-7777-777777777771', id FROM public.roles WHERE name = 'guru';

-- Beri role Guru ke Ustadzah Siti
INSERT INTO public.user_roles (user_id, role_id) 
SELECT '77777777-7777-7777-7777-777777777772', id FROM public.roles WHERE name = 'guru';

-- 7. INSERT TEACHERS (Guru / Pegawai)
INSERT INTO public.teachers (id, user_id, nip, full_name, status) VALUES 
('88888888-8888-8888-8888-888888888881', '77777777-7777-7777-7777-777777777771', '198001012005011001', 'Ustadz Ahmad Al-Hafizh', 'active'),
('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777772', '198502022010012002', 'Ustadzah Siti Aisyah', 'active')
ON CONFLICT DO NOTHING;

-- 8. INSERT TEACHER ASSIGNMENTS (Penugasan Guru)
INSERT INTO public.teacher_assignments (teacher_id, unit_id, role_type, class_id, academic_year_id) VALUES 
('88888888-8888-8888-8888-888888888881', '22222222-2222-2222-2222-222222222222', 'homeroom', '66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444444'),
('88888888-8888-8888-8888-888888888882', '33333333-3333-3333-3333-333333333333', 'homeroom', '66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444444')
ON CONFLICT DO NOTHING;

-- 9. INSERT STUDENTS (Siswa / Santri)
INSERT INTO public.students (id, nis, nisn, full_name, unit_id, gender, status) VALUES 
('99999999-9999-9999-9999-999999999991', '2425001', '0102030405', 'Abdullah bin Budi', '22222222-2222-2222-2222-222222222222', 'L', 'active'),
('99999999-9999-9999-9999-999999999992', '2425002', '0102030406', 'Khadijah binti Ahmad', '33333333-3333-3333-3333-333333333333', 'P', 'active')
ON CONFLICT DO NOTHING;

-- 10. INSERT PARENTS & LINKS
INSERT INTO public.parents (id, user_id, full_name, phone, email) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '77777777-7777-7777-7777-777777777773', 'Bapak Budi Santoso', '081234567890', 'bapak.budi@alfatih.demo')
ON CONFLICT DO NOTHING;

INSERT INTO public.student_parent_links (student_id, parent_id, relationship, is_primary) VALUES 
('99999999-9999-9999-9999-999999999991', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'father', true)
ON CONFLICT DO NOTHING;

-- 11. INSERT ADMIN TASKS (Tugas / Agenda)
INSERT INTO public.admin_tasks (title, description, unit_id, status, due_date) VALUES 
('Persiapan Rapat Wali Santri', 'Menyiapkan materi kurikulum PAI dan tahfidz untuk dipresentasikan.', '22222222-2222-2222-2222-222222222222', 'belum_mulai', '2024-08-01'),
('Pengecekan Seragam Akhawat', 'Memastikan stok seragam akhawat SMPIT tersedia untuk siswa baru.', '33333333-3333-3333-3333-333333333333', 'diproses', '2024-07-20');

-- 12. INSERT DOCUMENT TYPES (Jenis Dokumen)
INSERT INTO public.document_types (id, name, category, unit_id) VALUES 
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Ijazah TPA/TPQ', 'siswa', '22222222-2222-2222-2222-222222222222'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Sertifikat Hafalan (Tahfidz)', 'siswa', '33333333-3333-3333-3333-333333333333'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'Sertifikat Pelatihan Guru Qur''an', 'guru', null)
ON CONFLICT DO NOTHING;
