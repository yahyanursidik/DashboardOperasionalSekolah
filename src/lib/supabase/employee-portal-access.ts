import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { staffPortalPositions } from "../../modules/staff-portal/staff-utils.ts";

export type EmployeePortal = "staff" | "teacher" | "hrd" | "bendahara";
type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type PortalEmployee = Employee & { units?: { name: string } | null };
type PortalClient = Pick<SupabaseClient<Database>, "from" | "rpc">;

export class PortalAccessError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = true) {
    super(message);
    this.name = "PortalAccessError";
    this.retryable = retryable;
  }
}

export function normalizeEmployeeIdentifier(value: string) {
  return value.includes("@") ? value.trim().toLowerCase() : value.replace(/\s+/g, "");
}

export function portalAccessMessage(error: unknown) {
  return error instanceof PortalAccessError ? error.message : "Portal belum dapat dimuat. Periksa koneksi lalu coba lagi. Sesi Anda tidak dikeluarkan.";
}

// Used by both login and route guards. Never convert a failed read into a role
// denial, and never sign out a valid session just because a request failed.
export async function loadEmployeePortalWorkspace(client: PortalClient, userId: string, portal: EmployeePortal) {
  // Unit display data is optional, not part of authentication. An embedded join
  // used to make a units/schema/RLS failure sign out an otherwise valid employee.
  let profileQuery = client.from("employees").select("*").eq("user_id", userId);
  // A finance manager may have only a user_role, but an explicitly disabled
  // employee must not be mistaken for such a role-only account.
  if (portal !== "bendahara") profileQuery = profileQuery.eq("status", "active");
  const profile = await profileQuery.maybeSingle();
  if (profile.error) {
    throw new PortalAccessError(profile.error.code === "PGRST116"
      ? "Akun tertaut ke lebih dari satu pegawai aktif. Hubungi HRD untuk memperbaiki tautan akun."
      : "Profil pegawai belum dapat dibaca. Coba lagi; bila berulang, minta admin memeriksa izin akses data pegawai.");
  }
  let employee: PortalEmployee | null = profile.data;
  if (portal === "bendahara" && employee && employee.status !== "active") {
    throw new PortalAccessError("Status pegawai tidak aktif. Hubungi HRD/admin sekolah.", false);
  }
  let roles: string[] = [];

  if (portal === "staff" || portal === "teacher") {
    if (!employee) throw new PortalAccessError("Profil pegawai aktif tidak ditemukan atau belum dapat diakses. Hubungi HRD untuk memeriksa tautan akun.", false);
    const access = await client.rpc(portal === "staff" ? "staff_has_portal_access" : "teacher_has_portal_access");
    if (access.error) throw new PortalAccessError("Kewenangan portal belum dapat diperiksa. Coba lagi; bila berulang, minta admin memeriksa fungsi akses portal.");
    if (access.data !== true || (portal === "staff" && !staffPortalPositions.includes(employee.position || ""))) {
      throw new PortalAccessError("Akun belum memiliki penugasan aktif untuk portal ini. Hubungi HRD/admin sekolah.", false);
    }
  } else {
    const result = await client.from("user_roles").select("roles(name)").eq("user_id", userId);
    if (result.error) throw new PortalAccessError("Peran akun belum dapat dibaca. Coba lagi; bila berulang, hubungi admin sekolah.");
    const rows = (result.data || []) as unknown as { roles: { name: string } | { name: string }[] | null }[];
    roles = rows.flatMap((row) => {
      const relation = row.roles;
      return (Array.isArray(relation) ? relation : [relation]).flatMap((role) => role?.name ? [role.name] : []);
    });
    const allowed = portal === "hrd"
      ? Boolean(employee) && roles.some((role) => ["hrd", "super_admin", "ketua_yayasan"].includes(role))
      : Boolean(employee && ["bendahara", "keuangan"].some((value) => (employee.position || "").toLowerCase().includes(value)))
        || roles.some((role) => ["super_admin", "ketua_yayasan", "kepala_tu", "admin_keuangan"].includes(role));
    if (!allowed) throw new PortalAccessError("Akun belum memiliki kewenangan aktif untuk portal ini. Hubungi admin sekolah.", false);
  }

  if (employee?.unit_id) {
    // A unit may legitimately be hidden for staff with no user_roles. Do not
    // grant broad unit access or fabricate a different employee to bypass RLS.
    try {
      const unit = await client.from("units").select("name").eq("id", employee.unit_id).maybeSingle();
      if (!unit.error) employee = { ...employee, units: unit.data };
    } catch { /* Optional display enrichment; protected data queries still use RLS. */ }
  }
  return { employee, roles };
}
