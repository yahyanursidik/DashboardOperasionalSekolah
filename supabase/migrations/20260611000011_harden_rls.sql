-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.auth_user_roles()
RETURNS TABLE(role_name text, unit_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, ur.unit_id
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(target_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.auth_user_roles() WHERE role_name = target_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role('super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_kepsek()
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role('kepsek');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_user_unit_ids()
RETURNS uuid[] AS $$
DECLARE
  result uuid[];
BEGIN
  SELECT array_agg(ur.unit_id) INTO result
  FROM public.auth_user_roles() ur
  WHERE ur.unit_id IS NOT NULL;
  
  RETURN coalesce(result, '{}'::uuid[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_unit(target_unit_id uuid)
RETURNS boolean AS $$
BEGIN
  IF public.is_super_admin() OR public.is_kepsek() THEN
    RETURN true;
  END IF;
  
  -- Admin Keuangan has access across units usually, but let's stick to unit assignments if provided.
  RETURN target_unit_id = ANY(public.auth_user_unit_ids()) OR target_unit_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_user_class_ids()
RETURNS uuid[] AS $$
DECLARE
  result uuid[];
BEGIN
  SELECT array_agg(ta.class_id) INTO result
  FROM public.teacher_assignments ta
  JOIN public.teachers t ON ta.teacher_id = t.id
  WHERE t.user_id = auth.uid() AND ta.class_id IS NOT NULL;
  
  RETURN coalesce(result, '{}'::uuid[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated full access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow authenticated full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated full access to units" ON public.units;
DROP POLICY IF EXISTS "Allow authenticated full access to academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Allow authenticated full access to semesters" ON public.semesters;
DROP POLICY IF EXISTS "Allow authenticated full access to classes" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated full access to students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated full access to parents" ON public.parents;
DROP POLICY IF EXISTS "Allow authenticated full access to student_parent_links" ON public.student_parent_links;
DROP POLICY IF EXISTS "Allow authenticated full access to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow authenticated full access to teacher_assignments" ON public.teacher_assignments;
DROP POLICY IF EXISTS "Allow authenticated full access to admin_tasks" ON public.admin_tasks;
DROP POLICY IF EXISTS "Allow authenticated full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated full access to attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow authenticated full access to document_types" ON public.document_types;
DROP POLICY IF EXISTS "Allow authenticated full access to documents" ON public.documents;
DROP POLICY IF EXISTS "Allow authenticated full access to announcements" ON public.announcements;

-- 3. New Strict Policies

-- PROFILES
CREATE POLICY "Super admins can do all on profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ROLES
CREATE POLICY "Super admins can do all on roles" ON public.roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Anyone can read roles" ON public.roles FOR SELECT TO authenticated USING (true);

-- USER_ROLES
CREATE POLICY "Super admins can do all on user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- UNITS
CREATE POLICY "Super admins can do all on units" ON public.units FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read assigned units" ON public.units FOR SELECT TO authenticated USING (public.can_access_unit(id));

-- ACADEMIC YEARS & SEMESTERS
CREATE POLICY "Super admins can do all on academic_years" ON public.academic_years FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Anyone can read academic_years" ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can do all on semesters" ON public.semesters FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Anyone can read semesters" ON public.semesters FOR SELECT TO authenticated USING (true);

-- CLASSES
CREATE POLICY "Super admins can do all on classes" ON public.classes FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read classes in their unit" ON public.classes FOR SELECT TO authenticated USING (public.can_access_unit(unit_id));
CREATE POLICY "Admins can insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (public.can_access_unit(unit_id) AND (public.has_role('admin_unit') OR public.has_role('wakasek') OR public.has_role('admin_sekolah')));
CREATE POLICY "Admins can update classes" ON public.classes FOR UPDATE TO authenticated USING (public.can_access_unit(unit_id) AND (public.has_role('admin_unit') OR public.has_role('wakasek') OR public.has_role('admin_sekolah')));

-- STUDENTS
CREATE POLICY "Super admins can do all on students" ON public.students FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read students in their unit" ON public.students FOR SELECT TO authenticated USING (public.can_access_unit(unit_id) OR id IN (SELECT student_id FROM public.student_parent_links spl JOIN public.parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()));
CREATE POLICY "Admins can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (public.can_access_unit(unit_id) AND (public.has_role('admin_unit') OR public.has_role('wakasek') OR public.has_role('admin_sekolah')));
CREATE POLICY "Admins can update students" ON public.students FOR UPDATE TO authenticated USING (public.can_access_unit(unit_id) AND (public.has_role('admin_unit') OR public.has_role('wakasek') OR public.has_role('admin_sekolah')));

-- TEACHERS & ASSIGNMENTS
CREATE POLICY "Super admins can do all on teachers" ON public.teachers FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read teachers assigned to their unit" ON public.teachers FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.teacher_id = public.teachers.id AND public.can_access_unit(ta.unit_id)
  )
);
CREATE POLICY "Super admins can do all on teacher_assignments" ON public.teacher_assignments FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can read assignments in their unit" ON public.teacher_assignments FOR SELECT TO authenticated USING (public.can_access_unit(unit_id));

-- ATTENDANCE
CREATE POLICY "Super admins can do all on attendance" ON public.attendance_records FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users read attendance in their unit or class" ON public.attendance_records FOR SELECT TO authenticated USING (
  public.can_access_unit(unit_id) OR class_id = ANY(public.auth_user_class_ids())
);
CREATE POLICY "Teachers and operators can insert attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  (public.has_role('operator_absensi') AND public.can_access_unit(unit_id)) OR
  class_id = ANY(public.auth_user_class_ids())
);
CREATE POLICY "Teachers and operators can update attendance" ON public.attendance_records FOR UPDATE TO authenticated USING (
  (public.has_role('operator_absensi') AND public.can_access_unit(unit_id)) OR
  class_id = ANY(public.auth_user_class_ids())
);

-- DOCUMENTS & TYPES
CREATE POLICY "Super admins do all doc_types" ON public.document_types FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users read doc types in their unit" ON public.document_types FOR SELECT TO authenticated USING (public.can_access_unit(unit_id));
CREATE POLICY "Admin dokumen manages doc types" ON public.document_types FOR ALL TO authenticated USING (public.has_role('admin_dokumen')) WITH CHECK (public.has_role('admin_dokumen'));

CREATE POLICY "Super admins do all documents" ON public.documents FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Admin dokumen manages all documents" ON public.documents FOR ALL TO authenticated USING (public.has_role('admin_dokumen')) WITH CHECK (public.has_role('admin_dokumen'));
CREATE POLICY "Users read documents in their unit" ON public.documents FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.document_types dt
    WHERE dt.id = document_type_id AND public.can_access_unit(dt.unit_id)
  )
);

-- ADMIN TASKS
CREATE POLICY "Super admins do all tasks" ON public.admin_tasks FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users read tasks in their unit or assigned to them" ON public.admin_tasks FOR SELECT TO authenticated USING (
  public.can_access_unit(unit_id) OR assigned_to = auth.uid()
);
CREATE POLICY "Kepsek can update tasks" ON public.admin_tasks FOR UPDATE TO authenticated USING (public.is_kepsek());
CREATE POLICY "Assigned users can update their tasks" ON public.admin_tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "Unit admins can create tasks" ON public.admin_tasks FOR INSERT TO authenticated WITH CHECK (
  public.can_access_unit(unit_id) AND (public.has_role('admin_unit') OR public.has_role('wakasek') OR public.has_role('admin_sekolah'))
);

-- ANNOUNCEMENTS
CREATE POLICY "Super admins do all announcements" ON public.announcements FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users read announcements" ON public.announcements FOR SELECT TO authenticated USING (
  target_type = 'all' OR
  (target_type = 'unit' AND public.can_access_unit(unit_id)) OR
  (target_type = 'class' AND class_id = ANY(public.auth_user_class_ids()))
);

-- AUDIT LOGS
CREATE POLICY "Super admins do all audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- PARENTS & LINKS
CREATE POLICY "Super admins can do all on parents" ON public.parents FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Parents read their own data" ON public.parents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read parents if they can access the student" ON public.parents FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.student_parent_links spl
    JOIN public.students s ON spl.student_id = s.id
    WHERE spl.parent_id = public.parents.id AND public.can_access_unit(s.unit_id)
  )
);

CREATE POLICY "Super admins can do all SPL" ON public.student_parent_links FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Parents read their own links" ON public.student_parent_links FOR SELECT TO authenticated USING (
  parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid())
);
CREATE POLICY "Read SPL by unit" ON public.student_parent_links FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = student_id AND public.can_access_unit(s.unit_id)
  )
);
