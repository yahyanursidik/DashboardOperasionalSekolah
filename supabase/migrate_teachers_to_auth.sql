-- =========================================================================
-- OWASP SECURITY PATCH: MIGRASI PEGAWAI KE SUPABASE AUTH
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    emp RECORD;
    new_user_id uuid;
    emp_email text;
BEGIN
    FOR emp IN 
        SELECT id, nik, email, full_name, user_id 
        FROM public.employees 
        WHERE user_id IS NULL
    LOOP
        -- Buat UUID untuk auth.users
        new_user_id := gen_random_uuid();
        
        -- Gunakan email asli jika ada, jika tidak, buat email dummy dari NIK
        emp_email := COALESCE(emp.email, emp.nik || '@tsls.demo');

        -- 1. Insert ke auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            emp_email,
            crypt('sekolah123', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', emp.full_name, 'role', 'guru'),
            now(),
            now()
        );

        -- 2. Insert ke public.profiles
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            is_active
        ) VALUES (
            new_user_id,
            emp_email,
            emp.full_name,
            'guru',
            true
        ) ON CONFLICT (id) DO NOTHING;

        -- 3. Update employee.user_id
        UPDATE public.employees
        SET user_id = new_user_id, email = emp_email
        WHERE id = emp.id;
        
    END LOOP;
END $$;

-- 4. Buat RPC untuk mendapatkan email berdasarkan NIK (untuk memudahkan proses login frontend tanpa membocorkan data)
CREATE OR REPLACE FUNCTION get_login_email_by_identifier(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_email text;
BEGIN
    -- Cek tabel employees (apakah identifier = nik atau email)
    SELECT email INTO found_email
    FROM public.employees
    WHERE nik = p_identifier OR email = p_identifier
    LIMIT 1;
    
    RETURN found_email;
END;
$$;

-- 5. Berikan akses publik agar bisa dipanggil saat sebelum login
GRANT EXECUTE ON FUNCTION get_login_email_by_identifier(text) TO anon, authenticated;
