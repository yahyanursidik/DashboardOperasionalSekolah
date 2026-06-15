-- =========================================================================
-- SKRIP RESET DEMO & AUTO-MIGRASI KEKINIAN
-- =========================================================================

-- 1. Kosongkan user_id DULU agar tidak melanggar constraint (foreign key) saat auth.users dihapus
UPDATE public.employees SET user_id = NULL WHERE email LIKE '%@sekolah.demo' OR email LIKE '%@tsls.demo' OR email LIKE '%@alfatih.demo';
UPDATE public.parents SET user_id = NULL WHERE email LIKE '%@parent.demo' OR email LIKE '%@ortu.demo' OR email LIKE '%@alfatih.demo';

-- 2. Hapus SEMUA akun demo lama yang terkorupsi dari sistem Auth
DELETE FROM auth.users 
WHERE email IN (
  'guru1@sekolah.demo', 
  'guru_baru@tsls.demo',
  'ortu_baru@tsls.demo',
  'ali.akbar@ortu.demo',
  'bapak.budi@alfatih.demo',
  'ustadz.ahmad@alfatih.demo',
  'ustadzah.siti@alfatih.demo'
) OR email LIKE '%@parent.demo' OR email LIKE '%@tsls.demo';

-- 3. Buat Fungsi Super Cerdas: Otomatis konfirmasi email & tautkan ke profil saat Sign Up!
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

-- 4. Pasang Trigger-nya ke sistem Auth Supabase
DROP TRIGGER IF EXISTS auto_migrate_user_trigger ON auth.users;
CREATE TRIGGER auto_migrate_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_migrate_user_on_signup();
