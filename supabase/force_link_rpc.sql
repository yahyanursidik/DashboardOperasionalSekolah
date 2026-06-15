-- =========================================================================
-- PERBAIKAN RPC: PAKSA TIMPA USER_ID (TANPA GANTI TIPE KEMBALIAN)
-- =========================================================================

-- Tidak perlu DROP karena tipe kembaliannya tetap boolean
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

  -- Tautkan ke pegawai (TANPA syarat user_id IS NULL, paksa timpa!)
  UPDATE public.employees
  SET user_id = v_user_id
  WHERE email = v_email;

  -- Tautkan ke orang tua (TANPA syarat user_id IS NULL, paksa timpa!)
  UPDATE public.parents
  SET user_id = v_user_id
  WHERE email = v_email;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_my_account() TO authenticated;
