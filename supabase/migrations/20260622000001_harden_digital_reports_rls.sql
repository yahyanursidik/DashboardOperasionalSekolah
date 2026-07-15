-- Helper Function: Check if user is parent of a student
CREATE OR REPLACE FUNCTION public.is_parent_of_student(target_student_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.student_parent_links spl
    WHERE spl.parent_id = auth.uid() 
    AND spl.student_id = target_student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The schema may have been provisioned before migration history was linked.
-- Recreate this migration's policies so reruns converge to the intended RLS.
DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND policyname = ANY (ARRAY[
        'Anyone can read active report periods', 'Admin can manage report periods',
        'Staff can read templates', 'Admin manage templates',
        'Staff can read template sections', 'Admin manage template sections',
        'Staff can read template items', 'Admin manage template items',
        'Admins and Kepsek can read all reports', 'Wakasek can read reports in their unit',
        'Teachers can read reports', 'Parents can read published reports of their children',
        'Admins can manage reports', 'Staff can update report status',
        'Staff can manage scores', 'Parents can read visible scores of published reports',
        'Staff can manage notes', 'Parents can read visible notes of published reports',
        'Staff can manage review logs', 'Admin manage publish logs',
        'Staff can read all receipts', 'Parents can read their own receipts',
        'Parents can insert their own receipts', 'Staff can manage pdf exports',
        'Parents can read pdf exports of their children', 'Staff can manage PDFs',
        'Parents can view PDFs of their children'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  END LOOP;
END;
$$;

-------------------------------------------------------------------------------
-- 1. REPORT PERIODS
-------------------------------------------------------------------------------
ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for report_periods" ON public.report_periods;
DROP POLICY IF EXISTS "Admin full access for report_periods" ON public.report_periods;

CREATE POLICY "Anyone can read active report periods"
  ON public.report_periods FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek')
  );

CREATE POLICY "Admin can manage report periods"
  ON public.report_periods FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin')
  );

-------------------------------------------------------------------------------
-- 2. REPORT TEMPLATES
-------------------------------------------------------------------------------
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_template_items ENABLE ROW LEVEL SECURITY;

-- Drop loose policies
DROP POLICY IF EXISTS "Public read access for report_templates" ON public.report_templates;
DROP POLICY IF EXISTS "Public read access for report_template_sections" ON public.report_template_sections;
DROP POLICY IF EXISTS "Public read access for report_template_items" ON public.report_template_items;

-- Internal staff can read templates
CREATE POLICY "Staff can read templates"
  ON public.report_templates FOR SELECT
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

CREATE POLICY "Admin manage templates"
  ON public.report_templates FOR ALL
  TO authenticated
  USING (public.has_role('super_admin') OR public.has_role('admin'));

-- Sections
CREATE POLICY "Staff can read template sections"
  ON public.report_template_sections FOR SELECT
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

CREATE POLICY "Admin manage template sections"
  ON public.report_template_sections FOR ALL
  TO authenticated
  USING (public.has_role('super_admin') OR public.has_role('admin'));

-- Items
CREATE POLICY "Staff can read template items"
  ON public.report_template_items FOR SELECT
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

CREATE POLICY "Admin manage template items"
  ON public.report_template_items FOR ALL
  TO authenticated
  USING (public.has_role('super_admin') OR public.has_role('admin'));


-------------------------------------------------------------------------------
-- 3. STUDENT REPORTS (Main Report Headers)
-------------------------------------------------------------------------------
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;

-- Drop old
DROP POLICY IF EXISTS "Public read access for student_reports" ON public.student_reports;
DROP POLICY IF EXISTS "Admin full access for student_reports" ON public.student_reports;

-- SuperAdmin, Admin, Kepsek can read ALL reports
CREATE POLICY "Admins and Kepsek can read all reports"
  ON public.student_reports FOR SELECT
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.is_kepsek()
  );

-- Wakasek can read reports in their allowed units (using existing can_access_unit)
CREATE POLICY "Wakasek can read reports in their unit"
  ON public.student_reports FOR SELECT
  TO authenticated
  USING (
    public.has_role('wakasek') AND (
      public.can_access_unit((SELECT unit_id FROM public.classes WHERE id = student_reports.class_id))
      OR public.can_access_unit(NULL) -- If they have global wakasek role
    )
  );

-- Teachers and Homerooms can read reports (MVP: all teachers can read to input)
CREATE POLICY "Teachers can read reports"
  ON public.student_reports FOR SELECT
  TO authenticated
  USING (
    public.has_role('teacher') OR public.has_role('homeroom')
  );

-- PARENTS can only read PUBLISHED reports of THEIR OWN children
CREATE POLICY "Parents can read published reports of their children"
  ON public.student_reports FOR SELECT
  TO authenticated
  USING (
    status = 'published' AND public.is_parent_of_student(student_id)
  );

-- Admins can insert/update all
CREATE POLICY "Admins can manage reports"
  ON public.student_reports FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin')
  );

-- Reviewers can update status
CREATE POLICY "Staff can update report status"
  ON public.student_reports FOR UPDATE
  TO authenticated
  USING (
    public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('homeroom') OR public.has_role('teacher')
  );


-------------------------------------------------------------------------------
-- 4. STUDENT REPORT SCORES (Nilai)
-------------------------------------------------------------------------------
ALTER TABLE public.student_report_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for student_report_scores" ON public.student_report_scores;

-- Staff can read and write scores
CREATE POLICY "Staff can manage scores"
  ON public.student_report_scores FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

-- Parents can read scores IF the report is published AND the item is parent_visible
CREATE POLICY "Parents can read visible scores of published reports"
  ON public.student_report_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_reports sr
      WHERE sr.id = student_report_scores.report_id
      AND sr.status = 'published'
      AND public.is_parent_of_student(sr.student_id)
    )
    AND EXISTS (
      SELECT 1 FROM public.report_template_items rti
      WHERE rti.id = student_report_scores.item_id
      AND (rti.parent_visible = true OR rti.parent_visible IS NULL)
    )
  );


-------------------------------------------------------------------------------
-- 5. STUDENT REPORT NOTES (Catatan)
-------------------------------------------------------------------------------
ALTER TABLE public.student_report_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for student_report_notes" ON public.student_report_notes;

-- Staff can manage notes
CREATE POLICY "Staff can manage notes"
  ON public.student_report_notes FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

-- Parents can read notes IF the report is published AND note is parent_visible
CREATE POLICY "Parents can read visible notes of published reports"
  ON public.student_report_notes FOR SELECT
  TO authenticated
  USING (
    parent_visible = true
    AND EXISTS (
      SELECT 1 FROM public.student_reports sr
      WHERE sr.id = student_report_notes.report_id
      AND sr.status = 'published'
      AND public.is_parent_of_student(sr.student_id)
    )
  );


-------------------------------------------------------------------------------
-- 6. REPORT REVIEWS & PUBLISH LOGS
-------------------------------------------------------------------------------
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_publish_logs ENABLE ROW LEVEL SECURITY;

-- Internal staff can read and insert review logs
CREATE POLICY "Staff can manage review logs"
  ON public.report_reviews FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

CREATE POLICY "Admin manage publish logs"
  ON public.report_publish_logs FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin')
  );

-- PARENTS HAVE NO ACCESS TO report_reviews OR report_publish_logs


-------------------------------------------------------------------------------
-- 7. PARENT REPORT READS
-------------------------------------------------------------------------------
ALTER TABLE public.parent_report_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for parent_report_reads" ON public.parent_report_reads;

-- Staff can read all read receipts
CREATE POLICY "Staff can read all receipts"
  ON public.parent_report_reads FOR SELECT
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

-- Parents can read and insert THEIR OWN read receipts
CREATE POLICY "Parents can read their own receipts"
  ON public.parent_report_reads FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert their own receipts"
  ON public.parent_report_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.student_reports sr
      WHERE sr.id = report_id
      AND sr.status = 'published'
      AND public.is_parent_of_student(sr.student_id)
    )
  );


-------------------------------------------------------------------------------
-- 8. REPORT PDF EXPORTS
-------------------------------------------------------------------------------
ALTER TABLE public.report_pdf_exports ENABLE ROW LEVEL SECURITY;

-- Staff can manage pdf exports
CREATE POLICY "Staff can manage pdf exports"
  ON public.report_pdf_exports FOR ALL
  TO authenticated
  USING (
    public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
  );

-- Parents can only view PDF export logs for their children's published reports
CREATE POLICY "Parents can read pdf exports of their children"
  ON public.report_pdf_exports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_reports sr
      WHERE sr.id = report_pdf_exports.report_id
      AND sr.status = 'published'
      AND public.is_parent_of_student(sr.student_id)
    )
  );


-------------------------------------------------------------------------------
-- 9. STORAGE BUCKET POLICIES (report_pdfs)
-------------------------------------------------------------------------------
-- Assuming the bucket is named 'report_pdfs'

-- 9.1 Super admin and staff can do everything with PDFs
CREATE POLICY "Staff can manage PDFs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'report_pdfs' AND (
      public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('kepsek') OR public.has_role('wakasek') OR public.has_role('teacher') OR public.has_role('homeroom')
    )
  );

-- 9.2 Parents can ONLY read PDFs if the filename contains the student ID or they are linked
-- Note: Since storage objects don't easily JOIN with our tables in RLS without complex functions,
-- and our filenames are formatted like 'report-PDF-[report_id]-[timestamp].pdf', 
-- we can do a lookup using a subquery based on the filename or metadata.
-- For a robust approach, we join on the report_pdf_exports table which maps file_path to report_id.

CREATE POLICY "Parents can view PDFs of their children"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report_pdfs' AND 
    EXISTS (
      SELECT 1 FROM public.report_pdf_exports pe
      JOIN public.student_reports sr ON sr.id = pe.report_id
      WHERE position(pe.file_url in storage.objects.name) > 0
      AND sr.status = 'published'
      AND public.is_parent_of_student(sr.student_id)
    )
  );
