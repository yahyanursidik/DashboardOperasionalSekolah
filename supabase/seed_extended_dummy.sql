-- =========================================================================
-- EXTENDED DUMMY DATA SCRIPT
-- Jalankan script ini di Supabase SQL Editor untuk mendapatkan lebih banyak data dummy
-- =========================================================================

-- 1. INSERT STUDENTS (Tambahan 10 Siswa Dummy)
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

-- UPDATE 2 SISWA LAMA AGAR PUNYA CLASS_ID
UPDATE public.students SET class_id = '66666666-6666-6666-6666-666666666661' WHERE id = '99999999-9999-9999-9999-999999999991';
UPDATE public.students SET class_id = '66666666-6666-6666-6666-666666666663' WHERE id = '99999999-9999-9999-9999-999999999992';

-- 2. INSERT PARENTS (Orang Tua Dummy)
INSERT INTO public.parents (id, full_name, phone, email) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101', 'Bapak Ali Akbar', '081111111111', 'ali.akbar@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102', 'Ibu Khadijah', '082222222222', 'khadijah@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103', 'Bapak Usman Hasan', '083333333333', 'usman.hasan@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104', 'Bapak Zaid Abdullah', '084444444444', 'zaid.abdullah@ortu.demo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105', 'Ibu Aisyah', '085555555555', 'aisyah@ortu.demo')
ON CONFLICT DO NOTHING;

-- 3. LINK STUDENTS TO PARENTS (Hubungan Orang Tua - Anak)
INSERT INTO public.student_parent_links (student_id, parent_id, relationship, is_primary) VALUES 
('99999999-9999-9999-9999-999999999101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101', 'father', true),
('99999999-9999-9999-9999-999999999102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102', 'mother', true),
('99999999-9999-9999-9999-999999999103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103', 'father', true),
('99999999-9999-9999-9999-999999999104', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104', 'father', true),
('99999999-9999-9999-9999-999999999105', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105', 'mother', true),

('99999999-9999-9999-9999-999999999106', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101', 'father', true), -- Adik-kakak
('99999999-9999-9999-9999-999999999107', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102', 'mother', true), -- Adik-kakak
('99999999-9999-9999-9999-999999999108', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103', 'father', true),
('99999999-9999-9999-9999-999999999109', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104', 'father', true),
('99999999-9999-9999-9999-999999999110', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105', 'mother', true)
ON CONFLICT DO NOTHING;

-- 4. INSERT ANNOUNCEMENTS (Pengumuman / Komunikasi)
INSERT INTO public.announcements (title, content, target_type, unit_id, status, publish_at) VALUES 
('Pengumuman Libur Hari Raya Idul Adha 1447 H', 'Diberitahukan kepada seluruh wali murid bahwa kegiatan belajar mengajar diliburkan selama 3 hari terkait perayaan Idul Adha.', 'all', null, 'terkirim', now() - interval '2 days'),
('Pengambilan Raport Semester Ganjil', 'Pengambilan raport akan dilaksanakan pada hari Sabtu pukul 08:00 WIB. Mohon kehadiran Bapak/Ibu tepat waktu.', 'unit', '22222222-2222-2222-2222-222222222222', 'terjadwal', now() + interval '5 days'),
('Kegiatan Mabit & Bina Ruhiyah SMPIT', 'Siswa SMPIT diwajibkan mengikuti mabit pada akhir pekan ini di masjid sekolah. Silakan membawa perlengkapan pribadi.', 'unit', '33333333-3333-3333-3333-333333333333', 'terkirim', now() - interval '1 days')
ON CONFLICT DO NOTHING;
