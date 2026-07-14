-- Parent portal login should accept either the internal NIS or national NISN.
-- The previous function required both NISN and NIS to match at the same time,
-- which blocked valid parent links when the parent only had the student's NIS.

CREATE OR REPLACE FUNCTION public.get_parent_login_email_by_student(p_nisn text, p_nis text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_parent_id uuid;
    found_email text;
BEGIN
    WITH input_values AS (
      SELECT NULLIF(regexp_replace(COALESCE(p_nisn, ''), '\s+', '', 'g'), '') AS value
      UNION
      SELECT NULLIF(regexp_replace(COALESCE(p_nis, ''), '\s+', '', 'g'), '') AS value
    )
    SELECT p.id, NULLIF(BTRIM(p.email), '') INTO found_parent_id, found_email
    FROM public.students s
    JOIN public.student_parent_links spl ON spl.student_id = s.id
    JOIN public.parents p ON spl.parent_id = p.id
    WHERE (p.is_active IS DISTINCT FROM false)
      AND EXISTS (
        SELECT 1
        FROM input_values input
        WHERE input.value IS NOT NULL
          AND (
            regexp_replace(COALESCE(s.nis, ''), '\s+', '', 'g') = input.value
            OR regexp_replace(COALESCE(s.nisn, ''), '\s+', '', 'g') = input.value
          )
      )
    ORDER BY
      COALESCE(spl.can_access_parent_portal, true) DESC,
      COALESCE(spl.is_primary, false) DESC,
      p.created_at ASC
    LIMIT 1;

    IF found_parent_id IS NULL THEN
      RETURN NULL;
    END IF;

    IF found_email IS NULL THEN
      found_email := 'parent-' || replace(found_parent_id::text, '-', '') || '@parent.demo';

      UPDATE public.parents
      SET email = found_email
      WHERE id = found_parent_id
        AND NULLIF(BTRIM(email), '') IS NULL;
    END IF;

    RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_login_email_by_student(text, text) TO anon, authenticated;
