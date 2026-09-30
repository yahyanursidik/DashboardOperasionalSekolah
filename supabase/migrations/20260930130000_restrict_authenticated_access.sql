-- Pengetatan RLS untuk pengguna login (audit produksi 2026-09-30).
--
-- Orang tua, pendaftar SPMB, dan peserta ekskul dapat membuat akun sendiri, sehingga kebijakan
-- `true` / `auth.uid() IS NOT NULL` / `auth.role() = 'authenticated'` praktis memberi mereka akses
-- baca-tulis ke nilai, rapor, pengaturan (termasuk rekening bank sekolah), data pelamar, dll.
-- Kebijakan RLS bersifat OR, jadi satu kebijakan longgar membatalkan kebijakan terbatas lainnya.
--
-- Migrasi ini mengganti kebijakan longgar tersebut:
--   * tulis  -> hanya staf sekolah (punya peran staf, atau pegawai aktif — kebanyakan guru tidak
--               punya baris user_roles dan dikenali lewat employees.user_id)
--   * baca data siswa (nilai, jurnal, rapor lama) -> staf atau orang tua siswa tersebut
--   * data sensitif khusus (pelamar kerja, PKG, pengaturan sistem) -> peran pengelola terkait
-- Tabel referensi non-sensitif dan tabel yang ditulis langsung oleh portal ekskul/pegawai
-- (extracurricular_members, external_students, employees) sengaja belum diubah di sini.
-- Snapshot kebijakan sebelum migrasi: supabase/rls-snapshot-before-20260930130000.sql

create or replace function public.has_any_role(role_names text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.auth_user_roles() where role_name = any(role_names));
$$;

create or replace function public.is_school_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.auth_user_roles() where role_name is not null and role_name <> 'wali_murid')
      or exists (select 1 from public.employees e where e.user_id = auth.uid() and e.status = 'active');
$$;

grant execute on function public.has_any_role(text[]) to authenticated;
grant execute on function public.is_school_staff() to authenticated;

-- Helper: drop a list of (table, policy) pairs.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('academic_grades', 'Allow authenticated delete access on academic_grades'),
    ('academic_grades', 'Allow authenticated insert access on academic_grades'),
    ('academic_grades', 'Allow authenticated read access on academic_grades'),
    ('academic_grades', 'Allow authenticated update access on academic_grades'),
    ('academic_report_cards', 'Allow authenticated delete access on academic_report_cards'),
    ('academic_report_cards', 'Allow authenticated insert access on academic_report_cards'),
    ('academic_report_cards', 'Allow authenticated read access on academic_report_cards'),
    ('academic_report_cards', 'Allow authenticated update access on academic_report_cards'),
    ('admissions_applicants', 'Enable all access for authenticated users'),
    ('admissions_applicants', 'Enable insert for anon users'),
    ('asset_loans', 'Allow authenticated access to asset_loans'),
    ('assets', 'Allow authenticated access to assets'),
    ('procurements', 'Allow authenticated access to procurements'),
    ('calendar_events', 'Allow authenticated users to delete calendar_events'),
    ('calendar_events', 'Allow authenticated users to insert calendar_events'),
    ('calendar_events', 'Allow authenticated users to read calendar_events'),
    ('calendar_events', 'Allow authenticated users to update calendar_events'),
    ('curriculum_documents', 'Authenticated users read curriculum documents'),
    ('curriculum_documents', 'Enable delete for authenticated users on curriculum_documents'),
    ('curriculum_documents', 'Enable insert for authenticated users on curriculum_documents'),
    ('curriculum_documents', 'Enable update for authenticated users on curriculum_documents'),
    ('digital_library_books', 'Enable ALL for authenticated users on digital_library_books'),
    ('digital_library_categories', 'Enable ALL for authenticated users on digital_library_categories'),
    ('employee_schedules', 'Users can delete schedules'),
    ('employee_schedules', 'Users can insert schedules'),
    ('employee_schedules', 'Users can read all schedules'),
    ('employee_schedules', 'Users can update schedules'),
    ('extracurriculars', 'Enable delete for authenticated users only'),
    ('extracurriculars', 'Enable insert for authenticated users only'),
    ('extracurriculars', 'Enable update for authenticated users only'),
    ('leave_requests', 'Users can delete leave requests'),
    ('leave_requests', 'Users can insert leave requests'),
    ('leave_requests', 'Users can read all leave requests'),
    ('leave_requests', 'Users can update leave requests'),
    ('parent_report_reads', 'Allow authenticated full access to parent_report_reads'),
    ('paud_curriculums', 'Allow authenticated full access to paud_curriculums'),
    ('pkg_assessments', 'pkg_authenticated_all'),
    ('pkg_competencies', 'pkg_comp_auth'),
    ('pkg_indicators', 'pkg_ind_auth'),
    ('recruitment_applicants', 'Enable all access for authenticated users on recruitment_applicants'),
    ('recruitment_vacancies', 'Enable all access for authenticated users on recruitment_vacancies'),
    ('report_pdf_exports', 'Allow authenticated full access to report_pdf_exports'),
    ('report_periods', 'Allow authenticated full access to report_periods'),
    ('report_publish_logs', 'Allow authenticated full access to report_publish_logs'),
    ('report_reviews', 'Allow authenticated full access to report_reviews'),
    ('report_template_items', 'Allow authenticated full access to report_template_items'),
    ('report_template_sections', 'Allow authenticated full access to report_template_sections'),
    ('report_templates', 'Allow authenticated full access to report_templates'),
    ('student_report_notes', 'Allow authenticated full access to student_report_notes'),
    ('student_report_scores', 'Allow authenticated full access to student_report_scores'),
    ('student_reports', 'Allow authenticated full access to student_reports'),
    ('room_schedules', 'Authenticated users manage room schedules'),
    ('rooms', 'Authenticated users manage rooms'),
    ('student_academic_history', 'Authenticated users read student academic history'),
    ('student_academic_history', 'Enable delete for authenticated users on student_academic_history'),
    ('student_academic_history', 'Enable insert for authenticated users on student_academic_history'),
    ('student_academic_history', 'Enable update for authenticated users on student_academic_history'),
    ('student_journals', 'Users can delete journals'),
    ('student_journals', 'Users can insert journals'),
    ('student_journals', 'Users can read all journals'),
    ('student_journals', 'Users can update journals'),
    ('subjects', 'Enable delete for authenticated users on subjects'),
    ('subjects', 'Enable insert for authenticated users on subjects'),
    ('subjects', 'Enable read access for all users on subjects'),
    ('subjects', 'Enable update for authenticated users on subjects'),
    ('substitute_assignments', 'Users can delete substitute assignments'),
    ('substitute_assignments', 'Users can insert substitute assignments'),
    ('substitute_assignments', 'Users can read all substitute assignments'),
    ('substitute_assignments', 'Users can update substitute assignments'),
    ('system_settings', 'Authenticated users can update system_settings')
  ) as t(table_name, policy_name) loop
    execute format('drop policy if exists %I on public.%I', item.policy_name, item.table_name);
  end loop;
end $$;

-- Some production policy names were truncated at 63 characters when they were created.
drop policy if exists "Enable ALL for authenticated users on digital_library_categori" on public.digital_library_categories;
drop policy if exists "Enable all access for authenticated users on recruitment_applic" on public.recruitment_applicants;
drop policy if exists "Enable all access for authenticated users on recruitment_vacanc" on public.recruitment_vacancies;
drop policy if exists "Allow authenticated full access to report_template_sections" on public.report_template_sections;
drop policy if exists "Enable delete for authenticated users on student_academic_hist" on public.student_academic_history;
drop policy if exists "Enable insert for authenticated users on student_academic_hist" on public.student_academic_history;
drop policy if exists "Enable update for authenticated users on student_academic_hist" on public.student_academic_history;
drop policy if exists "Enable delete for authenticated users on curriculum_documents" on public.curriculum_documents;
drop policy if exists "Enable insert for authenticated users on curriculum_documents" on public.curriculum_documents;
drop policy if exists "Enable update for authenticated users on curriculum_documents" on public.curriculum_documents;

-- Staff manage everything on these operational tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'academic_report_cards', 'asset_loans', 'assets', 'procurements', 'calendar_events', 'curriculum_documents',
    'digital_library_books', 'digital_library_categories', 'employee_schedules', 'extracurriculars',
    'leave_requests', 'parent_report_reads', 'paud_curriculums', 'report_pdf_exports', 'report_periods',
    'report_publish_logs', 'report_reviews', 'report_template_items', 'report_template_sections',
    'report_templates', 'student_report_notes', 'student_report_scores', 'student_reports',
    'room_schedules', 'rooms', 'student_academic_history', 'substitute_assignments',
    'academic_grades', 'student_journals', 'subjects'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'School staff manage ' || table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_school_staff()) with check (public.is_school_staff())',
      'School staff manage ' || table_name, table_name);
  end loop;
end $$;

-- Parents read their own children's grades, journals, and legacy report cards.
drop policy if exists "Parents read own children academic grades" on public.academic_grades;
create policy "Parents read own children academic grades" on public.academic_grades
  for select to authenticated using (public.is_parent_of_student(student_id));
drop policy if exists "Parents read own children journals" on public.student_journals;
-- Internal notes (e.g. category 'kasus') stay internal; only entries shared with parents are visible.
create policy "Parents read own children journals" on public.student_journals
  for select to authenticated using (visibility = 'parents' and public.is_parent_of_student(student_id));
drop policy if exists "Parents read own children report cards" on public.academic_report_cards;
create policy "Parents read own children report cards" on public.academic_report_cards
  for select to authenticated using (public.is_parent_of_student(student_id));

-- Non-sensitive reference data that portals render (subject names, report layouts, library catalogue).
drop policy if exists "Authenticated read subjects" on public.subjects;
create policy "Authenticated read subjects" on public.subjects for select to authenticated using (true);
drop policy if exists "Authenticated read report templates" on public.report_templates;
create policy "Authenticated read report templates" on public.report_templates for select to authenticated using (true);
drop policy if exists "Authenticated read report template sections" on public.report_template_sections;
create policy "Authenticated read report template sections" on public.report_template_sections for select to authenticated using (true);
drop policy if exists "Authenticated read report template items" on public.report_template_items;
create policy "Authenticated read report template items" on public.report_template_items for select to authenticated using (true);
drop policy if exists "Authenticated read report periods" on public.report_periods;
create policy "Authenticated read report periods" on public.report_periods for select to authenticated using (true);
drop policy if exists "Authenticated read library books" on public.digital_library_books;
create policy "Authenticated read library books" on public.digital_library_books for select to authenticated using (true);

-- Recruitment data (personal data of applicants): recruitment managers only.
drop policy if exists "Recruitment managers manage applicants" on public.recruitment_applicants;
create policy "Recruitment managers manage applicants" on public.recruitment_applicants for all to authenticated
  using (public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_tu','admin_sekolah','admin_unit','hrd']))
  with check (public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_tu','admin_sekolah','admin_unit','hrd']));
drop policy if exists "Recruitment managers manage vacancies" on public.recruitment_vacancies;
create policy "Recruitment managers manage vacancies" on public.recruitment_vacancies for all to authenticated
  using (public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_tu','admin_sekolah','admin_unit','hrd']))
  with check (public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_tu','admin_sekolah','admin_unit','hrd']));

-- Teacher performance (PKG): assessors manage; each employee reads their own assessments.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['pkg_assessments', 'pkg_competencies', 'pkg_indicators'] loop
    execute format('drop policy if exists %I on public.%I', 'PKG assessors manage ' || table_name, table_name);
    execute format($f$create policy %I on public.%I for all to authenticated
      using (public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_sekolah','admin_unit']))
      with check (public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_sekolah','admin_unit']))$f$,
      'PKG assessors manage ' || table_name, table_name);
  end loop;
end $$;
drop policy if exists "Staff read PKG instruments" on public.pkg_competencies;
create policy "Staff read PKG instruments" on public.pkg_competencies for select to authenticated using (public.is_school_staff());
drop policy if exists "Staff read PKG indicators" on public.pkg_indicators;
create policy "Staff read PKG indicators" on public.pkg_indicators for select to authenticated using (public.is_school_staff());
drop policy if exists "Employees read own PKG assessments" on public.pkg_assessments;
create policy "Employees read own PKG assessments" on public.pkg_assessments for select to authenticated
  using (employee_id in (select e.id from public.employees e where e.user_id = auth.uid()));

-- System settings: public read stays (login page branding, payment instructions).
-- Writes: foundation leaders for everything; finance admins only for finance_* keys.
drop policy if exists "Leaders manage system settings" on public.system_settings;
create policy "Leaders manage system settings" on public.system_settings for all to authenticated
  using (public.has_any_role(array['super_admin','ketua_yayasan']))
  with check (public.has_any_role(array['super_admin','ketua_yayasan']));
drop policy if exists "Finance admins manage finance settings" on public.system_settings;
create policy "Finance admins manage finance settings" on public.system_settings for all to authenticated
  using (public.has_any_role(array['admin_keuangan','kepala_tu']) and key like 'finance\_%')
  with check (public.has_any_role(array['admin_keuangan','kepala_tu']) and key like 'finance\_%');

notify pgrst, 'reload schema';
