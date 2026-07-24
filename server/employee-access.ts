import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type EmployeeAccessAction = "status" | "provision" | "reset_password" | "disable" | "enable" | "change_own_password";

export interface EmployeeAccessRequest {
  action?: EmployeeAccessAction;
  employeeId?: string;
  newPassword?: string;
}

interface EmployeeRecord {
  id: string;
  nik: string | null;
  email: string | null;
  full_name: string;
  position: string | null;
  status: string;
  unit_id: string | null;
  user_id: string | null;
}

interface RoleScopeRow {
  unit_id: string | null;
  roles: unknown;
}

interface EmployeeAccessContext {
  authorization?: string | null;
  body?: EmployeeAccessRequest | null;
  supabaseUrl?: string;
  serviceRoleKey?: string;
  userAgent?: string | null;
}

export interface EmployeeAccessResponse {
  status: number;
  body: Record<string, unknown>;
}

const globalAccessRoles = new Set(["super_admin", "ketua_yayasan", "kepala_tu", "hrd"]);
const scopedAccessRoles = new Set(["admin_tu", "admin_sekolah", "admin_unit"]);
const teacherPositions = new Set([
  "kepala_sekolah",
  "wakasek_umum",
  "wakasek_kurikulum",
  "wakasek_kesiswaan",
  "kepala_unit",
  "guru",
  "guru_quran",
  "bk",
]);

function json(status: number, body: Record<string, unknown>): EmployeeAccessResponse {
  return { status, body };
}

function createTemporaryPassword() {
  return `Tsls!${randomBytes(10).toString("base64url")}7a`;
}

function readRoleName(value: unknown) {
  if (Array.isArray(value)) return String(value[0]?.name || "");
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: string }).name || "");
  return "";
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function getLinkedUser(admin: SupabaseClient, userId?: string | null, email?: string | null) {
  if (userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (!error && data.user) return data.user;
  }
  return email ? findUserByEmail(admin, email) : null;
}

function isDisabled(user: User | null) {
  if (!user?.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}

function buildStatus(employee: EmployeeRecord, authUser: User | null) {
  const portal = teacherPositions.has(employee.position || "") ? "teacher" : "staff";
  return {
    employeeId: employee.id,
    portal,
    portalLabel: portal === "teacher" ? "Portal Pengajar" : "Portal Staf",
    employeeActive: employee.status === "active",
    linked: Boolean(employee.user_id),
    authExists: Boolean(authUser),
    enabled: Boolean(authUser) && !isDisabled(authUser),
    email: authUser?.email || employee.email || null,
    mustChangePassword: Boolean(authUser?.app_metadata?.must_change_password || authUser?.user_metadata?.must_change_password),
    createdAt: authUser?.created_at || null,
    lastSignInAt: authUser?.last_sign_in_at || null,
    passwordChangedAt: authUser?.user_metadata?.password_changed_at || null,
  };
}

async function writeAudit(
  admin: SupabaseClient,
  actorId: string,
  employeeId: string,
  action: EmployeeAccessAction,
  status: Record<string, unknown>,
  userAgent?: string | null,
) {
  await admin.from("audit_logs").insert({
    user_id: actorId,
    action: action === "provision" ? "create" : "status-change",
    resource_name: "employee_portal_access",
    resource_id: employeeId,
    old_values: null,
    new_values: { action, ...status },
    user_agent: userAgent || null,
  });
}

async function processEmployeeAccess(context: EmployeeAccessContext): Promise<EmployeeAccessResponse> {
  const { authorization, body, supabaseUrl, serviceRoleKey, userAgent } = context;
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "Konfigurasi layanan autentikasi belum lengkap." });

  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Sesi admin tidak ditemukan. Silakan masuk kembali." });

  const action = body?.action;
  const employeeId = body?.employeeId?.trim();
  if (!action || !["status", "provision", "reset_password", "disable", "enable", "change_own_password"].includes(action)) {
    return json(400, { error: "Perintah pengelolaan akses tidak valid." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: actorData, error: actorError } = await admin.auth.getUser(token);
  if (actorError || !actorData.user) return json(401, { error: "Sesi admin sudah tidak berlaku. Silakan masuk kembali." });

  if (action === "change_own_password") {
    const newPassword = body?.newPassword || "";
    const strongEnough = newPassword.length >= 10
      && /[a-z]/.test(newPassword)
      && /[A-Z]/.test(newPassword)
      && /\d/.test(newPassword)
      && /[^A-Za-z0-9]/.test(newPassword);
    if (!strongEnough) return json(400, { error: "Kata sandi minimal 10 karakter dan harus memuat huruf besar, huruf kecil, angka, serta simbol." });

    const { data: ownEmployee } = await admin.from("employees").select("id, status").eq("user_id", actorData.user.id).maybeSingle();
    if (!ownEmployee || ownEmployee.status !== "active") return json(403, { error: "Akun pegawai aktif tidak ditemukan." });
    const changedAt = new Date().toISOString();
    const { error: updateError } = await admin.auth.admin.updateUserById(actorData.user.id, {
      password: newPassword,
      app_metadata: { ...(actorData.user.app_metadata || {}), must_change_password: false, password_changed_at: changedAt },
      user_metadata: { ...(actorData.user.user_metadata || {}), must_change_password: false, password_initialized_by_admin: false, password_changed_at: changedAt },
    });
    if (updateError) return json(400, { error: updateError.message });
    await writeAudit(admin, actorData.user.id, ownEmployee.id, action, { passwordChangedAt: changedAt }, userAgent);
    return json(200, { message: "Kata sandi pribadi berhasil disimpan." });
  }

  if (!employeeId) return json(400, { error: "Pegawai belum dipilih." });

  const [{ data: roleRows, error: roleError }, { data: employeeData, error: employeeError }] = await Promise.all([
    admin.from("user_roles").select("unit_id, roles(name)").eq("user_id", actorData.user.id),
    admin.from("employees").select("id, nik, email, full_name, position, status, unit_id, user_id").eq("id", employeeId).maybeSingle(),
  ]);
  const employee = employeeData as EmployeeRecord | null;
  if (roleError) return json(500, { error: "Hak akses admin belum dapat diverifikasi." });
  if (employeeError || !employee) return json(404, { error: "Data pegawai tidak ditemukan." });

  const scopes = ((roleRows || []) as RoleScopeRow[]).map((row) => ({ role: readRoleName(row.roles), unitId: row.unit_id }));
  const hasGlobalAccess = scopes.some((scope) => globalAccessRoles.has(scope.role));
  const hasScopedAccess = scopes.some((scope) => scopedAccessRoles.has(scope.role) && scope.unitId && scope.unitId === employee.unit_id);
  if (!hasGlobalAccess && !hasScopedAccess) {
    return json(403, { error: "Anda tidak memiliki wewenang mengelola akun portal pegawai ini." });
  }

  let authUser = await getLinkedUser(admin, employee.user_id, employee.email);
  if (action === "status") return json(200, { access: buildStatus(employee, authUser) });

  if (!employee.email?.trim()) return json(400, { error: "Lengkapi email resmi pegawai sebelum mengaktifkan akun portal." });
  if (employee.status !== "active" && action !== "disable") {
    return json(400, { error: "Akun portal hanya dapat diaktifkan untuk pegawai berstatus aktif." });
  }

  let temporaryPassword: string | undefined;
  if (action === "provision" || action === "reset_password") {
    temporaryPassword = createTemporaryPassword();
    const metadata = {
      ...(authUser?.user_metadata || {}),
      full_name: employee.full_name,
      must_change_password: true,
      password_initialized_by_admin: true,
      portal_type: teacherPositions.has(employee.position || "") ? "teacher" : "staff",
    };
    const appMetadata = {
      ...(authUser?.app_metadata || {}),
      must_change_password: true,
      portal_type: teacherPositions.has(employee.position || "") ? "teacher" : "staff",
    };

    if (authUser) {
      const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
        email: employee.email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        ban_duration: "none",
        user_metadata: metadata,
        app_metadata: appMetadata,
      });
      if (error) return json(400, { error: error.message });
      authUser = data.user;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: employee.email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: appMetadata,
      });
      if (error || !data.user) return json(400, { error: error?.message || "Akun autentikasi gagal dibuat." });
      authUser = data.user;
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      { id: authUser.id, full_name: employee.full_name, is_active: true },
      { onConflict: "id" },
    );
    if (profileError) return json(400, { error: `Profil akun gagal disiapkan: ${profileError.message}` });
    const { error: linkError } = await admin.from("employees").update({ user_id: authUser.id }).eq("id", employee.id);
    if (linkError) return json(400, { error: `Akun gagal ditautkan ke pegawai: ${linkError.message}` });
    employee.user_id = authUser.id;
  }

  if ((action === "disable" || action === "enable") && !authUser) {
    return json(400, { error: "Akun portal belum dibuat. Gunakan Aktivasi Akun terlebih dahulu." });
  }
  if (action === "disable" && authUser) {
    const { data, error } = await admin.auth.admin.updateUserById(authUser.id, { ban_duration: "876000h" });
    if (error) return json(400, { error: error.message });
    authUser = data.user;
  }
  if (action === "enable" && authUser) {
    const { data, error } = await admin.auth.admin.updateUserById(authUser.id, { ban_duration: "none" });
    if (error) return json(400, { error: error.message });
    authUser = data.user;
  }

  const access = buildStatus(employee, authUser);
  await writeAudit(admin, actorData.user.id, employee.id, action, access, userAgent);
  return json(200, {
    message: action === "provision"
      ? "Akun portal berhasil diaktifkan."
      : action === "reset_password"
        ? "Kata sandi sementara berhasil dibuat."
        : action === "disable"
          ? "Login portal berhasil dinonaktifkan."
          : "Login portal berhasil diaktifkan kembali.",
    access,
    ...(temporaryPassword ? { temporaryPassword } : {}),
  });
}

export async function handleEmployeeAccess(context: EmployeeAccessContext): Promise<EmployeeAccessResponse> {
  try {
    return await processEmployeeAccess(context);
  } catch (error) {
    console.error("[employee-access] Unexpected server error", error);
    return json(500, {
      error: "Layanan autentikasi mengalami gangguan saat memeriksa akun. Silakan coba kembali.",
      code: "EMPLOYEE_ACCESS_UNEXPECTED",
    });
  }
}
