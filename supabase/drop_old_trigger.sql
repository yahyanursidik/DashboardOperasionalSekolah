-- =========================================================================
-- HAPUS TRIGGER LAMA YANG RUSAK & PERBAIKI FUNGSI BAWAAN
-- =========================================================================

-- 1. HAPUS TRIGGER LAMA YANG MEMBUAT CRASH! (Ini biang keroknya)
DROP TRIGGER IF EXISTS auto_migrate_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_migrate_user_on_signup();

-- 2. PASTIKAN FUNGSI BAWAAN KEMBALI NORMAL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
END;
$$ language plpgsql security definer;

-- 3. PASTIKAN TRIGGER BARU UNTUK KONFIRMASI EMAIL TERPASANG
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
