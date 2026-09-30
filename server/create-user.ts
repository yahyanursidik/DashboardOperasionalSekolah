import { createClient } from "@supabase/supabase-js";

export interface CreateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
  roleId?: string;
  unitId?: string | null;
}

interface CreateUserContext {
  authorization?: string | null;
  body?: CreateUserRequest | null;
  supabaseUrl?: string;
  serviceRoleKey?: string;
}

export interface CreateUserResponse {
  status: number;
  body: Record<string, unknown>;
}

// Mirrors the `settings` entry in src/lib/permissions: only these roles manage system accounts.
const accountManagerRoles = new Set(["super_admin", "ketua_yayasan"]);

function json(status: number, body: Record<string, unknown>): CreateUserResponse {
  return { status, body };
}

function readRoleName(value: unknown) {
  if (Array.isArray(value)) return String(value[0]?.name || "");
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: string }).name || "");
  return "";
}

async function processCreateUser(context: CreateUserContext): Promise<CreateUserResponse> {
  const { authorization, body, supabaseUrl, serviceRoleKey } = context;
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "Konfigurasi layanan autentikasi belum lengkap." });

  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Sesi admin tidak ditemukan. Silakan masuk kembali." });

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password || "";
  const fullName = body?.fullName?.trim();
  const roleId = body?.roleId?.trim();
  const unitId = body?.unitId?.trim() || null;
  if (!email || !password || !fullName || !roleId) return json(400, { error: "Email, kata sandi, nama, dan peran wajib diisi." });
  if (password.length < 8) return json(400, { error: "Kata sandi minimal 8 karakter." });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: actorData, error: actorError } = await admin.auth.getUser(token);
  if (actorError || !actorData.user) return json(401, { error: "Sesi admin sudah tidak berlaku. Silakan masuk kembali." });

  const [{ data: actorRoles, error: actorRoleError }, { data: targetRole, error: targetRoleError }] = await Promise.all([
    admin.from("user_roles").select("roles(name)").eq("user_id", actorData.user.id),
    admin.from("roles").select("id, name").eq("id", roleId).maybeSingle(),
  ]);
  if (actorRoleError) return json(500, { error: "Peran pengguna tidak dapat diperiksa." });
  const actorRoleNames = new Set((actorRoles || []).map((row) => readRoleName((row as { roles: unknown }).roles)));
  if (![...actorRoleNames].some((role) => accountManagerRoles.has(role))) {
    return json(403, { error: "Anda tidak memiliki izin untuk membuat akun sistem." });
  }
  if (targetRoleError || !targetRole) return json(400, { error: "Peran yang dipilih tidak ditemukan." });
  if (targetRole.name === "super_admin" && !actorRoleNames.has("super_admin")) {
    return json(403, { error: "Hanya Super Admin yang dapat membuat akun Super Admin." });
  }

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (userError || !userData.user) return json(400, { error: userError?.message || "Akun gagal dibuat." });

  const userId = userData.user.id;
  await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
  const { error: roleError } = await admin.from("user_roles").insert({ user_id: userId, role_id: roleId, unit_id: unitId });
  if (roleError) {
    // Do not leave an account without a role behind.
    await admin.auth.admin.deleteUser(userId);
    return json(400, { error: `Peran gagal disimpan: ${roleError.message}` });
  }

  return json(200, { message: "Akun berhasil dibuat.", user: { id: userId, email } });
}

export async function handleCreateUser(context: CreateUserContext): Promise<CreateUserResponse> {
  try {
    return await processCreateUser(context);
  } catch (error) {
    console.error("[create-user] Unexpected server error", error);
    return json(500, { error: "Layanan pembuatan akun mengalami gangguan. Silakan coba kembali." });
  }
}
