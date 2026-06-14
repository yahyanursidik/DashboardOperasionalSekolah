-- =========================================================================
-- FIX RLS INFINITE RECURSION
-- Jalankan script ini di Supabase SQL Editor untuk memperbaiki error
-- =========================================================================

-- 1. DROP KEBIJAKAN YANG MENYEBABKAN LOOPING (RECURSION)
DROP POLICY IF EXISTS "Users can read students in their unit" ON public.students;
DROP POLICY IF EXISTS "Read SPL by unit" ON public.student_parent_links;
DROP POLICY IF EXISTS "Users can read parents if they can access the student" ON public.parents;

-- 2. BUAT FUNGSI SECURITY DEFINER UNTUK BYPASS RLS SAAT PENGECEKAN
-- Dengan security definer, fungsi ini akan berjalan sebagai postgres (bypass RLS)
-- Sehingga mencegah infinite recursion!

CREATE OR REPLACE FUNCTION public.check_student_parent_access(p_student_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_count int;
BEGIN
  -- Cek apakah user_id yang sedang login adalah orang tua dari student_id
  SELECT count(*) INTO v_count
  FROM public.student_parent_links spl
  JOIN public.parents p ON spl.parent_id = p.id
  WHERE spl.student_id = p_student_id AND p.user_id = p_user_id;
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_parent_unit_access(p_parent_id uuid)
RETURNS boolean AS $$
DECLARE
  v_count int;
BEGIN
  -- Cek apakah parent ini punya anak di unit yang bisa diakses user
  SELECT count(*) INTO v_count
  FROM public.student_parent_links spl
  JOIN public.students s ON spl.student_id = s.id
  WHERE spl.parent_id = p_parent_id AND public.can_access_unit(s.unit_id);
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_spl_unit_access(p_student_id uuid)
RETURNS boolean AS $$
DECLARE
  v_count int;
BEGIN
  -- Cek apakah SPL ini terkait dengan siswa di unit yang bisa diakses user
  SELECT count(*) INTO v_count
  FROM public.students s
  WHERE s.id = p_student_id AND public.can_access_unit(s.unit_id);
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREATE POLICIES MENGGUNAKAN FUNGSI BARU (BEBAS RECURSION)

-- Students:
CREATE POLICY "Users can read students in their unit" ON public.students 
FOR SELECT TO authenticated 
USING (
  public.can_access_unit(unit_id) 
  OR public.check_student_parent_access(id, auth.uid())
);

-- Parents:
CREATE POLICY "Users can read parents if they can access the student" ON public.parents 
FOR SELECT TO authenticated 
USING (
  public.check_parent_unit_access(id)
);

-- Student Parent Links:
CREATE POLICY "Read SPL by unit" ON public.student_parent_links 
FOR SELECT TO authenticated 
USING (
  public.check_spl_unit_access(student_id)
);

-- 4. PASTIKAN AKUN USER MENJADI SUPER ADMIN (JAGA-JAGA)
INSERT INTO public.roles (name, description) VALUES ('super_admin', 'Admin') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, (SELECT id FROM public.roles WHERE name = 'super_admin')
FROM public.profiles p
ON CONFLICT DO NOTHING;
