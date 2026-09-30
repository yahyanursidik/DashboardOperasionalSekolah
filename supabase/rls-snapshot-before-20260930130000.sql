-- Snapshot of every public RLS policy in production before 20260930130000 (restore = drop new + run this).
drop policy if exists "Allow authenticated delete access on academic_grades" on public.academic_grades;
create policy "Allow authenticated delete access on academic_grades" on public.academic_grades as permissive for delete to authenticated using (true);
drop policy if exists "Allow authenticated insert access on academic_grades" on public.academic_grades;
create policy "Allow authenticated insert access on academic_grades" on public.academic_grades as permissive for insert to authenticated with check (true);
drop policy if exists "Allow authenticated read access on academic_grades" on public.academic_grades;
create policy "Allow authenticated read access on academic_grades" on public.academic_grades as permissive for select to authenticated using (true);
drop policy if exists "Allow authenticated update access on academic_grades" on public.academic_grades;
create policy "Allow authenticated update access on academic_grades" on public.academic_grades as permissive for update to authenticated using (true);
drop policy if exists "Allow authenticated delete access on academic_report_cards" on public.academic_report_cards;
create policy "Allow authenticated delete access on academic_report_cards" on public.academic_report_cards as permissive for delete to authenticated using (true);
drop policy if exists "Allow authenticated insert access on academic_report_cards" on public.academic_report_cards;
create policy "Allow authenticated insert access on academic_report_cards" on public.academic_report_cards as permissive for insert to authenticated with check (true);
drop policy if exists "Allow authenticated read access on academic_report_cards" on public.academic_report_cards;
create policy "Allow authenticated read access on academic_report_cards" on public.academic_report_cards as permissive for select to authenticated using (true);
drop policy if exists "Allow authenticated update access on academic_report_cards" on public.academic_report_cards;
create policy "Allow authenticated update access on academic_report_cards" on public.academic_report_cards as permissive for update to authenticated using (true);
drop policy if exists "Anyone can read academic_years" on public.academic_years;
create policy "Anyone can read academic_years" on public.academic_years as permissive for select to authenticated using (true);
drop policy if exists "Super admins can do all on academic_years" on public.academic_years;
create policy "Super admins can do all on academic_years" on public.academic_years as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Assigned users can update their tasks" on public.admin_tasks;
create policy "Assigned users can update their tasks" on public.admin_tasks as permissive for update to authenticated using ((assigned_to = auth.uid()));
drop policy if exists "Kepsek can update tasks" on public.admin_tasks;
create policy "Kepsek can update tasks" on public.admin_tasks as permissive for update to authenticated using (is_kepsek());
drop policy if exists "Super admins do all tasks" on public.admin_tasks;
create policy "Super admins do all tasks" on public.admin_tasks as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Unit admins can create tasks" on public.admin_tasks;
create policy "Unit admins can create tasks" on public.admin_tasks as permissive for insert to authenticated with check ((can_access_unit(unit_id) AND (has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text))));
drop policy if exists "Users read tasks in their unit or assigned to them" on public.admin_tasks;
create policy "Users read tasks in their unit or assigned to them" on public.admin_tasks as permissive for select to authenticated using ((can_access_unit(unit_id) OR (assigned_to = auth.uid())));
drop policy if exists "Admissions managers manage announcements" on public.admission_announcements;
create policy "Admissions managers manage announcements" on public.admission_announcements as permissive for all to authenticated using (admission_is_manager(unit_id)) with check (admission_is_manager(unit_id));
drop policy if exists "Applicants read scoped published announcements" on public.admission_announcements;
create policy "Applicants read scoped published announcements" on public.admission_announcements as permissive for select to authenticated using (((status = 'published'::text) AND ((expires_at IS NULL) OR (expires_at > now())) AND (EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.user_id = auth.uid()) AND (a.archived_at IS NULL) AND (a.unit_id = admission_announcements.unit_id) AND (a.academic_year_id = admission_announcements.academic_year_id) AND ((admission_announcements.batch_id IS NULL) OR (admission_announcements.batch_id = a.batch_id)))))));
drop policy if exists "Admissions managers read applicant edit logs" on public.admission_applicant_edit_logs;
create policy "Admissions managers read applicant edit logs" on public.admission_applicant_edit_logs as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants applicant
  WHERE ((applicant.id = admission_applicant_edit_logs.applicant_id) AND admission_is_manager(applicant.unit_id)))));
drop policy if exists "Applicants read own edit logs" on public.admission_applicant_edit_logs;
create policy "Applicants read own edit logs" on public.admission_applicant_edit_logs as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants applicant
  WHERE ((applicant.id = admission_applicant_edit_logs.applicant_id) AND (applicant.user_id = auth.uid())))));
drop policy if exists "Admissions managers manage admission_assessments" on public.admission_assessments;
create policy "Admissions managers manage admission_assessments" on public.admission_assessments as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_assessments.applicant_id) AND admission_is_manager(a.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_assessments.applicant_id) AND admission_is_manager(a.unit_id)))));
drop policy if exists "Applicants view own admission_assessments" on public.admission_assessments;
create policy "Applicants view own admission_assessments" on public.admission_assessments as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_assessments.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Admissions managers manage batches" on public.admission_batches;
create policy "Admissions managers manage batches" on public.admission_batches as permissive for all to authenticated using (admission_is_manager(unit_id)) with check (admission_is_manager(unit_id));
drop policy if exists "Public views published admission batches" on public.admission_batches;
create policy "Public views published admission batches" on public.admission_batches as permissive for select to anon, authenticated using ((status = 'published'::text));
drop policy if exists "Admissions managers manage admission_checklist_responses" on public.admission_checklist_responses;
create policy "Admissions managers manage admission_checklist_responses" on public.admission_checklist_responses as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_checklist_responses.applicant_id) AND admission_is_manager(a.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_checklist_responses.applicant_id) AND admission_is_manager(a.unit_id)))));
drop policy if exists "Applicants manage own checklist" on public.admission_checklist_responses;
create policy "Applicants manage own checklist" on public.admission_checklist_responses as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_checklist_responses.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Applicants update own checklist" on public.admission_checklist_responses;
create policy "Applicants update own checklist" on public.admission_checklist_responses as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_checklist_responses.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Applicants view own admission_checklist_responses" on public.admission_checklist_responses;
create policy "Applicants view own admission_checklist_responses" on public.admission_checklist_responses as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_checklist_responses.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Admissions managers manage admission_documents" on public.admission_documents;
create policy "Admissions managers manage admission_documents" on public.admission_documents as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_documents.applicant_id) AND admission_is_manager(a.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_documents.applicant_id) AND admission_is_manager(a.unit_id)))));
drop policy if exists "Applicants manage own documents" on public.admission_documents;
create policy "Applicants manage own documents" on public.admission_documents as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_documents.applicant_id) AND (a.user_id = auth.uid()) AND (a.workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text]))))));
drop policy if exists "Applicants update own documents" on public.admission_documents;
create policy "Applicants update own documents" on public.admission_documents as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_documents.applicant_id) AND (a.user_id = auth.uid()) AND (a.workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text]))))));
drop policy if exists "Applicants view own admission_documents" on public.admission_documents;
create policy "Applicants view own admission_documents" on public.admission_documents as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_documents.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Admissions managers manage fee rules" on public.admission_fee_rules;
create policy "Admissions managers manage fee rules" on public.admission_fee_rules as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admission_batches b
  WHERE ((b.id = admission_fee_rules.batch_id) AND admission_is_manager(b.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admission_batches b
  WHERE ((b.id = admission_fee_rules.batch_id) AND admission_is_manager(b.unit_id)))));
drop policy if exists "Admissions managers manage lead activities" on public.admission_lead_activities;
create policy "Admissions managers manage lead activities" on public.admission_lead_activities as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admission_leads lead
  WHERE ((lead.id = admission_lead_activities.lead_id) AND admission_is_manager(lead.desired_unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admission_leads lead
  WHERE ((lead.id = admission_lead_activities.lead_id) AND admission_is_manager(lead.desired_unit_id)))));
drop policy if exists "Admissions managers manage leads" on public.admission_leads;
create policy "Admissions managers manage leads" on public.admission_leads as permissive for all to authenticated using (admission_is_manager(desired_unit_id)) with check (admission_is_manager(desired_unit_id));
drop policy if exists "Admissions managers manage admission_payments" on public.admission_payments;
create policy "Admissions managers manage admission_payments" on public.admission_payments as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_payments.applicant_id) AND admission_is_manager(a.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_payments.applicant_id) AND admission_is_manager(a.unit_id)))));
drop policy if exists "Applicants manage own payments" on public.admission_payments;
create policy "Applicants manage own payments" on public.admission_payments as permissive for insert to authenticated with check (((payment_type = 'registration'::text) AND (status = 'submitted'::text) AND (EXISTS ( SELECT 1
   FROM admissions_applicants applicant
  WHERE ((applicant.id = admission_payments.applicant_id) AND (applicant.user_id = auth.uid()) AND (applicant.archived_at IS NULL) AND (applicant.workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text])))))));
drop policy if exists "Applicants update own payments" on public.admission_payments;
create policy "Applicants update own payments" on public.admission_payments as permissive for update to authenticated using (((payment_type = 'registration'::text) AND (status = ANY (ARRAY['pending'::text, 'submitted'::text, 'rejected'::text])) AND (EXISTS ( SELECT 1
   FROM admissions_applicants applicant
  WHERE ((applicant.id = admission_payments.applicant_id) AND (applicant.user_id = auth.uid()) AND (applicant.archived_at IS NULL) AND (applicant.workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text]))))))) with check (((payment_type = 'registration'::text) AND (status = 'submitted'::text) AND (EXISTS ( SELECT 1
   FROM admissions_applicants applicant
  WHERE ((applicant.id = admission_payments.applicant_id) AND (applicant.user_id = auth.uid()) AND (applicant.archived_at IS NULL) AND (applicant.workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text])))))));
drop policy if exists "Applicants view own admission_payments" on public.admission_payments;
create policy "Applicants view own admission_payments" on public.admission_payments as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_payments.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Admissions managers view purge audit" on public.admission_purge_audit;
create policy "Admissions managers view purge audit" on public.admission_purge_audit as permissive for select to authenticated using (admission_is_manager(unit_id));
drop policy if exists "Admissions managers manage quotas" on public.admission_quota_plans;
create policy "Admissions managers manage quotas" on public.admission_quota_plans as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admission_batches b
  WHERE ((b.id = admission_quota_plans.batch_id) AND admission_is_manager(b.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admission_batches b
  WHERE ((b.id = admission_quota_plans.batch_id) AND admission_is_manager(b.unit_id)))));
drop policy if exists "Public views published admission quotas" on public.admission_quota_plans;
create policy "Public views published admission quotas" on public.admission_quota_plans as permissive for select to anon, authenticated using ((is_open AND (EXISTS ( SELECT 1
   FROM admission_batches b
  WHERE ((b.id = admission_quota_plans.batch_id) AND (b.status = 'published'::text))))));
drop policy if exists "Admissions managers manage settings" on public.admission_settings;
create policy "Admissions managers manage settings" on public.admission_settings as permissive for all to authenticated using (admission_is_manager(unit_id)) with check (admission_is_manager(unit_id));
drop policy if exists "Public views admission settings" on public.admission_settings;
create policy "Public views admission settings" on public.admission_settings as permissive for select to anon, authenticated using (is_public);
drop policy if exists "Admissions managers manage admission_status_history" on public.admission_status_history;
create policy "Admissions managers manage admission_status_history" on public.admission_status_history as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_status_history.applicant_id) AND admission_is_manager(a.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_status_history.applicant_id) AND admission_is_manager(a.unit_id)))));
drop policy if exists "Applicants view own admission_status_history" on public.admission_status_history;
create policy "Applicants view own admission_status_history" on public.admission_status_history as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM admissions_applicants a
  WHERE ((a.id = admission_status_history.applicant_id) AND (a.user_id = auth.uid())))));
drop policy if exists "Admissions managers manage applicants" on public.admissions_applicants;
create policy "Admissions managers manage applicants" on public.admissions_applicants as permissive for all to authenticated using (admission_is_manager(unit_id)) with check (admission_is_manager(unit_id));
drop policy if exists "Applicants create own application" on public.admissions_applicants;
create policy "Applicants create own application" on public.admissions_applicants as permissive for insert to authenticated with check (((user_id = auth.uid()) AND (workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text]))));
drop policy if exists "Applicants update own application" on public.admissions_applicants;
create policy "Applicants update own application" on public.admissions_applicants as permissive for update to authenticated using (((user_id = auth.uid()) AND (workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text])))) with check (((user_id = auth.uid()) AND (workflow_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'documents_review'::text]))));
drop policy if exists "Applicants view own application" on public.admissions_applicants;
create policy "Applicants view own application" on public.admissions_applicants as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "Enable all access for authenticated users" on public.admissions_applicants;
create policy "Enable all access for authenticated users" on public.admissions_applicants as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Enable insert for anon users" on public.admissions_applicants;
create policy "Enable insert for anon users" on public.admissions_applicants as permissive for insert to anon with check (true);
drop policy if exists "Active employees read scoped announcements" on public.announcements;
create policy "Active employees read scoped announcements" on public.announcements as permissive for select to authenticated using (((status = 'terkirim'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.status = 'active'::text) AND ((announcements.target_type = 'staff'::text) OR (announcements.target_type = 'all'::text) OR ((announcements.target_type = 'unit'::text) AND ((announcements.unit_id IS NULL) OR (announcements.unit_id = e.unit_id))) OR ((announcements.target_type = 'class'::text) AND ((EXISTS ( SELECT 1
           FROM employee_schedules es
          WHERE ((es.employee_id = e.id) AND (es.class_id = announcements.class_id)))) OR (EXISTS ( SELECT 1
           FROM classes c
          WHERE ((c.id = announcements.class_id) AND (c.homeroom_teacher_id = e.id))))))))))));
drop policy if exists "Parents read scoped announcements" on public.announcements;
create policy "Parents read scoped announcements" on public.announcements as permissive for select to authenticated using (((status = 'terkirim'::text) AND (COALESCE(publish_at, created_at) <= now()) AND (EXISTS ( SELECT 1
   FROM ((parents p
     JOIN student_parent_links spl ON ((spl.parent_id = p.id)))
     JOIN students s ON ((s.id = spl.student_id)))
  WHERE ((p.user_id = auth.uid()) AND COALESCE(spl.can_access_parent_portal, true) AND ((announcements.target_type = 'all'::text) OR ((announcements.target_type = 'parents'::text) AND ((announcements.unit_id IS NULL) OR (announcements.unit_id = s.unit_id)) AND ((announcements.class_id IS NULL) OR (announcements.class_id = s.class_id))) OR ((announcements.target_type = 'unit'::text) AND (announcements.unit_id = s.unit_id)) OR ((announcements.target_type = 'class'::text) AND (announcements.class_id = s.class_id))))))));
drop policy if exists "School users read announcements" on public.announcements;
create policy "School users read announcements" on public.announcements as permissive for select to authenticated using (((NOT (EXISTS ( SELECT 1
   FROM parents p
  WHERE (p.user_id = auth.uid())))) AND ((target_type = ANY (ARRAY['all'::text, 'staff'::text, 'parents'::text])) OR ((target_type = 'unit'::text) AND can_access_unit(unit_id)) OR ((target_type = 'class'::text) AND (class_id = ANY (auth_user_class_ids()))))));
drop policy if exists "Super admins do all announcements" on public.announcements;
create policy "Super admins do all announcements" on public.announcements as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Allow authenticated access to asset_loans" on public.asset_loans;
create policy "Allow authenticated access to asset_loans" on public.asset_loans as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Allow authenticated access to assets" on public.assets;
create policy "Allow authenticated access to assets" on public.assets as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Attendance managers manage corrections" on public.attendance_correction_requests;
create policy "Attendance managers manage corrections" on public.attendance_correction_requests as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = attendance_correction_requests.employee_id) AND attendance_is_manager(e.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = attendance_correction_requests.employee_id) AND attendance_is_manager(e.unit_id)))));
drop policy if exists "Employees cancel own corrections" on public.attendance_correction_requests;
create policy "Employees cancel own corrections" on public.attendance_correction_requests as permissive for update to authenticated using (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = attendance_correction_requests.employee_id) AND (e.user_id = auth.uid())))))) with check (((status = 'cancelled'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = attendance_correction_requests.employee_id) AND (e.user_id = auth.uid()))))));
drop policy if exists "Employees create own corrections" on public.attendance_correction_requests;
create policy "Employees create own corrections" on public.attendance_correction_requests as permissive for insert to authenticated with check (((status = 'pending'::text) AND ((request_date >= (((clock_timestamp() AT TIME ZONE 'Asia/Jakarta'::text))::date - 30)) AND (request_date <= ((clock_timestamp() AT TIME ZONE 'Asia/Jakarta'::text))::date)) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = attendance_correction_requests.employee_id) AND (e.user_id = auth.uid()) AND (e.status = 'active'::text))))));
drop policy if exists "Employees read own corrections" on public.attendance_correction_requests;
create policy "Employees read own corrections" on public.attendance_correction_requests as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = attendance_correction_requests.employee_id) AND (e.user_id = auth.uid())))));
drop policy if exists "Attendance managers manage event participants" on public.attendance_event_participants;
create policy "Attendance managers manage event participants" on public.attendance_event_participants as permissive for all to authenticated using (attendance_is_manager(( SELECT event.unit_id
   FROM attendance_events event
  WHERE (event.id = attendance_event_participants.event_id)))) with check (attendance_is_manager(( SELECT event.unit_id
   FROM attendance_events event
  WHERE (event.id = attendance_event_participants.event_id))));
drop policy if exists "Employees view own event participation" on public.attendance_event_participants;
create policy "Employees view own event participation" on public.attendance_event_participants as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees employee
  WHERE ((employee.id = attendance_event_participants.employee_id) AND (employee.user_id = auth.uid())))));
drop policy if exists "Attendance managers manage event records" on public.attendance_event_records;
create policy "Attendance managers manage event records" on public.attendance_event_records as permissive for all to authenticated using (attendance_is_manager(( SELECT event.unit_id
   FROM attendance_events event
  WHERE (event.id = attendance_event_records.event_id)))) with check (attendance_is_manager(( SELECT event.unit_id
   FROM attendance_events event
  WHERE (event.id = attendance_event_records.event_id))));
drop policy if exists "Employees view own event records" on public.attendance_event_records;
create policy "Employees view own event records" on public.attendance_event_records as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees employee
  WHERE ((employee.id = attendance_event_records.employee_id) AND (employee.user_id = auth.uid())))));
drop policy if exists "Attendance managers manage events" on public.attendance_events;
create policy "Attendance managers manage events" on public.attendance_events as permissive for all to authenticated using (attendance_is_manager(unit_id)) with check (attendance_is_manager(unit_id));
drop policy if exists "Employees view assigned events" on public.attendance_events;
create policy "Employees view assigned events" on public.attendance_events as permissive for select to authenticated using (employee_can_access_attendance_event(id));
drop policy if exists "Attendance managers manage policies" on public.attendance_policies;
create policy "Attendance managers manage policies" on public.attendance_policies as permissive for all to authenticated using (attendance_is_manager(unit_id)) with check (attendance_is_manager(unit_id));
drop policy if exists "Authenticated read attendance policies" on public.attendance_policies;
create policy "Authenticated read attendance policies" on public.attendance_policies as permissive for select to authenticated using (true);
drop policy if exists "Parents read linked student attendance" on public.attendance_records;
create policy "Parents read linked student attendance" on public.attendance_records as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (student_parent_links spl
     JOIN parents p ON ((p.id = spl.parent_id)))
  WHERE ((spl.student_id = attendance_records.student_id) AND (p.user_id = auth.uid()) AND COALESCE(spl.can_access_parent_portal, true)))));
drop policy if exists "Super admins can do all on attendance" on public.attendance_records;
create policy "Super admins can do all on attendance" on public.attendance_records as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Teachers and operators can insert attendance" on public.attendance_records;
create policy "Teachers and operators can insert attendance" on public.attendance_records as permissive for insert to authenticated with check (((has_role('operator_absensi'::text) AND can_access_unit(unit_id)) OR (class_id = ANY (auth_user_class_ids()))));
drop policy if exists "Teachers and operators can update attendance" on public.attendance_records;
create policy "Teachers and operators can update attendance" on public.attendance_records as permissive for update to authenticated using (((has_role('operator_absensi'::text) AND can_access_unit(unit_id)) OR (class_id = ANY (auth_user_class_ids()))));
drop policy if exists "Users read attendance in their unit or class" on public.attendance_records;
create policy "Users read attendance in their unit or class" on public.attendance_records as permissive for select to authenticated using ((can_access_unit(unit_id) OR (class_id = ANY (auth_user_class_ids()))));
drop policy if exists "Employees read own shift assignment" on public.attendance_shift_assignments;
create policy "Employees read own shift assignment" on public.attendance_shift_assignments as permissive for select to authenticated using ((attendance_is_manager(( SELECT employee.unit_id
   FROM employees employee
  WHERE (employee.id = attendance_shift_assignments.employee_id))) OR (EXISTS ( SELECT 1
   FROM employees employee
  WHERE ((employee.id = attendance_shift_assignments.employee_id) AND (employee.user_id = auth.uid()))))));
drop policy if exists "Managers manage shift assignments" on public.attendance_shift_assignments;
create policy "Managers manage shift assignments" on public.attendance_shift_assignments as permissive for all to authenticated using (attendance_is_manager(( SELECT employee.unit_id
   FROM employees employee
  WHERE (employee.id = attendance_shift_assignments.employee_id)))) with check (attendance_is_manager(( SELECT employee.unit_id
   FROM employees employee
  WHERE (employee.id = attendance_shift_assignments.employee_id))));
drop policy if exists "Employees read applicable attendance shifts" on public.attendance_shifts;
create policy "Employees read applicable attendance shifts" on public.attendance_shifts as permissive for select to authenticated using ((attendance_is_manager(unit_id) OR (EXISTS ( SELECT 1
   FROM (attendance_shift_assignments assignment
     JOIN employees employee ON ((employee.id = assignment.employee_id)))
  WHERE ((assignment.shift_id = attendance_shifts.id) AND assignment.is_active AND (employee.user_id = auth.uid()))))));
drop policy if exists "Managers manage attendance shifts" on public.attendance_shifts;
create policy "Managers manage attendance shifts" on public.attendance_shifts as permissive for all to authenticated using (attendance_is_manager(unit_id)) with check (attendance_is_manager(unit_id));
drop policy if exists "Attendance managers manage site units" on public.attendance_site_units;
create policy "Attendance managers manage site units" on public.attendance_site_units as permissive for all to authenticated using (attendance_is_manager(unit_id)) with check (attendance_is_manager(unit_id));
drop policy if exists "Authenticated read attendance site units" on public.attendance_site_units;
create policy "Authenticated read attendance site units" on public.attendance_site_units as permissive for select to authenticated using (true);
drop policy if exists "Attendance managers manage sites" on public.attendance_sites;
create policy "Attendance managers manage sites" on public.attendance_sites as permissive for all to authenticated using (attendance_is_manager(NULL::uuid)) with check (attendance_is_manager(NULL::uuid));
drop policy if exists "Authenticated read attendance sites" on public.attendance_sites;
create policy "Authenticated read attendance sites" on public.attendance_sites as permissive for select to authenticated using (true);
drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs" on public.audit_logs as permissive for select to public using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'kepsek'::text]))))));
drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
create policy "Authenticated users can insert audit logs" on public.audit_logs as permissive for insert to authenticated with check (true);
drop policy if exists "Super admins do all audit_logs" on public.audit_logs;
create policy "Super admins do all audit_logs" on public.audit_logs as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Allow authenticated users to delete calendar_events" on public.calendar_events;
create policy "Allow authenticated users to delete calendar_events" on public.calendar_events as permissive for delete to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow authenticated users to insert calendar_events" on public.calendar_events;
create policy "Allow authenticated users to insert calendar_events" on public.calendar_events as permissive for insert to public with check ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow authenticated users to read calendar_events" on public.calendar_events;
create policy "Allow authenticated users to read calendar_events" on public.calendar_events as permissive for select to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow authenticated users to update calendar_events" on public.calendar_events;
create policy "Allow authenticated users to update calendar_events" on public.calendar_events as permissive for update to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "CBT managers manage cbt_answers" on public.cbt_answers;
create policy "CBT managers manage cbt_answers" on public.cbt_answers as permissive for all to authenticated using (cbt_is_manager()) with check (cbt_is_manager());
drop policy if exists "CBT managers manage cbt_banks" on public.cbt_banks;
create policy "CBT managers manage cbt_banks" on public.cbt_banks as permissive for all to authenticated using (cbt_is_manager()) with check (cbt_is_manager());
drop policy if exists "CBT managers manage cbt_exam_banks" on public.cbt_exam_banks;
create policy "CBT managers manage cbt_exam_banks" on public.cbt_exam_banks as permissive for all to authenticated using (cbt_is_manager()) with check (cbt_is_manager());
drop policy if exists "CBT managers manage cbt_exams" on public.cbt_exams;
create policy "CBT managers manage cbt_exams" on public.cbt_exams as permissive for all to authenticated using (cbt_is_manager()) with check (cbt_is_manager());
drop policy if exists "CBT managers manage cbt_participants" on public.cbt_participants;
create policy "CBT managers manage cbt_participants" on public.cbt_participants as permissive for all to authenticated using (cbt_is_manager()) with check (cbt_is_manager());
drop policy if exists "CBT managers manage cbt_questions" on public.cbt_questions;
create policy "CBT managers manage cbt_questions" on public.cbt_questions as permissive for all to authenticated using (cbt_is_manager()) with check (cbt_is_manager());
drop policy if exists "Admins can insert classes" on public.classes;
create policy "Admins can insert classes" on public.classes as permissive for insert to authenticated with check ((can_access_unit(unit_id) AND (has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text))));
drop policy if exists "Admins can update classes" on public.classes;
create policy "Admins can update classes" on public.classes as permissive for update to authenticated using ((can_access_unit(unit_id) AND (has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text))));
drop policy if exists "Quran teachers read classes for own halaqoh" on public.classes;
create policy "Quran teachers read classes for own halaqoh" on public.classes as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM ((students student
     JOIN tahfidz_halaqoh_members member ON ((member.student_id = student.id)))
     JOIN tahfidz_halaqohs halaqoh ON ((halaqoh.id = member.halaqoh_id)))
  WHERE ((student.class_id = classes.id) AND (halaqoh.employee_id = current_employee_id())))));
drop policy if exists "Super admins can do all on classes" on public.classes;
create policy "Super admins can do all on classes" on public.classes as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Teachers read assigned classes" on public.classes;
create policy "Teachers read assigned classes" on public.classes as permissive for select to authenticated using (teacher_can_access_class(id));
drop policy if exists "Users can read classes in their unit" on public.classes;
create policy "Users can read classes in their unit" on public.classes as permissive for select to authenticated using (true);
drop policy if exists "Authenticated users read curriculum documents" on public.curriculum_documents;
create policy "Authenticated users read curriculum documents" on public.curriculum_documents as permissive for select to authenticated using (true);
drop policy if exists "Enable delete for authenticated users on curriculum_documents" on public.curriculum_documents;
create policy "Enable delete for authenticated users on curriculum_documents" on public.curriculum_documents as permissive for delete to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable insert for authenticated users on curriculum_documents" on public.curriculum_documents;
create policy "Enable insert for authenticated users on curriculum_documents" on public.curriculum_documents as permissive for insert to public with check ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable update for authenticated users on curriculum_documents" on public.curriculum_documents;
create policy "Enable update for authenticated users on curriculum_documents" on public.curriculum_documents as permissive for update to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable ALL for authenticated users on digital_library_books" on public.digital_library_books;
create policy "Enable ALL for authenticated users on digital_library_books" on public.digital_library_books as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Enable read access for all users on digital_library_books" on public.digital_library_books;
create policy "Enable read access for all users on digital_library_books" on public.digital_library_books as permissive for select to public using (((is_active = true) OR (auth.role() = 'authenticated'::text)));
drop policy if exists "Enable ALL for authenticated users on digital_library_categorie" on public.digital_library_categories;
create policy "Enable ALL for authenticated users on digital_library_categorie" on public.digital_library_categories as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Enable read access for all users on digital_library_categories" on public.digital_library_categories;
create policy "Enable read access for all users on digital_library_categories" on public.digital_library_categories as permissive for select to public using (true);
drop policy if exists "Office managers manage document governance" on public.document_governance_actions;
create policy "Office managers manage document governance" on public.document_governance_actions as permissive for all to authenticated using (office_is_manager(unit_id)) with check (office_is_manager(unit_id));
drop policy if exists "Office managers manage document types" on public.document_types;
create policy "Office managers manage document types" on public.document_types as permissive for all to authenticated using (office_is_manager(unit_id)) with check (office_is_manager(unit_id));
drop policy if exists "Super admins do all doc_types" on public.document_types;
create policy "Super admins do all doc_types" on public.document_types as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users read doc types in their unit" on public.document_types;
create policy "Users read doc types in their unit" on public.document_types as permissive for select to authenticated using (can_access_unit(unit_id));
drop policy if exists "Employees read own documents" on public.documents;
create policy "Employees read own documents" on public.documents as permissive for select to authenticated using (((owner_type = 'employee'::text) AND (owner_id = current_employee_id())));
drop policy if exists "Office managers manage documents" on public.documents;
create policy "Office managers manage documents" on public.documents as permissive for all to authenticated using (office_is_manager(unit_id)) with check (office_is_manager(unit_id));
drop policy if exists "Super admins do all documents" on public.documents;
create policy "Super admins do all documents" on public.documents as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users read school documents in their unit" on public.documents;
create policy "Users read school documents in their unit" on public.documents as permissive for select to authenticated using (((owner_type = 'school'::text) AND (confidentiality = ANY (ARRAY['public'::text, 'internal'::text])) AND can_access_unit(unit_id)));
drop policy if exists "Staff read email log" on public.email_messages;
create policy "Staff read email log" on public.email_messages as permissive for select to authenticated using (email_log_viewer());
drop policy if exists "Employees manage own announcement reads" on public.employee_announcement_reads;
create policy "Employees manage own announcement reads" on public.employee_announcement_reads as permissive for all to authenticated using ((employee_id = current_employee_id())) with check ((employee_id = current_employee_id()));
drop policy if exists "Managers read employee announcement receipts" on public.employee_announcement_reads;
create policy "Managers read employee announcement receipts" on public.employee_announcement_reads as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_announcement_reads.employee_id) AND staff_operations_is_manager(e.unit_id)))));
drop policy if exists "Active employees read own attendance" on public.employee_attendance;
create policy "Active employees read own attendance" on public.employee_attendance as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_attendance.employee_id) AND (e.user_id = auth.uid()) AND (e.status = 'active'::text)))));
drop policy if exists "Attendance managers create attendance" on public.employee_attendance;
create policy "Attendance managers create attendance" on public.employee_attendance as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_attendance.employee_id) AND attendance_is_manager(e.unit_id)))));
drop policy if exists "Attendance managers update attendance" on public.employee_attendance;
create policy "Attendance managers update attendance" on public.employee_attendance as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_attendance.employee_id) AND attendance_is_manager(e.unit_id))))) with check ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_attendance.employee_id) AND attendance_is_manager(e.unit_id)))));
drop policy if exists "Super admins can do all on employee_attendance" on public.employee_attendance;
create policy "Super admins can do all on employee_attendance" on public.employee_attendance as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read employee_attendance in their unit" on public.employee_attendance;
create policy "Users can read employee_attendance in their unit" on public.employee_attendance as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_attendance.employee_id) AND (can_access_unit(e.unit_id) OR (e.unit_id IS NULL))))));
drop policy if exists "Attendance managers manage overtime" on public.employee_overtime;
create policy "Attendance managers manage overtime" on public.employee_overtime as permissive for all to authenticated using (attendance_is_manager(unit_id)) with check (attendance_is_manager(unit_id));
drop policy if exists "Employees request own overtime" on public.employee_overtime;
create policy "Employees request own overtime" on public.employee_overtime as permissive for insert to authenticated with check (((status = 'pending'::text) AND (request_source = 'employee'::text) AND (compensation_type = 'pending'::text) AND (approved_by IS NULL) AND (approved_at IS NULL) AND (check_in_at IS NULL) AND (check_out_at IS NULL) AND (actual_minutes = 0) AND (overtime_date >= ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date) AND (EXISTS ( SELECT 1
   FROM employees employee
  WHERE ((employee.id = employee_overtime.employee_id) AND (employee.user_id = auth.uid()) AND (employee.status = 'active'::text))))));
drop policy if exists "Employees view own overtime" on public.employee_overtime;
create policy "Employees view own overtime" on public.employee_overtime as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM employees employee
  WHERE ((employee.id = employee_overtime.employee_id) AND (employee.user_id = auth.uid())))));
drop policy if exists "Finance views completed overtime" on public.employee_overtime;
create policy "Finance views completed overtime" on public.employee_overtime as permissive for select to authenticated using (((status = 'completed'::text) AND overtime_finance_can_access_unit(unit_id)));
drop policy if exists "Users can delete schedules" on public.employee_schedules;
create policy "Users can delete schedules" on public.employee_schedules as permissive for delete to authenticated using (true);
drop policy if exists "Users can insert schedules" on public.employee_schedules;
create policy "Users can insert schedules" on public.employee_schedules as permissive for insert to authenticated with check (true);
drop policy if exists "Users can read all schedules" on public.employee_schedules;
create policy "Users can read all schedules" on public.employee_schedules as permissive for select to authenticated using (true);
drop policy if exists "Users can update schedules" on public.employee_schedules;
create policy "Users can update schedules" on public.employee_schedules as permissive for update to authenticated using (true);
drop policy if exists "Employees read own profile" on public.employees;
create policy "Employees read own profile" on public.employees as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "Enable read access for all authenticated users" on public.employees;
create policy "Enable read access for all authenticated users" on public.employees as permissive for select to authenticated using (true);
drop policy if exists "HRD can manage employees" on public.employees;
create policy "HRD can manage employees" on public.employees as permissive for all to authenticated using (has_role('hrd'::text)) with check (has_role('hrd'::text));
drop policy if exists "Super admins can do all on employees" on public.employees;
create policy "Super admins can do all on employees" on public.employees as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read employees in their unit" on public.employees;
create policy "Users can read employees in their unit" on public.employees as permissive for select to authenticated using ((can_access_unit(unit_id) OR (unit_id IS NULL)));
drop policy if exists "Users can read own employee record" on public.employees;
create policy "Users can read own employee record" on public.employees as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "Allow external student to read own profile" on public.external_students;
create policy "Allow external student to read own profile" on public.external_students as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "Allow full access to admin on external_students" on public.external_students;
create policy "Allow full access to admin on external_students" on public.external_students as permissive for all to authenticated using (((auth.jwt() ->> 'role'::text) = 'admin'::text));
drop policy if exists "Allow users to create their own external profile" on public.external_students;
create policy "Allow users to create their own external profile" on public.external_students as permissive for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "Allow users to update their own external profile" on public.external_students;
create policy "Allow users to update their own external profile" on public.external_students as permissive for update to authenticated using ((user_id = auth.uid()));
drop policy if exists "Enable select for users" on public.external_students;
create policy "Enable select for users" on public.external_students as permissive for select to authenticated using (true);
drop policy if exists "Allow full access to admin on extracurricular_attendances" on public.extracurricular_attendances;
create policy "Allow full access to admin on extracurricular_attendances" on public.extracurricular_attendances as permissive for all to authenticated using (((auth.jwt() ->> 'role'::text) = 'admin'::text));
drop policy if exists "Allow read to member on attendances" on public.extracurricular_attendances;
create policy "Allow read to member on attendances" on public.extracurricular_attendances as permissive for select to authenticated using ((member_id IN ( SELECT extracurricular_members.id
   FROM extracurricular_members
  WHERE ((extracurricular_members.student_id IN ( SELECT spl.student_id
           FROM (student_parent_links spl
             JOIN parents p ON ((spl.parent_id = p.id)))
          WHERE (p.user_id = auth.uid()))) OR (extracurricular_members.external_student_id IN ( SELECT external_students.id
           FROM external_students
          WHERE (external_students.user_id = auth.uid())))))));
drop policy if exists "Allow full access to admin on extracurricular_grades" on public.extracurricular_grades;
create policy "Allow full access to admin on extracurricular_grades" on public.extracurricular_grades as permissive for all to authenticated using (((auth.jwt() ->> 'role'::text) = 'admin'::text));
drop policy if exists "Allow read to member on grades" on public.extracurricular_grades;
create policy "Allow read to member on grades" on public.extracurricular_grades as permissive for select to authenticated using ((member_id IN ( SELECT extracurricular_members.id
   FROM extracurricular_members
  WHERE ((extracurricular_members.student_id IN ( SELECT spl.student_id
           FROM (student_parent_links spl
             JOIN parents p ON ((spl.parent_id = p.id)))
          WHERE (p.user_id = auth.uid()))) OR (extracurricular_members.external_student_id IN ( SELECT external_students.id
           FROM external_students
          WHERE (external_students.user_id = auth.uid())))))));
drop policy if exists "Allow full access to admin on extracurricular_members" on public.extracurricular_members;
create policy "Allow full access to admin on extracurricular_members" on public.extracurricular_members as permissive for all to authenticated using (((auth.jwt() ->> 'role'::text) = 'admin'::text));
drop policy if exists "Allow read to member on members" on public.extracurricular_members;
create policy "Allow read to member on members" on public.extracurricular_members as permissive for select to authenticated using (((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))) OR (external_student_id IN ( SELECT external_students.id
   FROM external_students
  WHERE (external_students.user_id = auth.uid())))));
drop policy if exists "Allow users to register to extracurriculars" on public.extracurricular_members;
create policy "Allow users to register to extracurriculars" on public.extracurricular_members as permissive for insert to authenticated with check ((external_student_id IN ( SELECT external_students.id
   FROM external_students
  WHERE (external_students.user_id = auth.uid()))));
drop policy if exists "Enable delete for admins" on public.extracurricular_members;
create policy "Enable delete for admins" on public.extracurricular_members as permissive for delete to authenticated using (true);
drop policy if exists "Enable insert for authenticated users" on public.extracurricular_members;
create policy "Enable insert for authenticated users" on public.extracurricular_members as permissive for insert to authenticated with check (true);
drop policy if exists "Enable read access for all users" on public.extracurricular_members;
create policy "Enable read access for all users" on public.extracurricular_members as permissive for select to authenticated using (true);
drop policy if exists "Enable update for admins" on public.extracurricular_members;
create policy "Enable update for admins" on public.extracurricular_members as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Allow full access to admin on extracurriculars" on public.extracurriculars;
create policy "Allow full access to admin on extracurriculars" on public.extracurriculars as permissive for all to authenticated using (((auth.jwt() ->> 'role'::text) = 'admin'::text));
drop policy if exists "Allow public read access to active extracurriculars" on public.extracurriculars;
create policy "Allow public read access to active extracurriculars" on public.extracurriculars as permissive for select to anon using ((is_active = true));
drop policy if exists "Allow read access to all authenticated users on extracurricular" on public.extracurriculars;
create policy "Allow read access to all authenticated users on extracurricular" on public.extracurriculars as permissive for select to authenticated using (true);
drop policy if exists "Enable delete for authenticated users only" on public.extracurriculars;
create policy "Enable delete for authenticated users only" on public.extracurriculars as permissive for delete to authenticated using (true);
drop policy if exists "Enable insert for authenticated users only" on public.extracurriculars;
create policy "Enable insert for authenticated users only" on public.extracurriculars as permissive for insert to authenticated with check (true);
drop policy if exists "Enable read access for all users" on public.extracurriculars;
create policy "Enable read access for all users" on public.extracurriculars as permissive for select to public using (true);
drop policy if exists "Enable update for authenticated users only" on public.extracurriculars;
create policy "Enable update for authenticated users only" on public.extracurriculars as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Finance staff manage records" on public.finance_accounts;
create policy "Finance staff manage records" on public.finance_accounts as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Finance staff read audit logs" on public.finance_audit_logs;
create policy "Finance staff read audit logs" on public.finance_audit_logs as permissive for select to authenticated using (can_manage_finance());
drop policy if exists "Finance staff manage records" on public.finance_budgets;
create policy "Finance staff manage records" on public.finance_budgets as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Finance staff manage records" on public.finance_cash_accounts;
create policy "Finance staff manage records" on public.finance_cash_accounts as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Finance staff manage categories" on public.finance_categories;
create policy "Finance staff manage categories" on public.finance_categories as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Finance staff manage records" on public.finance_journal_entries;
create policy "Finance staff manage records" on public.finance_journal_entries as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Finance staff manage records" on public.finance_journal_lines;
create policy "Finance staff manage records" on public.finance_journal_lines as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "HBL managers manage activities" on public.hbl_activities;
create policy "HBL managers manage activities" on public.hbl_activities as permissive for all to authenticated using (hbl_can_manage_program(( SELECT hbl_meetings.program_id
   FROM hbl_meetings
  WHERE (hbl_meetings.id = hbl_activities.meeting_id)))) with check (hbl_can_manage_program(( SELECT hbl_meetings.program_id
   FROM hbl_meetings
  WHERE (hbl_meetings.id = hbl_activities.meeting_id))));
drop policy if exists "Parents read released activities" on public.hbl_activities;
create policy "Parents read released activities" on public.hbl_activities as permissive for select to authenticated using (hbl_parent_can_access_activity(id));
drop policy if exists "HBL managers manage activity submissions" on public.hbl_activity_submissions;
create policy "HBL managers manage activity submissions" on public.hbl_activity_submissions as permissive for all to authenticated using (hbl_can_manage_program(( SELECT meeting.program_id
   FROM (hbl_activities activity
     JOIN hbl_meetings meeting ON ((meeting.id = activity.meeting_id)))
  WHERE (activity.id = hbl_activity_submissions.activity_id)))) with check (hbl_can_manage_program(( SELECT meeting.program_id
   FROM (hbl_activities activity
     JOIN hbl_meetings meeting ON ((meeting.id = activity.meeting_id)))
  WHERE (activity.id = hbl_activity_submissions.activity_id))));
drop policy if exists "Parents manage own activity submissions" on public.hbl_activity_submissions;
create policy "Parents manage own activity submissions" on public.hbl_activity_submissions as permissive for all to authenticated using (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_activity(activity_id))) with check (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_activity(activity_id)));
drop policy if exists "HBL managers manage home projects" on public.hbl_home_project_submissions;
create policy "HBL managers manage home projects" on public.hbl_home_project_submissions as permissive for all to authenticated using (hbl_can_manage_program(( SELECT hbl_meetings.program_id
   FROM hbl_meetings
  WHERE (hbl_meetings.id = hbl_home_project_submissions.meeting_id)))) with check (hbl_can_manage_program(( SELECT hbl_meetings.program_id
   FROM hbl_meetings
  WHERE (hbl_meetings.id = hbl_home_project_submissions.meeting_id))));
drop policy if exists "Parents manage own HBL home projects" on public.hbl_home_project_submissions;
create policy "Parents manage own HBL home projects" on public.hbl_home_project_submissions as permissive for all to authenticated using (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_meeting(meeting_id) AND hbl_parent_can_access_student(student_id))) with check (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_meeting(meeting_id) AND hbl_parent_can_access_student(student_id)));
drop policy if exists "HBL managers manage learning weeks" on public.hbl_learning_weeks;
create policy "HBL managers manage learning weeks" on public.hbl_learning_weeks as permissive for all to authenticated using (hbl_can_manage_program(program_id)) with check (hbl_can_manage_program(program_id));
drop policy if exists "Parents read released learning weeks" on public.hbl_learning_weeks;
create policy "Parents read released learning weeks" on public.hbl_learning_weeks as permissive for select to authenticated using (hbl_parent_can_access_week(id));
drop policy if exists "HBL managers manage live attendance" on public.hbl_live_attendances;
create policy "HBL managers manage live attendance" on public.hbl_live_attendances as permissive for all to authenticated using (hbl_can_manage_program(( SELECT meeting.program_id
   FROM (hbl_live_sessions live
     JOIN hbl_meetings meeting ON ((meeting.id = live.meeting_id)))
  WHERE (live.id = hbl_live_attendances.live_session_id)))) with check (hbl_can_manage_program(( SELECT meeting.program_id
   FROM (hbl_live_sessions live
     JOIN hbl_meetings meeting ON ((meeting.id = live.meeting_id)))
  WHERE (live.id = hbl_live_attendances.live_session_id))));
drop policy if exists "Parents read own live attendance" on public.hbl_live_attendances;
create policy "Parents read own live attendance" on public.hbl_live_attendances as permissive for select to authenticated using ((hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_meeting(( SELECT hbl_live_sessions.meeting_id
   FROM hbl_live_sessions
  WHERE (hbl_live_sessions.id = hbl_live_attendances.live_session_id)))));
drop policy if exists "HBL managers manage live sessions" on public.hbl_live_sessions;
create policy "HBL managers manage live sessions" on public.hbl_live_sessions as permissive for all to authenticated using (hbl_can_manage_program(( SELECT hbl_meetings.program_id
   FROM hbl_meetings
  WHERE (hbl_meetings.id = hbl_live_sessions.meeting_id)))) with check (hbl_can_manage_program(( SELECT hbl_meetings.program_id
   FROM hbl_meetings
  WHERE (hbl_meetings.id = hbl_live_sessions.meeting_id))));
drop policy if exists "Parents read released live sessions" on public.hbl_live_sessions;
create policy "Parents read released live sessions" on public.hbl_live_sessions as permissive for select to authenticated using (hbl_parent_can_access_meeting(meeting_id));
drop policy if exists "HBL managers manage reports" on public.hbl_material_reports;
create policy "HBL managers manage reports" on public.hbl_material_reports as permissive for all to authenticated using (hbl_can_manage_program(( SELECT subject.program_id
   FROM (hbl_materials material
     JOIN hbl_subjects subject ON ((subject.id = material.subject_id)))
  WHERE (material.id = hbl_material_reports.material_id)))) with check (hbl_can_manage_program(( SELECT subject.program_id
   FROM (hbl_materials material
     JOIN hbl_subjects subject ON ((subject.id = material.subject_id)))
  WHERE (material.id = hbl_material_reports.material_id))));
drop policy if exists "Parents create own HBL reports" on public.hbl_material_reports;
create policy "Parents create own HBL reports" on public.hbl_material_reports as permissive for insert to authenticated with check (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_submit(material_id, student_id)));
drop policy if exists "Parents read own HBL reports" on public.hbl_material_reports;
create policy "Parents read own HBL reports" on public.hbl_material_reports as permissive for select to authenticated using (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_student(student_id)));
drop policy if exists "Parents update own HBL reports" on public.hbl_material_reports;
create policy "Parents update own HBL reports" on public.hbl_material_reports as permissive for update to authenticated using (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_student(student_id))) with check (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_submit(material_id, student_id)));
drop policy if exists "HBL managers manage materials" on public.hbl_materials;
create policy "HBL managers manage materials" on public.hbl_materials as permissive for all to authenticated using (hbl_can_manage_program(( SELECT subject.program_id
   FROM hbl_subjects subject
  WHERE (subject.id = hbl_materials.subject_id)))) with check (hbl_can_manage_program(( SELECT subject.program_id
   FROM hbl_subjects subject
  WHERE (subject.id = hbl_materials.subject_id))));
drop policy if exists "Parents read released HBL materials" on public.hbl_materials;
create policy "Parents read released HBL materials" on public.hbl_materials as permissive for select to authenticated using ((is_published AND (COALESCE(release_at, '-infinity'::timestamp with time zone) <= now()) AND hbl_parent_can_access_program(( SELECT subject.program_id
   FROM hbl_subjects subject
  WHERE (subject.id = hbl_materials.subject_id))) AND ((meeting_id IS NULL) OR hbl_parent_can_access_meeting(meeting_id))));
drop policy if exists "HBL managers manage meetings" on public.hbl_meetings;
create policy "HBL managers manage meetings" on public.hbl_meetings as permissive for all to authenticated using (hbl_can_manage_program(program_id)) with check (hbl_can_manage_program(program_id));
drop policy if exists "Parents read released HBL meetings" on public.hbl_meetings;
create policy "Parents read released HBL meetings" on public.hbl_meetings as permissive for select to authenticated using (hbl_parent_can_access_meeting(id));
drop policy if exists "HBL managers manage parent checkins" on public.hbl_parent_checkins;
create policy "HBL managers manage parent checkins" on public.hbl_parent_checkins as permissive for all to authenticated using (hbl_can_manage_program(( SELECT hbl_learning_weeks.program_id
   FROM hbl_learning_weeks
  WHERE (hbl_learning_weeks.id = hbl_parent_checkins.week_id)))) with check (hbl_can_manage_program(( SELECT hbl_learning_weeks.program_id
   FROM hbl_learning_weeks
  WHERE (hbl_learning_weeks.id = hbl_parent_checkins.week_id))));
drop policy if exists "Parents manage own weekly checkins" on public.hbl_parent_checkins;
create policy "Parents manage own weekly checkins" on public.hbl_parent_checkins as permissive for all to authenticated using (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_week(week_id))) with check (((parent_id = ANY (current_parent_ids())) AND hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_week(week_id)));
drop policy if exists "HBL managers manage portfolio" on public.hbl_portfolio_items;
create policy "HBL managers manage portfolio" on public.hbl_portfolio_items as permissive for all to authenticated using (hbl_can_manage_program(program_id)) with check (hbl_can_manage_program(program_id));
drop policy if exists "Parents read published portfolio" on public.hbl_portfolio_items;
create policy "Parents read published portfolio" on public.hbl_portfolio_items as permissive for select to authenticated using ((is_published AND hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_program(program_id)));
drop policy if exists "HBL managers manage enrollments" on public.hbl_program_students;
create policy "HBL managers manage enrollments" on public.hbl_program_students as permissive for all to authenticated using (hbl_can_manage_program(program_id)) with check (hbl_can_manage_program(program_id));
drop policy if exists "Parents read own HBL enrollments" on public.hbl_program_students;
create policy "Parents read own HBL enrollments" on public.hbl_program_students as permissive for select to authenticated using (hbl_parent_can_access_student(student_id));
drop policy if exists "HBL managers manage programs" on public.hbl_programs;
create policy "HBL managers manage programs" on public.hbl_programs as permissive for all to authenticated using (hbl_is_manager_for_unit(unit_id)) with check (hbl_is_manager_for_unit(unit_id));
drop policy if exists "Parents read assigned HBL programs" on public.hbl_programs;
create policy "Parents read assigned HBL programs" on public.hbl_programs as permissive for select to authenticated using (((status = 'published'::text) AND hbl_parent_can_access_program(id)));
drop policy if exists "HBL managers manage observations" on public.hbl_student_observations;
create policy "HBL managers manage observations" on public.hbl_student_observations as permissive for all to authenticated using (hbl_can_manage_program(program_id)) with check (hbl_can_manage_program(program_id));
drop policy if exists "Parents read visible observations" on public.hbl_student_observations;
create policy "Parents read visible observations" on public.hbl_student_observations as permissive for select to authenticated using ((is_visible_to_parent AND hbl_parent_can_access_student(student_id) AND hbl_parent_can_access_program(program_id)));
drop policy if exists "HBL managers manage subjects" on public.hbl_subjects;
create policy "HBL managers manage subjects" on public.hbl_subjects as permissive for all to authenticated using (hbl_can_manage_program(program_id)) with check (hbl_can_manage_program(program_id));
drop policy if exists "Parents read assigned HBL subjects" on public.hbl_subjects;
create policy "Parents read assigned HBL subjects" on public.hbl_subjects as permissive for select to authenticated using (hbl_parent_can_access_program(program_id));
drop policy if exists "Users can delete leave requests" on public.leave_requests;
create policy "Users can delete leave requests" on public.leave_requests as permissive for delete to authenticated using (true);
drop policy if exists "Users can insert leave requests" on public.leave_requests;
create policy "Users can insert leave requests" on public.leave_requests as permissive for insert to authenticated with check (true);
drop policy if exists "Users can read all leave requests" on public.leave_requests;
create policy "Users can read all leave requests" on public.leave_requests as permissive for select to authenticated using (true);
drop policy if exists "Users can update leave requests" on public.leave_requests;
create policy "Users can update leave requests" on public.leave_requests as permissive for update to authenticated using (true);
drop policy if exists "Employees read assigned dispositions" on public.mail_dispositions;
create policy "Employees read assigned dispositions" on public.mail_dispositions as permissive for select to authenticated using (((to_employee_id = current_employee_id()) OR (from_employee_id = current_employee_id())));
drop policy if exists "Employees update assigned dispositions" on public.mail_dispositions;
create policy "Employees update assigned dispositions" on public.mail_dispositions as permissive for update to authenticated using ((to_employee_id = current_employee_id())) with check ((to_employee_id = current_employee_id()));
drop policy if exists "Office managers manage dispositions" on public.mail_dispositions;
create policy "Office managers manage dispositions" on public.mail_dispositions as permissive for all to authenticated using (office_is_manager(( SELECT mail.unit_id
   FROM mail_records mail
  WHERE (mail.id = mail_dispositions.mail_id)))) with check (office_is_manager(( SELECT mail.unit_id
   FROM mail_records mail
  WHERE (mail.id = mail_dispositions.mail_id))));
drop policy if exists "Employees read disposition mail" on public.mail_records;
create policy "Employees read disposition mail" on public.mail_records as permissive for select to authenticated using (employee_has_mail_assignment(id));
drop policy if exists "Office managers manage mail" on public.mail_records;
create policy "Office managers manage mail" on public.mail_records as permissive for all to authenticated using (office_is_manager(unit_id)) with check (office_is_manager(unit_id));
drop policy if exists "Admins have full access to onboarding materials" on public.onboarding_materials;
create policy "Admins have full access to onboarding materials" on public.onboarding_materials as permissive for all to public using (is_super_admin());
drop policy if exists "Authenticated users can view published onboarding materials" on public.onboarding_materials;
create policy "Authenticated users can view published onboarding materials" on public.onboarding_materials as permissive for select to public using (((auth.role() = 'authenticated'::text) AND ((status)::text = 'published'::text)));
drop policy if exists "Parents manage own announcement reads" on public.parent_announcement_reads;
create policy "Parents manage own announcement reads" on public.parent_announcement_reads as permissive for all to authenticated using ((parent_id IN ( SELECT parents.id
   FROM parents
  WHERE (parents.user_id = auth.uid())))) with check ((parent_id IN ( SELECT parents.id
   FROM parents
  WHERE (parents.user_id = auth.uid()))));
drop policy if exists "Staff read announcement receipts" on public.parent_announcement_reads;
create policy "Staff read announcement receipts" on public.parent_announcement_reads as permissive for select to authenticated using ((is_super_admin() OR has_role('admin_sekolah'::text) OR has_role('admin_unit'::text)));
drop policy if exists "Parents cancel submitted service requests" on public.parent_portal_requests;
create policy "Parents cancel submitted service requests" on public.parent_portal_requests as permissive for update to authenticated using (((status = 'submitted'::text) AND (parent_id IN ( SELECT parents.id
   FROM parents
  WHERE (parents.user_id = auth.uid()))))) with check (((status = 'cancelled'::text) AND (parent_id IN ( SELECT parents.id
   FROM parents
  WHERE (parents.user_id = auth.uid())))));
drop policy if exists "Parents create own service requests" on public.parent_portal_requests;
create policy "Parents create own service requests" on public.parent_portal_requests as permissive for insert to authenticated with check (((parent_id IN ( SELECT parents.id
   FROM parents
  WHERE (parents.user_id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM student_parent_links spl
  WHERE ((spl.parent_id = parent_portal_requests.parent_id) AND (spl.student_id = parent_portal_requests.student_id) AND COALESCE(spl.can_access_parent_portal, true))))));
drop policy if exists "Parents read own service requests" on public.parent_portal_requests;
create policy "Parents read own service requests" on public.parent_portal_requests as permissive for select to authenticated using ((parent_id IN ( SELECT parents.id
   FROM parents
  WHERE (parents.user_id = auth.uid()))));
drop policy if exists "School staff manage parent service requests" on public.parent_portal_requests;
create policy "School staff manage parent service requests" on public.parent_portal_requests as permissive for all to authenticated using ((is_super_admin() OR ((unit_id IS NOT NULL) AND can_access_unit(unit_id)))) with check ((is_super_admin() OR ((unit_id IS NOT NULL) AND can_access_unit(unit_id))));
drop policy if exists "Allow authenticated full access to parent_report_reads" on public.parent_report_reads;
create policy "Allow authenticated full access to parent_report_reads" on public.parent_report_reads as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Parents can insert their own receipts" on public.parent_report_reads;
create policy "Parents can insert their own receipts" on public.parent_report_reads as permissive for insert to authenticated with check (((parent_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM student_reports sr
  WHERE ((sr.id = parent_report_reads.report_id) AND (sr.status = 'published'::text) AND is_parent_of_student(sr.student_id))))));
drop policy if exists "Parents can read their own receipts" on public.parent_report_reads;
create policy "Parents can read their own receipts" on public.parent_report_reads as permissive for select to authenticated using ((parent_id = auth.uid()));
drop policy if exists "Staff can read all receipts" on public.parent_report_reads;
create policy "Staff can read all receipts" on public.parent_report_reads as permissive for select to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Parents read their own data" on public.parents;
create policy "Parents read their own data" on public.parents as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "School administrators create parents" on public.parents;
create policy "School administrators create parents" on public.parents as permissive for insert to authenticated with check ((has_role('admin_sekolah'::text) OR has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('operator_tu'::text) OR has_role('operator_psb'::text)));
drop policy if exists "School administrators read parent directory" on public.parents;
create policy "School administrators read parent directory" on public.parents as permissive for select to authenticated using ((has_role('admin_sekolah'::text) OR has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('operator_tu'::text) OR has_role('operator_psb'::text)));
drop policy if exists "School administrators update parents" on public.parents;
create policy "School administrators update parents" on public.parents as permissive for update to authenticated using ((has_role('admin_sekolah'::text) OR has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('operator_tu'::text) OR has_role('operator_psb'::text))) with check ((has_role('admin_sekolah'::text) OR has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('operator_tu'::text) OR has_role('operator_psb'::text)));
drop policy if exists "Super admins can do all on parents" on public.parents;
create policy "Super admins can do all on parents" on public.parents as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read own parent record" on public.parents;
create policy "Users can read own parent record" on public.parents as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "Users can read parents if they can access the student" on public.parents;
create policy "Users can read parents if they can access the student" on public.parents as permissive for select to authenticated using (school_can_read_parent_record(id));
drop policy if exists "Admin full access for paud_activities" on public.paud_activities;
create policy "Admin full access for paud_activities" on public.paud_activities as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text, 'kepsek'::text]))))));
drop policy if exists "Parents can view their children paud_activities" on public.paud_activities;
create policy "Parents can view their children paud_activities" on public.paud_activities as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))));
drop policy if exists "Teachers access for paud_activities" on public.paud_activities;
create policy "Teachers access for paud_activities" on public.paud_activities as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['guru'::text, 'wali_kelas'::text]))))));
drop policy if exists "Allow anon select access to paud_curriculums" on public.paud_curriculums;
create policy "Allow anon select access to paud_curriculums" on public.paud_curriculums as permissive for select to public using (true);
drop policy if exists "Allow authenticated full access to paud_curriculums" on public.paud_curriculums;
create policy "Allow authenticated full access to paud_curriculums" on public.paud_curriculums as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Admin full access for paud_stppa_assessments" on public.paud_stppa_assessments;
create policy "Admin full access for paud_stppa_assessments" on public.paud_stppa_assessments as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text, 'kepsek'::text]))))));
drop policy if exists "Parents can view their children paud_stppa_assessments" on public.paud_stppa_assessments;
create policy "Parents can view their children paud_stppa_assessments" on public.paud_stppa_assessments as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))));
drop policy if exists "Teachers access for paud_stppa_assessments" on public.paud_stppa_assessments;
create policy "Teachers access for paud_stppa_assessments" on public.paud_stppa_assessments as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['guru'::text, 'wali_kelas'::text]))))));
drop policy if exists "Finance staff manage payments" on public.payment_transactions;
create policy "Finance staff manage payments" on public.payment_transactions as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Parents read linked payments" on public.payment_transactions;
create policy "Parents read linked payments" on public.payment_transactions as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((p.id = spl.parent_id)))
  WHERE ((p.user_id = auth.uid()) AND COALESCE(spl.can_access_parent_portal, true)))));
drop policy if exists "Parents submit linked payments" on public.payment_transactions;
create policy "Parents submit linked payments" on public.payment_transactions as permissive for insert to authenticated with check (((status = 'pending_verification'::text) AND (student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((p.id = spl.parent_id)))
  WHERE ((p.user_id = auth.uid()) AND COALESCE(spl.can_access_parent_portal, true))))));
drop policy if exists "pkg_authenticated_all" on public.pkg_assessments;
create policy "pkg_authenticated_all" on public.pkg_assessments as permissive for all to public using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "pkg_comp_auth" on public.pkg_competencies;
create policy "pkg_comp_auth" on public.pkg_competencies as permissive for all to public using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "pkg_ind_auth" on public.pkg_indicators;
create policy "pkg_ind_auth" on public.pkg_indicators as permissive for all to public using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "Allow authenticated access to procurements" on public.procurements;
create policy "Allow authenticated access to procurements" on public.procurements as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Super admins can do all on profiles" on public.profiles;
create policy "Super admins can do all on profiles" on public.profiles as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles as permissive for select to authenticated using ((auth.uid() = id));
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles as permissive for update to authenticated using ((auth.uid() = id)) with check ((auth.uid() = id));
drop policy if exists "Admin full access for quran_assessments" on public.quran_assessments;
create policy "Admin full access for quran_assessments" on public.quran_assessments as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text]))))));
drop policy if exists "Parents can view their children quran_assessments" on public.quran_assessments;
create policy "Parents can view their children quran_assessments" on public.quran_assessments as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))));
drop policy if exists "Quran managers manage assessments" on public.quran_assessments;
create policy "Quran managers manage assessments" on public.quran_assessments as permissive for all to authenticated using (quran_is_manager(quran_student_unit(student_id))) with check (quran_is_manager(quran_student_unit(student_id)));
drop policy if exists "Quran teachers create assigned assessments" on public.quran_assessments;
create policy "Quran teachers create assigned assessments" on public.quran_assessments as permissive for insert to authenticated with check (((employee_id = current_employee_id()) AND quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)));
drop policy if exists "Quran teachers delete own assessments" on public.quran_assessments;
create policy "Quran teachers delete own assessments" on public.quran_assessments as permissive for delete to authenticated using ((employee_id = current_employee_id()));
drop policy if exists "Quran teachers read assigned assessments" on public.quran_assessments;
create policy "Quran teachers read assigned assessments" on public.quran_assessments as permissive for select to authenticated using (quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id));
drop policy if exists "Quran teachers update own assessments" on public.quran_assessments;
create policy "Quran teachers update own assessments" on public.quran_assessments as permissive for update to authenticated using ((employee_id = current_employee_id())) with check (((employee_id = current_employee_id()) AND quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)));
drop policy if exists "Teachers access for quran_assessments" on public.quran_assessments;
create policy "Teachers access for quran_assessments" on public.quran_assessments as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'guru'::text)))));
drop policy if exists "Admin full access for quran_records" on public.quran_records;
create policy "Admin full access for quran_records" on public.quran_records as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text]))))));
drop policy if exists "Parents can view their children quran_records" on public.quran_records;
create policy "Parents can view their children quran_records" on public.quran_records as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))));
drop policy if exists "Quran managers manage records" on public.quran_records;
create policy "Quran managers manage records" on public.quran_records as permissive for all to authenticated using (quran_is_manager(quran_student_unit(student_id))) with check (quran_is_manager(quran_student_unit(student_id)));
drop policy if exists "Quran teachers create assigned records" on public.quran_records;
create policy "Quran teachers create assigned records" on public.quran_records as permissive for insert to authenticated with check (((employee_id = current_employee_id()) AND quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)));
drop policy if exists "Quran teachers delete own records" on public.quran_records;
create policy "Quran teachers delete own records" on public.quran_records as permissive for delete to authenticated using ((employee_id = current_employee_id()));
drop policy if exists "Quran teachers read assigned records" on public.quran_records;
create policy "Quran teachers read assigned records" on public.quran_records as permissive for select to authenticated using (quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id));
drop policy if exists "Quran teachers update own records" on public.quran_records;
create policy "Quran teachers update own records" on public.quran_records as permissive for update to authenticated using ((employee_id = current_employee_id())) with check (((employee_id = current_employee_id()) AND quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)));
drop policy if exists "Teachers access for quran_records" on public.quran_records;
create policy "Teachers access for quran_records" on public.quran_records as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'guru'::text)))));
drop policy if exists "Admin full access for quran_targets" on public.quran_targets;
create policy "Admin full access for quran_targets" on public.quran_targets as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text]))))));
drop policy if exists "Parents can view quran_targets" on public.quran_targets;
create policy "Parents can view quran_targets" on public.quran_targets as permissive for select to authenticated using (true);
drop policy if exists "Parents read linked class Quran targets" on public.quran_targets;
create policy "Parents read linked class Quran targets" on public.quran_targets as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM ((student_parent_links link
     JOIN parents parent_record ON ((parent_record.id = link.parent_id)))
     JOIN students student ON ((student.id = link.student_id)))
  WHERE ((parent_record.user_id = auth.uid()) AND (student.class_id = quran_targets.class_id)))));
drop policy if exists "Quran managers manage class targets" on public.quran_targets;
create policy "Quran managers manage class targets" on public.quran_targets as permissive for all to authenticated using (quran_is_manager(( SELECT class.unit_id
   FROM classes class
  WHERE (class.id = quran_targets.class_id)))) with check (quran_is_manager(( SELECT class.unit_id
   FROM classes class
  WHERE (class.id = quran_targets.class_id))));
drop policy if exists "Quran teachers read assigned class targets" on public.quran_targets;
create policy "Quran teachers read assigned class targets" on public.quran_targets as permissive for select to authenticated using (quran_teacher_can_teach_class_subject(class_id, subject_id, academic_year_id, semester_id));
drop policy if exists "Teachers access for quran_targets" on public.quran_targets;
create policy "Teachers access for quran_targets" on public.quran_targets as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'guru'::text)))));
drop policy if exists "Enable all access for authenticated users on recruitment_applic" on public.recruitment_applicants;
create policy "Enable all access for authenticated users on recruitment_applic" on public.recruitment_applicants as permissive for all to public using ((auth.uid() IS NOT NULL));
drop policy if exists "Enable all access for authenticated users on recruitment_vacanc" on public.recruitment_vacancies;
create policy "Enable all access for authenticated users on recruitment_vacanc" on public.recruitment_vacancies as permissive for all to public using ((auth.uid() IS NOT NULL));
drop policy if exists "Enable read access for all users on recruitment_vacancies" on public.recruitment_vacancies;
create policy "Enable read access for all users on recruitment_vacancies" on public.recruitment_vacancies as permissive for select to public using (true);
drop policy if exists "Allow authenticated full access to report_pdf_exports" on public.report_pdf_exports;
create policy "Allow authenticated full access to report_pdf_exports" on public.report_pdf_exports as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Parents can read pdf exports of their children" on public.report_pdf_exports;
create policy "Parents can read pdf exports of their children" on public.report_pdf_exports as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM student_reports sr
  WHERE ((sr.id = report_pdf_exports.report_id) AND (sr.status = 'published'::text) AND is_parent_of_student(sr.student_id)))));
drop policy if exists "Staff can manage pdf exports" on public.report_pdf_exports;
create policy "Staff can manage pdf exports" on public.report_pdf_exports as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Admin can manage report periods" on public.report_periods;
create policy "Admin can manage report periods" on public.report_periods as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text)));
drop policy if exists "Allow authenticated full access to report_periods" on public.report_periods;
create policy "Allow authenticated full access to report_periods" on public.report_periods as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Anyone can read active report periods" on public.report_periods;
create policy "Anyone can read active report periods" on public.report_periods as permissive for select to authenticated using (((status = 'active'::text) OR has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text)));
drop policy if exists "Admin manage publish logs" on public.report_publish_logs;
create policy "Admin manage publish logs" on public.report_publish_logs as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text)));
drop policy if exists "Allow authenticated full access to report_publish_logs" on public.report_publish_logs;
create policy "Allow authenticated full access to report_publish_logs" on public.report_publish_logs as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Allow authenticated full access to report_reviews" on public.report_reviews;
create policy "Allow authenticated full access to report_reviews" on public.report_reviews as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Staff can manage review logs" on public.report_reviews;
create policy "Staff can manage review logs" on public.report_reviews as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Admin manage template items" on public.report_template_items;
create policy "Admin manage template items" on public.report_template_items as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text)));
drop policy if exists "Allow authenticated full access to report_template_items" on public.report_template_items;
create policy "Allow authenticated full access to report_template_items" on public.report_template_items as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Staff can read template items" on public.report_template_items;
create policy "Staff can read template items" on public.report_template_items as permissive for select to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Admin manage template sections" on public.report_template_sections;
create policy "Admin manage template sections" on public.report_template_sections as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text)));
drop policy if exists "Allow authenticated full access to report_template_sections" on public.report_template_sections;
create policy "Allow authenticated full access to report_template_sections" on public.report_template_sections as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Staff can read template sections" on public.report_template_sections;
create policy "Staff can read template sections" on public.report_template_sections as permissive for select to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Admin manage templates" on public.report_templates;
create policy "Admin manage templates" on public.report_templates as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text)));
drop policy if exists "Allow authenticated full access to report_templates" on public.report_templates;
create policy "Allow authenticated full access to report_templates" on public.report_templates as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Staff can read templates" on public.report_templates;
create policy "Staff can read templates" on public.report_templates as permissive for select to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Anyone can read roles" on public.roles;
create policy "Anyone can read roles" on public.roles as permissive for select to authenticated using (true);
drop policy if exists "Super admins can do all on roles" on public.roles;
create policy "Super admins can do all on roles" on public.roles as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Authenticated users manage room schedules" on public.room_schedules;
create policy "Authenticated users manage room schedules" on public.room_schedules as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users manage rooms" on public.rooms;
create policy "Authenticated users manage rooms" on public.rooms as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Finance staff manage expenses" on public.school_expenses;
create policy "Finance staff manage expenses" on public.school_expenses as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Anyone can read semesters" on public.semesters;
create policy "Anyone can read semesters" on public.semesters as permissive for select to authenticated using (true);
drop policy if exists "Super admins can do all on semesters" on public.semesters;
create policy "Super admins can do all on semesters" on public.semesters as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Assigned staff update operational reports" on public.staff_operational_reports;
create policy "Assigned staff update operational reports" on public.staff_operational_reports as permissive for update to authenticated using (((assigned_to = current_employee_id()) AND (status = ANY (ARRAY['in_review'::text, 'assigned'::text])))) with check (((assigned_to = current_employee_id()) AND (status = ANY (ARRAY['assigned'::text, 'resolved'::text]))));
drop policy if exists "Managers manage operational reports" on public.staff_operational_reports;
create policy "Managers manage operational reports" on public.staff_operational_reports as permissive for all to authenticated using (staff_operations_is_manager(unit_id)) with check (staff_operations_is_manager(unit_id));
drop policy if exists "Staff create own operational reports" on public.staff_operational_reports;
create policy "Staff create own operational reports" on public.staff_operational_reports as permissive for insert to authenticated with check (((employee_id = current_employee_id()) AND staff_has_portal_access()));
drop policy if exists "Staff read own operational reports" on public.staff_operational_reports;
create policy "Staff read own operational reports" on public.staff_operational_reports as permissive for select to authenticated using (((employee_id = current_employee_id()) OR (assigned_to = current_employee_id())));
drop policy if exists "Staff update own submitted operational reports" on public.staff_operational_reports;
create policy "Staff update own submitted operational reports" on public.staff_operational_reports as permissive for update to authenticated using (((employee_id = current_employee_id()) AND (status = 'submitted'::text))) with check (((employee_id = current_employee_id()) AND (status = 'submitted'::text)));
drop policy if exists "Authenticated users read student academic history" on public.student_academic_history;
create policy "Authenticated users read student academic history" on public.student_academic_history as permissive for select to authenticated using (true);
drop policy if exists "Enable delete for authenticated users on student_academic_histo" on public.student_academic_history;
create policy "Enable delete for authenticated users on student_academic_histo" on public.student_academic_history as permissive for delete to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable insert for authenticated users on student_academic_histo" on public.student_academic_history;
create policy "Enable insert for authenticated users on student_academic_histo" on public.student_academic_history as permissive for insert to public with check ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable update for authenticated users on student_academic_histo" on public.student_academic_history;
create policy "Enable update for authenticated users on student_academic_histo" on public.student_academic_history as permissive for update to public using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "Finance staff manage invoices" on public.student_invoices;
create policy "Finance staff manage invoices" on public.student_invoices as permissive for all to authenticated using (can_manage_finance()) with check (can_manage_finance());
drop policy if exists "Parents read linked invoices" on public.student_invoices;
create policy "Parents read linked invoices" on public.student_invoices as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((p.id = spl.parent_id)))
  WHERE ((p.user_id = auth.uid()) AND COALESCE(spl.can_access_parent_portal, true)))));
drop policy if exists "Users can delete journals" on public.student_journals;
create policy "Users can delete journals" on public.student_journals as permissive for delete to authenticated using (true);
drop policy if exists "Users can insert journals" on public.student_journals;
create policy "Users can insert journals" on public.student_journals as permissive for insert to authenticated with check (true);
drop policy if exists "Users can read all journals" on public.student_journals;
create policy "Users can read all journals" on public.student_journals as permissive for select to authenticated using (true);
drop policy if exists "Users can update journals" on public.student_journals;
create policy "Users can update journals" on public.student_journals as permissive for update to authenticated using (true);
drop policy if exists "Parents read their own links" on public.student_parent_links;
create policy "Parents read their own links" on public.student_parent_links as permissive for select to authenticated using ((parent_id = ANY (current_parent_ids())));
drop policy if exists "Read SPL by unit" on public.student_parent_links;
create policy "Read SPL by unit" on public.student_parent_links as permissive for select to authenticated using (school_can_access_student(student_id));
drop policy if exists "School administrators manage student parent links" on public.student_parent_links;
create policy "School administrators manage student parent links" on public.student_parent_links as permissive for all to authenticated using (school_can_manage_student_parent_link(student_id)) with check (school_can_manage_student_parent_link(student_id));
drop policy if exists "Super admins can do all SPL" on public.student_parent_links;
create policy "Super admins can do all SPL" on public.student_parent_links as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Allow authenticated full access to student_report_notes" on public.student_report_notes;
create policy "Allow authenticated full access to student_report_notes" on public.student_report_notes as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Parents can read visible notes of published reports" on public.student_report_notes;
create policy "Parents can read visible notes of published reports" on public.student_report_notes as permissive for select to authenticated using (((parent_visible = true) AND (EXISTS ( SELECT 1
   FROM student_reports sr
  WHERE ((sr.id = student_report_notes.report_id) AND (sr.status = 'published'::text) AND is_parent_of_student(sr.student_id))))));
drop policy if exists "Staff can manage notes" on public.student_report_notes;
create policy "Staff can manage notes" on public.student_report_notes as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Allow authenticated full access to student_report_scores" on public.student_report_scores;
create policy "Allow authenticated full access to student_report_scores" on public.student_report_scores as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Parents can read visible scores of published reports" on public.student_report_scores;
create policy "Parents can read visible scores of published reports" on public.student_report_scores as permissive for select to authenticated using (((EXISTS ( SELECT 1
   FROM student_reports sr
  WHERE ((sr.id = student_report_scores.report_id) AND (sr.status = 'published'::text) AND is_parent_of_student(sr.student_id)))) AND (EXISTS ( SELECT 1
   FROM report_template_items rti
  WHERE ((rti.id = student_report_scores.item_id) AND ((rti.parent_visible = true) OR (rti.parent_visible IS NULL)))))));
drop policy if exists "Staff can manage scores" on public.student_report_scores;
create policy "Staff can manage scores" on public.student_report_scores as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Admins and Kepsek can read all reports" on public.student_reports;
create policy "Admins and Kepsek can read all reports" on public.student_reports as permissive for select to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text) OR is_kepsek()));
drop policy if exists "Admins can manage reports" on public.student_reports;
create policy "Admins can manage reports" on public.student_reports as permissive for all to authenticated using ((has_role('super_admin'::text) OR has_role('admin'::text)));
drop policy if exists "Allow authenticated full access to student_reports" on public.student_reports;
create policy "Allow authenticated full access to student_reports" on public.student_reports as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Parents can read published reports of their children" on public.student_reports;
create policy "Parents can read published reports of their children" on public.student_reports as permissive for select to authenticated using (((status = 'published'::text) AND is_parent_of_student(student_id)));
drop policy if exists "Staff can update report status" on public.student_reports;
create policy "Staff can update report status" on public.student_reports as permissive for update to authenticated using ((has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('homeroom'::text) OR has_role('teacher'::text)));
drop policy if exists "Teachers can read reports" on public.student_reports;
create policy "Teachers can read reports" on public.student_reports as permissive for select to authenticated using ((has_role('teacher'::text) OR has_role('homeroom'::text)));
drop policy if exists "Wakasek can read reports in their unit" on public.student_reports;
create policy "Wakasek can read reports in their unit" on public.student_reports as permissive for select to authenticated using ((has_role('wakasek'::text) AND (can_access_unit(( SELECT classes.unit_id
   FROM classes
  WHERE (classes.id = student_reports.class_id))) OR can_access_unit(NULL::uuid))));
drop policy if exists "Admins can insert students" on public.students;
create policy "Admins can insert students" on public.students as permissive for insert to authenticated with check ((can_access_unit(unit_id) AND (has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text))));
drop policy if exists "Admins can update students" on public.students;
create policy "Admins can update students" on public.students as permissive for update to authenticated using ((can_access_unit(unit_id) AND (has_role('admin_unit'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text))));
drop policy if exists "Finance staff read students" on public.students;
create policy "Finance staff read students" on public.students as permissive for select to authenticated using (can_manage_finance());
drop policy if exists "Quran teachers read students in own halaqoh" on public.students;
create policy "Quran teachers read students in own halaqoh" on public.students as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (tahfidz_halaqoh_members member
     JOIN tahfidz_halaqohs halaqoh ON ((halaqoh.id = member.halaqoh_id)))
  WHERE ((member.student_id = students.id) AND (halaqoh.employee_id = current_employee_id())))));
drop policy if exists "Super admins can do all on students" on public.students;
create policy "Super admins can do all on students" on public.students as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Teachers read students in assigned classes" on public.students;
create policy "Teachers read students in assigned classes" on public.students as permissive for select to authenticated using (((class_id IS NOT NULL) AND teacher_can_access_class(class_id)));
drop policy if exists "Users can read students in their unit" on public.students;
create policy "Users can read students in their unit" on public.students as permissive for select to authenticated using ((can_access_unit(unit_id) OR parent_can_access_student(id)));
drop policy if exists "Assigned teachers read their curriculum semester plans" on public.subject_curriculum_semesters;
create policy "Assigned teachers read their curriculum semester plans" on public.subject_curriculum_semesters as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (((subject_curriculums sc
     JOIN employee_schedules schedule ON (((schedule.subject_id = sc.subject_id) AND (schedule.academic_year_id = sc.academic_year_id) AND (schedule.semester_id = subject_curriculum_semesters.semester_id))))
     JOIN classes class_record ON (((class_record.id = schedule.class_id) AND (class_record.grade_level = sc.grade_level))))
     JOIN employees employee ON ((employee.id = schedule.employee_id)))
  WHERE ((sc.id = subject_curriculum_semesters.subject_curriculum_id) AND (employee.user_id = auth.uid()) AND (employee.status = 'active'::text) AND (schedule.schedule_type = 'mengajar'::text)))));
drop policy if exists "Users manage curriculum semester plans in accessible units" on public.subject_curriculum_semesters;
create policy "Users manage curriculum semester plans in accessible units" on public.subject_curriculum_semesters as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (subject_curriculums sc
     JOIN subjects subject ON ((subject.id = sc.subject_id)))
  WHERE ((sc.id = subject_curriculum_semesters.subject_curriculum_id) AND can_access_unit(subject.unit_id) AND (has_role('super_admin'::text) OR has_role('ketua_yayasan'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text) OR has_role('admin_unit'::text)))))) with check ((EXISTS ( SELECT 1
   FROM (subject_curriculums sc
     JOIN subjects subject ON ((subject.id = sc.subject_id)))
  WHERE ((sc.id = subject_curriculum_semesters.subject_curriculum_id) AND can_access_unit(subject.unit_id) AND (has_role('super_admin'::text) OR has_role('ketua_yayasan'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text) OR has_role('admin_unit'::text))))));
drop policy if exists "Users read curriculum semester plans in accessible units" on public.subject_curriculum_semesters;
create policy "Users read curriculum semester plans in accessible units" on public.subject_curriculum_semesters as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (subject_curriculums sc
     JOIN subjects subject ON ((subject.id = sc.subject_id)))
  WHERE ((sc.id = subject_curriculum_semesters.subject_curriculum_id) AND can_access_unit(subject.unit_id)))));
drop policy if exists "Assigned teachers read their annual curriculum" on public.subject_curriculums;
create policy "Assigned teachers read their annual curriculum" on public.subject_curriculums as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM ((employee_schedules schedule
     JOIN classes class_record ON (((class_record.id = schedule.class_id) AND (class_record.grade_level = subject_curriculums.grade_level))))
     JOIN employees employee ON ((employee.id = schedule.employee_id)))
  WHERE ((schedule.subject_id = subject_curriculums.subject_id) AND (schedule.academic_year_id = subject_curriculums.academic_year_id) AND (employee.user_id = auth.uid()) AND (employee.status = 'active'::text) AND (schedule.schedule_type = 'mengajar'::text)))));
drop policy if exists "Curriculum managers manage annual curriculum in accessible unit" on public.subject_curriculums;
create policy "Curriculum managers manage annual curriculum in accessible unit" on public.subject_curriculums as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM subjects subject
  WHERE ((subject.id = subject_curriculums.subject_id) AND can_access_unit(subject.unit_id) AND (has_role('super_admin'::text) OR has_role('ketua_yayasan'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text) OR has_role('admin_unit'::text)))))) with check ((EXISTS ( SELECT 1
   FROM subjects subject
  WHERE ((subject.id = subject_curriculums.subject_id) AND can_access_unit(subject.unit_id) AND (has_role('super_admin'::text) OR has_role('ketua_yayasan'::text) OR has_role('kepsek'::text) OR has_role('wakasek'::text) OR has_role('admin_sekolah'::text) OR has_role('admin_unit'::text))))));
drop policy if exists "Curriculum managers read annual curriculum in accessible units" on public.subject_curriculums;
create policy "Curriculum managers read annual curriculum in accessible units" on public.subject_curriculums as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM subjects subject
  WHERE ((subject.id = subject_curriculums.subject_id) AND can_access_unit(subject.unit_id)))));
drop policy if exists "Enable delete for authenticated users on subjects" on public.subjects;
create policy "Enable delete for authenticated users on subjects" on public.subjects as permissive for delete to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable insert for authenticated users on subjects" on public.subjects;
create policy "Enable insert for authenticated users on subjects" on public.subjects as permissive for insert to public with check ((auth.role() = 'authenticated'::text));
drop policy if exists "Enable read access for all users on subjects" on public.subjects;
create policy "Enable read access for all users on subjects" on public.subjects as permissive for select to public using (true);
drop policy if exists "Enable update for authenticated users on subjects" on public.subjects;
create policy "Enable update for authenticated users on subjects" on public.subjects as permissive for update to public using ((auth.role() = 'authenticated'::text));
drop policy if exists "Users can delete substitute assignments" on public.substitute_assignments;
create policy "Users can delete substitute assignments" on public.substitute_assignments as permissive for delete to authenticated using (true);
drop policy if exists "Users can insert substitute assignments" on public.substitute_assignments;
create policy "Users can insert substitute assignments" on public.substitute_assignments as permissive for insert to authenticated with check (true);
drop policy if exists "Users can read all substitute assignments" on public.substitute_assignments;
create policy "Users can read all substitute assignments" on public.substitute_assignments as permissive for select to authenticated using (true);
drop policy if exists "Users can update substitute assignments" on public.substitute_assignments;
create policy "Users can update substitute assignments" on public.substitute_assignments as permissive for update to authenticated using (true);
drop policy if exists "Authenticated users can update system_settings" on public.system_settings;
create policy "Authenticated users can update system_settings" on public.system_settings as permissive for all to authenticated using (true) with check (true);
drop policy if exists "Public read access for system_settings" on public.system_settings;
create policy "Public read access for system_settings" on public.system_settings as permissive for select to public using (true);
drop policy if exists "Admin full access for tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members;
create policy "Admin full access for tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text]))))));
drop policy if exists "Parents can view their children tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members;
create policy "Parents can view their children tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))));
drop policy if exists "Quran managers manage halaqoh members" on public.tahfidz_halaqoh_members;
create policy "Quran managers manage halaqoh members" on public.tahfidz_halaqoh_members as permissive for all to authenticated using (quran_is_manager(quran_halaqoh_unit(halaqoh_id))) with check (quran_is_manager(quran_halaqoh_unit(halaqoh_id)));
drop policy if exists "Quran teachers read own halaqoh members" on public.tahfidz_halaqoh_members;
create policy "Quran teachers read own halaqoh members" on public.tahfidz_halaqoh_members as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM tahfidz_halaqohs halaqoh
  WHERE ((halaqoh.id = tahfidz_halaqoh_members.halaqoh_id) AND (halaqoh.employee_id = current_employee_id())))));
drop policy if exists "Teachers access for tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members;
create policy "Teachers access for tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'guru'::text)))));
drop policy if exists "Admin full access for tahfidz_halaqohs" on public.tahfidz_halaqohs;
create policy "Admin full access for tahfidz_halaqohs" on public.tahfidz_halaqohs as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text]))))));
drop policy if exists "Quran managers manage halaqohs" on public.tahfidz_halaqohs;
create policy "Quran managers manage halaqohs" on public.tahfidz_halaqohs as permissive for all to authenticated using (quran_is_manager(quran_halaqoh_unit(id))) with check (quran_is_manager(quran_subject_or_employee_unit(subject_id, employee_id)));
drop policy if exists "Quran teachers read own halaqohs" on public.tahfidz_halaqohs;
create policy "Quran teachers read own halaqohs" on public.tahfidz_halaqohs as permissive for select to authenticated using ((employee_id = current_employee_id()));
drop policy if exists "Teachers access for tahfidz_halaqohs" on public.tahfidz_halaqohs;
create policy "Teachers access for tahfidz_halaqohs" on public.tahfidz_halaqohs as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'guru'::text)))));
drop policy if exists "Admin full access for tahfidz_student_targets" on public.tahfidz_student_targets;
create policy "Admin full access for tahfidz_student_targets" on public.tahfidz_student_targets as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin'::text, 'admin_unit'::text]))))));
drop policy if exists "Parents can view their children tahfidz_student_targets" on public.tahfidz_student_targets;
create policy "Parents can view their children tahfidz_student_targets" on public.tahfidz_student_targets as permissive for select to authenticated using ((student_id IN ( SELECT spl.student_id
   FROM (student_parent_links spl
     JOIN parents p ON ((spl.parent_id = p.id)))
  WHERE (p.user_id = auth.uid()))));
drop policy if exists "Quran managers manage tahfidz targets" on public.tahfidz_student_targets;
create policy "Quran managers manage tahfidz targets" on public.tahfidz_student_targets as permissive for all to authenticated using (quran_is_manager(quran_student_unit(student_id))) with check (quran_is_manager(quran_student_unit(student_id)));
drop policy if exists "Quran teachers manage assigned tahfidz targets" on public.tahfidz_student_targets;
create policy "Quran teachers manage assigned tahfidz targets" on public.tahfidz_student_targets as permissive for all to authenticated using (quran_teacher_has_scope(student_id, ( SELECT student.class_id
   FROM students student
  WHERE (student.id = tahfidz_student_targets.student_id)), subject_id, halaqoh_id, academic_year_id, semester_id)) with check (quran_teacher_has_scope(student_id, ( SELECT student.class_id
   FROM students student
  WHERE (student.id = tahfidz_student_targets.student_id)), subject_id, halaqoh_id, academic_year_id, semester_id));
drop policy if exists "Teachers access for tahfidz_student_targets" on public.tahfidz_student_targets;
create policy "Teachers access for tahfidz_student_targets" on public.tahfidz_student_targets as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'guru'::text)))));
drop policy if exists "Parents read linked tahsin student targets" on public.tahsin_student_targets;
create policy "Parents read linked tahsin student targets" on public.tahsin_student_targets as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (student_parent_links link
     JOIN parents parent_record ON ((parent_record.id = link.parent_id)))
  WHERE ((link.student_id = tahsin_student_targets.student_id) AND (parent_record.user_id = auth.uid())))));
drop policy if exists "Quran managers manage tahsin student targets" on public.tahsin_student_targets;
create policy "Quran managers manage tahsin student targets" on public.tahsin_student_targets as permissive for all to authenticated using (quran_can_manage_student_target(student_id, halaqoh_id)) with check (quran_can_manage_student_target(student_id, halaqoh_id));
drop policy if exists "Quran managers manage tahsin targets" on public.tahsin_student_targets;
create policy "Quran managers manage tahsin targets" on public.tahsin_student_targets as permissive for all to authenticated using (quran_is_manager(quran_student_unit(student_id))) with check (quran_is_manager(quran_student_unit(student_id)));
drop policy if exists "Quran teachers manage assigned tahsin targets" on public.tahsin_student_targets;
create policy "Quran teachers manage assigned tahsin targets" on public.tahsin_student_targets as permissive for all to authenticated using (quran_teacher_has_scope(student_id, ( SELECT student.class_id
   FROM students student
  WHERE (student.id = tahsin_student_targets.student_id)), subject_id, halaqoh_id, academic_year_id, semester_id)) with check (quran_teacher_has_scope(student_id, ( SELECT student.class_id
   FROM students student
  WHERE (student.id = tahsin_student_targets.student_id)), subject_id, halaqoh_id, academic_year_id, semester_id));
drop policy if exists "Employees read own academic assignments" on public.teacher_assignments;
create policy "Employees read own academic assignments" on public.teacher_assignments as permissive for select to authenticated using ((employee_id = current_employee_id()));
drop policy if exists "Managers manage academic assignments" on public.teacher_assignments;
create policy "Managers manage academic assignments" on public.teacher_assignments as permissive for all to authenticated using (teacher_portal_is_manager(unit_id)) with check (teacher_portal_is_manager(unit_id));
drop policy if exists "Super admins can do all on teacher_assignments" on public.teacher_assignments;
create policy "Super admins can do all on teacher_assignments" on public.teacher_assignments as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read assignments in their unit" on public.teacher_assignments;
create policy "Users can read assignments in their unit" on public.teacher_assignments as permissive for select to authenticated using (can_access_unit(unit_id));
drop policy if exists "Super admins can do all on units" on public.units;
create policy "Super admins can do all on units" on public.units as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read assigned units" on public.units;
create policy "Users can read assigned units" on public.units as permissive for select to authenticated using (can_access_unit(id));
drop policy if exists "Super admins can do all on user_roles" on public.user_roles;
create policy "Super admins can do all on user_roles" on public.user_roles as permissive for all to authenticated using (is_super_admin()) with check (is_super_admin());
drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles" on public.user_roles as permissive for select to authenticated using ((auth.uid() = user_id));
