-- =========================================================================
-- DUMMY DATA UNTUK JURNAL & REKAM JEJAK SISWA
-- Eksekusi script ini SETELAH menjalankan script create_student_journals.sql
-- =========================================================================

-- 1. TAMBAH KELAS & SISWA TKIT (Agar bisa mendemokan STPPA khusus PAUD)
INSERT INTO public.classes (id, unit_id, academic_year_id, name, grade_level, capacity) VALUES 
('66666666-6666-6666-6666-666666666665', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'TK B - Salman', 0, 15)
ON CONFLICT DO NOTHING;

INSERT INTO public.students (id, nis, nisn, full_name, unit_id, class_id, gender, status) VALUES 
('99999999-9999-9999-9999-999999999201', '2425020', '0102030420', 'Ananda Yusuf', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666665', 'L', 'active'),
('99999999-9999-9999-9999-999999999202', '2425021', '0102030421', 'Aisyah Rania', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666665', 'P', 'active')
ON CONFLICT DO NOTHING;

-- 2. INSERT JURNAL & REKAM JEJAK (Untuk SDIT, SMPIT, dan TKIT)
INSERT INTO public.student_journals (student_id, category, title, description, action_taken, date_recorded, visibility, academic_year_id, unit_id, stppa_metrics)
VALUES
-- JURNAL TKIT (STPPA & ANEKDOT)
('99999999-9999-9999-9999-999999999201', 'stppa', 'Observasi Bermain Balok & Berbagi', 'Yusuf hari ini bermain balok dan berhasil membangun menara. Ia juga mau berbagi balok dengan temannya tanpa diminta.', null, '2024-08-10', 'parents', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '{"NAM": "BSH", "FM": "BSH", "KOG": "BSB", "SOSEM": "BSH"}'),
('99999999-9999-9999-9999-999999999202', 'anekdot', 'Menangis saat ditinggal ibu', 'Pagi ini Aisyah menangis kencang selama 15 menit saat ibunya pulang. Namun setelah diajak melihat ikan di kolam, ia mulai tenang dan mau bergabung dalam lingkaran (circle time).', 'Mendampingi secara khusus saat transisi pagi.', '2024-08-12', 'internal', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', null),

-- JURNAL SDIT (AKADEMIK & KENDALA)
('99999999-9999-9999-9999-999999999101', 'akademik', 'Pencapaian Hafalan Juz 30', 'Alhamdulillah, ananda Aisyah Putri telah berhasil menyelesaikan hafalan surat An-Naba dengan tajwid yang sangat baik.', 'Memberikan sertifikat apresiasi di kelas.', '2024-09-01', 'parents', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', null),
('99999999-9999-9999-9999-999999999103', 'kendala', 'Kesulitan Membaca Huruf Sambung', 'Muhammad Ali masih sering tertukar membedakan huruf b, d, dan p saat membaca kalimat bersambung. Kosakata bahasa Indonesia perlu diperbanyak.', 'Memberikan waktu membaca ekstra 10 menit setelah jam istirahat.', '2024-09-05', 'internal', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', null),

-- JURNAL SMPIT (KASUS, EKSKUL, KESEHATAN)
('99999999-9999-9999-9999-999999999106', 'ekskul', 'Juara 1 Lomba Panahan', 'Hafsah mewakili sekolah di lomba Panahan tingkat Kabupaten dan berhasil meraih medali emas.', null, '2024-08-20', 'parents', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', null),
('99999999-9999-9999-9999-999999999108', 'kasus', 'Terlambat Salat Dzuhur Berjamaah', 'Usamah ditemukan masih bermain basket di lapangan saat iqamah salat dzuhur sudah berkumandang. Ia terlambat bergabung ke masjid.', 'Diberikan teguran lisan dan edukasi tentang kedisiplinan beribadah.', '2024-09-10', 'internal', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', null),
('99999999-9999-9999-9999-999999999992', 'kesehatan', 'Maag Kambuh di Sekolah', 'Khadijah mengeluh sakit perut yang hebat di jam ke-3. Setelah diperiksa di UKS, ternyata maag kambuh karena belum sarapan.', 'Diberikan obat maag anak dan teh hangat manis. Menghubungi orang tua untuk menjemput.', '2024-09-12', 'parents', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', null);
