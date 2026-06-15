-- =========================================================================
-- SKRIP RESET DEMO AMAN (TANPA MENGHAPUS DATA AGAR TIDAK BENTROK)
-- =========================================================================

-- 1. KOSONGKAN TAUTAN LAMA di tabel pegawai dan orang tua
-- Ini memastikan akun baru yang akan dibuat otomatis nanti bisa menempel ke profil yang benar
UPDATE public.employees 
SET user_id = NULL 
WHERE email LIKE '%@sekolah.demo' OR email LIKE '%@tsls.demo' OR email LIKE '%@alfatih.demo';

UPDATE public.parents 
SET user_id = NULL 
WHERE email LIKE '%@parent.demo' OR email LIKE '%@ortu.demo' OR email LIKE '%@alfatih.demo';

-- 2. "SINGKIRKAN" AKUN LAMA (Ubah emailnya agar tidak bentrok saat Auto-Signup)
-- Kita tidak bisa menghapus akun lama karena riwayat datanya (created_by) sudah tersebar di database.
UPDATE auth.users 
SET email = email || '_broken_' || gen_random_uuid()::text
WHERE email IN (
  'guru1@sekolah.demo', 
  'guru_baru@tsls.demo',
  'ortu_baru@tsls.demo',
  'ali.akbar@ortu.demo',
  'bapak.budi@alfatih.demo',
  'ustadz.ahmad@alfatih.demo',
  'ustadzah.siti@alfatih.demo'
) OR email LIKE '%@parent.demo' OR email LIKE '%@tsls.demo';

-- 3. FUNGSI AUTO-MIGRASI SAAT LOGIN GAGAL
CREATE OR REPLACE FUNCTION public.auto_migrate_user_on_signup()
RETURNS trigger AS $$
BEGIN
  -- a. Langsung anggap email terkonfirmasi (Bypass verifikasi email)
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());

  -- b. Langsung tautkan ID baru ini ke tabel pegawai jika emailnya cocok
  UPDATE public.employees
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;

  -- c. Langsung tautkan ID baru ini ke tabel orang tua jika emailnya cocok
  UPDATE public.parents
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PASANG TRIGGER-NYA
DROP TRIGGER IF EXISTS auto_migrate_user_trigger ON auth.users;
CREATE TRIGGER auto_migrate_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_migrate_user_on_signup();
