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
  'students': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'teachers': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_sekolah', 'admin_unit'],
  'classes': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'financials': ['super_admin', 'ketua_yayasan', 'admin_keuangan', 'kepsek', 'kepala_tu'],
  'reports': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_sekolah', 'admin_unit'],
  'documents': ['super_admin', 'ketua_yayasan', 'kepala_tu', 'admin_tu', 'admin_dokumen'],
  'attendance': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'operator_absensi', 'wali_kelas', 'guru'],
  'employee_attendance': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu'],
  'employee_schedules': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'leave_requests': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'guru'],
  'substitute_assignments': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit'],
  'settings': ['super_admin', 'ketua_yayasan'],
  'admin_tasks': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'guru'],
  'announcements': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu'],
  'audit_logs': ['super_admin', 'ketua_yayasan'],
  'quran_records': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],
  'quran_targets': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],
  'quran_assessments': ['super_admin', 'ketua_yayasan', 'kepsek', 'admin_unit', 'guru', 'wali_kelas'],

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
  'cbt_exams': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_banks': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_questions': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'cbt_participants': ['super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
  'employees': ['super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_sekolah', 'admin_unit', 'hrd'],
};

export const canAccessResource = (scopes: UserRoleScope[] | undefined, resource: string): boolean => {
  if (!scopes) return false;
  if (hasRole(scopes, 'super_admin')) return true;

  const allowedRoles = ResourceAccessMap[resource];
  if (!allowedRoles) return false; // Default deny if resource not explicitly defined

  return hasAnyRole(scopes, allowedRoles);
};
