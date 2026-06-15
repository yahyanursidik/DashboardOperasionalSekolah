-- =========================================================================
-- OWASP SECURITY PATCH: MIGRASI ORANG TUA KE SUPABASE AUTH
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    prt RECORD;
    new_user_id uuid;
    prt_email text;
BEGIN
    FOR prt IN 
        SELECT id, email, full_name, user_id 
        FROM public.parents 
        WHERE user_id IS NULL
    LOOP
        new_user_id := gen_random_uuid();
        
        -- Gunakan email asli jika ada, jika tidak buat email dummy dari ID
        prt_email := COALESCE(prt.email, prt.id || '@parent.demo');

        -- 1. Insert ke auth.users
        INSERT INTO auth.users (
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
            new_user_id,
            'authenticated',
            'authenticated',
            prt_email,
            crypt('parent123', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', prt.full_name, 'role', 'parent'),
            now(),
            now()
        );

        -- 2. Insert ke public.profiles
        INSERT INTO public.profiles (
            id,
            full_name,
            is_active
        ) VALUES (
            new_user_id,
            prt.full_name,
            true
        ) ON CONFLICT (id) DO NOTHING;

        -- 3. Update parent.user_id
        UPDATE public.parents
        SET user_id = new_user_id, email = prt_email
        WHERE id = prt.id;
        
    END LOOP;
END $$;

-- 4. Buat RPC untuk mendapatkan email orang tua dari NISN/NIS siswa (sebagai jembatan login)
CREATE OR REPLACE FUNCTION get_parent_login_email_by_student(p_nisn text, p_nis text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_email text;
BEGIN
    SELECT p.email INTO found_email
    FROM public.students s
    JOIN public.student_parent_links spl ON spl.student_id = s.id
    JOIN public.parents p ON spl.parent_id = p.id
    WHERE s.nisn = p_nisn AND s.nis = p_nis
    LIMIT 1;
    
    RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_parent_login_email_by_student(text, text) TO anon, authenticated;
