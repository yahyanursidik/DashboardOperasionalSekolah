export type RoleName = 
  | 'super_admin'
  | 'kepsek'
  | 'wakasek'
  | 'admin_sekolah'
  | 'admin_unit'
  | 'admin_keuangan'
  | 'admin_dokumen'
  | 'operator_absensi'
  | 'guru'
  | 'wali_kelas';

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
  // Super admin can access all units
  if (hasRole(scopes, 'super_admin')) return true;
  // Check if they have a role scoped to this specific unit
  return scopes.some(scope => scope.unit_id === unitId || scope.unit_id === null); // null unit_id means global role
};

// Resource map defining which roles can access which resources
const ResourceAccessMap: Record<string, RoleName[]> = {
  'students': ['super_admin', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'teachers': ['super_admin', 'kepsek', 'admin_sekolah', 'admin_unit'],
  'classes': ['super_admin', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit', 'guru', 'wali_kelas'],
  'financials': ['super_admin', 'admin_keuangan', 'kepsek'],
  'reports': ['super_admin', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit'],
  'documents': ['super_admin', 'admin_dokumen'],
  'attendance': ['super_admin', 'operator_absensi', 'wali_kelas', 'guru'],
  'settings': ['super_admin'],
};

export const canAccessResource = (scopes: UserRoleScope[] | undefined, resource: string): boolean => {
  if (!scopes) return false;
  if (hasRole(scopes, 'super_admin')) return true;

  const allowedRoles = ResourceAccessMap[resource];
  if (!allowedRoles) return false; // Default deny if resource not explicitly defined

  return hasAnyRole(scopes, allowedRoles);
};
