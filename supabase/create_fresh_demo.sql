-- =================================================================================
-- SKRIP PEMBUATAN AKUN DEMO BARU (FRESH)
-- =================================================================================

DO $$
DECLARE
  new_teacher_id uuid := gen_random_uuid();
  new_parent_id uuid := gen_random_uuid();
  new_student_uuid uuid := gen_random_uuid();
  new_parent_profile_id uuid := gen_random_uuid();
  demo_unit_id uuid;
BEGIN
  -- Dapatkan sembarang unit_id untuk memenuhi constraint not-null
  SELECT id INTO demo_unit_id FROM public.units LIMIT 1;

  -- 1. Buat User Guru di Auth Supabase
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
      new_teacher_id, 'authenticated', 'authenticated', 'guru_baru@tsls.demo', 
      crypt('sekolah123', gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', 
      '{"full_name":"Guru Baru Demo","role":"guru"}', now(), now()
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
      gen_random_uuid(), new_teacher_id, 
      jsonb_build_object('sub', new_teacher_id, 'email', 'guru_baru@tsls.demo', 'email_verified', true), 
      'email', 'guru_baru@tsls.demo', now(), now(), now()
  );

  -- 2. Masukkan ke tabel employees (Jabatan: guru)
  INSERT INTO public.employees (id, nik, email, full_name, position, user_id, status)
  VALUES (gen_random_uuid(), 'EMP999', 'guru_baru@tsls.demo', 'Guru Baru Demo', 'guru', new_teacher_id, 'active');

  -- 3. Buat User Orang Tua di Auth Supabase
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
      new_parent_id, 'authenticated', 'authenticated', 'ortu_baru@tsls.demo', 
      crypt('parent123', gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', 
      '{"full_name":"Ortu Baru Demo","role":"parent"}', now(), now()
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
      gen_random_uuid(), new_parent_id, 
      jsonb_build_object('sub', new_parent_id, 'email', 'ortu_baru@tsls.demo', 'email_verified', true), 
      'email', 'ortu_baru@tsls.demo', now(), now(), now()
  );

  -- 4. Masukkan Data Siswa & Orang Tua ke tabel public (Wajib: unit_id dan gender)
  INSERT INTO public.students (id, nis, nisn, full_name, unit_id, gender, status)
  VALUES (new_student_uuid, '9999999', '9999999999', 'Siswa Baru Demo', demo_unit_id, 'P', 'active');

  INSERT INTO public.parents (id, user_id, full_name, email)
  VALUES (new_parent_profile_id, new_parent_id, 'Ortu Baru Demo', 'ortu_baru@tsls.demo');

  -- Hubungan wajib bahasa Inggris: father, mother, guardian
  INSERT INTO public.student_parent_links (student_id, parent_id, relationship)
  VALUES (new_student_uuid, new_parent_profile_id, 'father');
END $$;
