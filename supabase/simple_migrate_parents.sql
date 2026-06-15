-- =========================================================================
-- SIMPLE MIGRATION SCRIPT FOR PARENTS (NO LOOPS)
-- =========================================================================

-- 1. Buat extension pgcrypto (jika belum ada)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Matikan trigger sementara agar tidak bentrok
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- 3. Insert ke auth.users secara langsung
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
)
SELECT 
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    COALESCE(email, CAST(id AS text) || '@parent.demo'),
    crypt('parent123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', full_name, 'role', 'parent'),
    now(),
    now()
FROM public.parents
WHERE user_id IS NULL;

-- 4. Nyalakan trigger kembali
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- 5. (Catatan: Anda mungkin perlu menghubungkan kembali user_id secara manual atau menggunakan skrip lain jika cara ini berhasil).
