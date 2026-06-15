-- =========================================================================
-- SKRIP RESET DEMO & AUTO-MIGRASI 100% BEBAS EROR (PENDEKATAN RPC)
-- =========================================================================

-- 1. KOSONGKAN TAUTAN LAMA di tabel pegawai dan orang tua
UPDATE public.employees SET user_id = NULL WHERE email LIKE '%@sekolah.demo' OR email LIKE '%@tsls.demo' OR email LIKE '%@alfatih.demo';
UPDATE public.parents SET user_id = NULL WHERE email LIKE '%@parent.demo' OR email LIKE '%@ortu.demo' OR email LIKE '%@alfatih.demo';

-- 2. "SINGKIRKAN" AKUN LAMA (Agar tidak bentrok saat Auto-Signup)
UPDATE auth.users 
SET email = email || '_broken_' || gen_random_uuid()::text
WHERE email IN (
  'guru1@sekolah.demo', 'guru_baru@tsls.demo', 'ortu_baru@tsls.demo',
  'ali.akbar@ortu.demo', 'bapak.budi@alfatih.demo', 'ustadz.ahmad@alfatih.demo', 'ustadzah.siti@alfatih.demo'
) OR email LIKE '%@parent.demo' OR email LIKE '%@tsls.demo';

-- =========================================================================
-- 3. PERBAIKAN TRIGGER: KEMBALIKAN FUNGSI BAWAAN AGAR TIDAK CRASH
-- =========================================================================

-- A. TRIGGER SEBELUM INSERT: Hanya untuk konfirmasi email
CREATE OR REPLACE FUNCTION public.auto_confirm_email_on_signup()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_confirm_user_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email_on_signup();

-- B. KEMBALIKAN FUNGSI BAWAAN KE STANDAR (Hanya membuat profil)
-- Karena memaksakan update di sini sering ditolak database.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
END;
$$ language plpgsql security definer;

-- =========================================================================
-- 4. BUAT RPC UNTUK MENAUTKAN AKUN (Akan dipanggil aplikasi setelah berhasil masuk)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.link_my_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
BEGIN
  IF v_user_id IS NULL OR v_email IS NULL THEN
    RETURN false;
  END IF;

  -- Tautkan ke pegawai
  UPDATE public.employees
  SET user_id = v_user_id
  WHERE email = v_email AND user_id IS NULL;

  -- Tautkan ke orang tua
  UPDATE public.parents
  SET user_id = v_user_id
  WHERE email = v_email AND user_id IS NULL;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_my_account() TO authenticated;
