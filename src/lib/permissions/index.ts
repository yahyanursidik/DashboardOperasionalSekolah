export type RoleName = 
  | 'super_admin'
  | 'ketua_yayasan'
  | 'kepsek'
  | 'wakasek'
  | 'kepala_tu'
  | 'admin_tu'
  | 'admin_sekolah'
  | 'admin_unit'
  | 'admin_keuangan'
  | 'admin_dokumen'
  | 'admin_spmb'
  | 'operator_absensi'
  | 'guru'
  | 'wali_kelas'
  | 'hrd';

export interface UserRoleScope {
  role: RoleName;
  unit_id: string | null;
}

export const hasRole = (scopes: UserRoleScope[] | undefined, roleName: RoleName): boolean => {
  if (!scopes) return false;
  return scopes.some(scope => scope.role === roleName);
};

export const hasAnyRole = (scopes: UserRoleScope[] | undefined, roleNames: RoleName[]): boolean => {
  if (!scopes) return false;
  return scopes.some(scope => roleNames.includes(scope.role));
};

export const canAccessUnit = (scopes: UserRoleScope[] | undefined, unitId: string): boolean => {
  if (!scopes) return false;
  // Super admin & ketua yayasan can access all units
  if (hasAnyRole(scopes, ['super_admin', 'ketua_yayasan'])) return true;
  // Check if they have a role scoped to this specific unit
  return scopes.some(scope => scope.unit_id === unitId || scope.unit_id === null); // null unit_id means global role
};

// Resource map defining which roles can access which resources
const ResourceAccessMap: Record<string, RoleName[]> = {
  'students': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_keuangan', 'guru', 'wali_kelas'],
  'teachers': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_sekolah', 'admin_unit'],
  'classes': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'subjects': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'subject_curriculums': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'subject_curriculum_semesters': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'academic_grades': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'academic_report_cards': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'wali_kelas'],
  'report_periods': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'wali_kelas'],
  'paud_curriculums': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'financials': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'student_invoices': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'payment_transactions': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'school_expenses': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_categories': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_settings': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepala_tu'],
  'finance_cash_accounts': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_budgets': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_receipts': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_fee_rates': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_programs': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_accounts': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'finance_journal_entries': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'reports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_sekolah', 'admin_unit'],
  'report_export_logs': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_sekolah', 'admin_unit'],
  'documents': ['super_admin', 'ketua_yayasan', 'kepala_tu', 'admin_tu', 'admin_dokumen'],
  'document_types': ['super_admin', 'ketua_yayasan', 'kepala_tu', 'admin_tu', 'admin_dokumen'],
  'document_governance_actions': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_dokumen'],
  'attendance': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'operator_absensi', 'wali_kelas', 'guru'],
  'attendance_records': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'operator_absensi', 'wali_kelas', 'guru'],
  'employee_attendance': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'operator_absensi', 'hrd'],
  'attendance_shifts': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'operator_absensi', 'hrd'],
  'attendance_shift_assignments': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'operator_absensi', 'hrd'],
  'employee_schedules': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'leave_requests': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru', 'hrd'],
  'substitute_assignments': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'settings': ['super_admin', 'ketua_yayasan'],
  'admin_tasks': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru'],
  'announcements': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'audit_logs': ['super_admin', 'ketua_yayasan'],
  'quran_records': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],
  'quran_targets': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],
  'quran_assessments': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],
  'student_journals': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahfidz_halaqohs': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahfidz_student_targets': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahfidz_reports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahsin_halaqohs': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahsin_student_targets': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahsin_records': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahsin_assessments': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'tahsin_reports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],

  // Digital reports
  'student_reports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'report_templates': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'report_reviews': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'wali_kelas'],
  'report_publish_logs': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'report_pdf_exports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'wali_kelas'],

  // Admissions (SPMB)
  'admissions': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_spmb'],
  'admissions_applicants': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_spmb'],

  // PAUD Module
  'paud_activities': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],
  'paud_stppa_assessments': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],

  // PKG / Penilaian Kinerja Guru
  'pkg_assessments': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_sekolah', 'admin_unit'],

  // Ekstrakurikuler
  'extracurricular': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],

  // Recruitment & CBT
  'recruitment_vacancies': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'recruitment_applicants': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'recruitment_cbt': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_exams': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_banks': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_questions': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_participants': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'employees': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'staff_operational_reports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],

  // Facilities, administration, and staff development
  'assets': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'asset_loans': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'procurements': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'asset_maintenance_requests': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'asset_stocktakes': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'asset_stocktake_items': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'rooms': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'room_schedules': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'mail_records': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_dokumen'],
  'mail_dispositions': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_dokumen'],
  'digital_library_books': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'onboarding_materials': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
};

export const canAccessResource = (scopes: UserRoleScope[] | undefined, resource: string): boolean => {
  if (!scopes) return false;
  if (hasRole(scopes, 'super_admin')) return true;

  const allowedRoles = ResourceAccessMap[resource];
  if (!allowedRoles) return false; // Default deny if resource not explicitly defined

  return hasAnyRole(scopes, allowedRoles);
};
