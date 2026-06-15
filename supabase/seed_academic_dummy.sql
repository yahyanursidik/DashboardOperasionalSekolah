-- ==========================================
-- DUMMY DATA UNTUK SISTEM AKADEMIK & E-RAPOR
-- ==========================================

DO $$
DECLARE
    v_semester_id UUID;
    v_sd_unit_id UUID;
    v_paud_unit_id UUID;
    v_sd_class_id UUID;
    v_paud_class_id UUID;
    
    v_mapel_mtk UUID := uuid_generate_v4();
    v_mapel_bind UUID := uuid_generate_v4();
    v_mapel_pai UUID := uuid_generate_v4();
    v_mapel_motorik UUID := uuid_generate_v4();
    v_mapel_kognitif UUID := uuid_generate_v4();
    
    v_student RECORD;
BEGIN
    -- 1. Dapatkan Semester Aktif
    SELECT id INTO v_semester_id FROM public.semesters WHERE is_active = true LIMIT 1;
    IF v_semester_id IS NULL THEN
        RAISE NOTICE 'Semester aktif tidak ditemukan. Harap buat semester aktif terlebih dahulu.';
        RETURN;
    END IF;

    -- 2. Dapatkan Unit SD dan PAUD/TK
    SELECT id INTO v_sd_unit_id FROM public.units WHERE name ILIKE '%SD%' LIMIT 1;
    SELECT id INTO v_paud_unit_id FROM public.units WHERE name ILIKE '%TK%' OR name ILIKE '%PAUD%' LIMIT 1;

    -- Jika Unit TK belum ada, kita buatkan Unit PAUD dummy
    IF v_paud_unit_id IS NULL THEN
        v_paud_unit_id := uuid_generate_v4();
        INSERT INTO public.units (id, name, level) VALUES (v_paud_unit_id, 'TK IT / PAUD', 'tk');
    END IF;

    -- 3. Dapatkan/Buat Kelas untuk SD
    IF v_sd_unit_id IS NOT NULL THEN
        SELECT id INTO v_sd_class_id FROM public.classes WHERE unit_id = v_sd_unit_id LIMIT 1;
    END IF;

    -- 4. Dapatkan/Buat Kelas untuk PAUD
    SELECT id INTO v_paud_class_id FROM public.classes WHERE unit_id = v_paud_unit_id LIMIT 1;
    IF v_paud_class_id IS NULL THEN
        v_paud_class_id := uuid_generate_v4();
        INSERT INTO public.classes (id, name, unit_id, capacity) VALUES (v_paud_class_id, 'TK A - Abu Bakar', v_paud_unit_id, 20);
    END IF;

    -- 5. Insert Mata Pelajaran Dummy
    -- Cek dulu kalau belum ada
    IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE code = 'MAT') THEN
        INSERT INTO public.subjects (id, name, code, category) VALUES 
        (v_mapel_mtk, 'Matematika', 'MAT', 'Nasional'),
        (v_mapel_bind, 'Bahasa Indonesia', 'BIND', 'Nasional'),
        (v_mapel_pai, 'Pend. Agama Islam (Diniyah)', 'PAI', 'Khas Sekolah'),
        (v_mapel_motorik, 'Perkembangan Motorik', 'MTRK', 'Khas Sekolah'),
        (v_mapel_kognitif, 'Perkembangan Kognitif', 'KGN', 'Khas Sekolah');
    ELSE
        SELECT id INTO v_mapel_mtk FROM public.subjects WHERE code = 'MAT' LIMIT 1;
        SELECT id INTO v_mapel_bind FROM public.subjects WHERE code = 'BIND' LIMIT 1;
        SELECT id INTO v_mapel_pai FROM public.subjects WHERE code = 'PAI' LIMIT 1;
        SELECT id INTO v_mapel_motorik FROM public.subjects WHERE code = 'MTRK' LIMIT 1;
        SELECT id INTO v_mapel_kognitif FROM public.subjects WHERE code = 'KGN' LIMIT 1;
    END IF;

    -- 6. Insert Siswa Dummy PAUD jika belum ada
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE class_id = v_paud_class_id) THEN
        INSERT INTO public.students (full_name, gender, unit_id, class_id, status) VALUES
        ('Aisyah Azzahra', 'P', v_paud_unit_id, v_paud_class_id, 'active'),
        ('Umar Bin Khattab', 'L', v_paud_unit_id, v_paud_class_id, 'active');
    END IF;

    -- =======================================
    -- 7. GENERATE NILAI SD (ANGKA)
    -- =======================================
    FOR v_student IN SELECT * FROM public.students WHERE class_id = v_sd_class_id LOOP
        -- Matematika
        INSERT INTO public.academic_grades (student_id, subject_id, class_id, semester_id, grade_type, score)
        VALUES 
        (v_student.id, v_mapel_mtk, v_sd_class_id, v_semester_id, 'tugas_1', '85'),
        (v_student.id, v_mapel_mtk, v_sd_class_id, v_semester_id, 'uts', '88'),
        (v_student.id, v_mapel_mtk, v_sd_class_id, v_semester_id, 'uas', '90')
        ON CONFLICT DO NOTHING;

        -- PAI
        INSERT INTO public.academic_grades (student_id, subject_id, class_id, semester_id, grade_type, score)
        VALUES 
        (v_student.id, v_mapel_pai, v_sd_class_id, v_semester_id, 'tugas_1', '95'),
        (v_student.id, v_mapel_pai, v_sd_class_id, v_semester_id, 'uts', '92'),
        (v_student.id, v_mapel_pai, v_sd_class_id, v_semester_id, 'uas', '98')
        ON CONFLICT DO NOTHING;

        -- Rapor SD
        INSERT INTO public.academic_report_cards (student_id, class_id, semester_id, spiritual_predicate, social_predicate, tahsin_predicate, tahfidz_predicate, extracurricular, homeroom_notes)
        VALUES 
        (v_student.id, v_sd_class_id, v_semester_id, 'Sangat Baik (A)', 'Baik (B)', 'Jayyid', 'Juz 30 (Lancar)', 'Pramuka (B), Futsal (A)', 'Pertahankan semangat belajarnya, rajin murajaah hafalan di rumah.')
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- =======================================
    -- 8. GENERATE NILAI PAUD (KUALITATIF)
    -- =======================================
    FOR v_student IN SELECT * FROM public.students WHERE class_id = v_paud_class_id LOOP
        -- Motorik
        INSERT INTO public.academic_grades (student_id, subject_id, class_id, semester_id, grade_type, score)
        VALUES 
        (v_student.id, v_mapel_motorik, v_paud_class_id, v_semester_id, 'tugas_1', 'BSB'),
        (v_student.id, v_mapel_motorik, v_paud_class_id, v_semester_id, 'uts', 'BSH'),
        (v_student.id, v_mapel_motorik, v_paud_class_id, v_semester_id, 'uas', 'BSB')
        ON CONFLICT DO NOTHING;

        -- Kognitif
        INSERT INTO public.academic_grades (student_id, subject_id, class_id, semester_id, grade_type, score)
        VALUES 
        (v_student.id, v_mapel_kognitif, v_paud_class_id, v_semester_id, 'tugas_1', 'MB'),
        (v_student.id, v_mapel_kognitif, v_paud_class_id, v_semester_id, 'uts', 'BSH'),
        (v_student.id, v_mapel_kognitif, v_paud_class_id, v_semester_id, 'uas', 'BSH')
        ON CONFLICT DO NOTHING;

        -- Rapor PAUD
        INSERT INTO public.academic_report_cards (student_id, class_id, semester_id, spiritual_predicate, social_predicate, tahsin_predicate, tahfidz_predicate, extracurricular, homeroom_notes)
        VALUES 
        (v_student.id, v_paud_class_id, v_semester_id, 'BSB', 'BSH', 'Iqro Jilid 2 (BSH)', 'An-Nas s/d Al-Maun (BSB)', 'Mewarnai (BSB)', 'Ananda sangat antusias di kelas. Mulai mandiri dalam makan dan berdoa.')
        ON CONFLICT DO NOTHING;
    END LOOP;

END $$;
