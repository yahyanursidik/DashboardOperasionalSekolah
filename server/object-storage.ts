import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ObjectStorageAction = "create_upload" | "create_download";

export interface ObjectStorageRequest {
  action?: ObjectStorageAction;
  folder?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  storedPath?: string;
}

interface ObjectStorageContext {
  authorization?: string | null;
  body?: ObjectStorageRequest | null;
  supabaseUrl?: string;
  serviceRoleKey?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  maxFileSizeBytes?: string | number;
}

export interface ObjectStorageResponse {
  status: number;
  body: Record<string, unknown>;
}

const allowedRoots = new Set([
  "admissions",
  "curriculum",
  "digital-library",
  "documents",
  "employees",
  "finance",
  "leaves",
  "mail",
  "onboarding",
  "paud",
  "reports",
  "settings",
  "students",
]);

const allowedExtensions = new Set([
  "avif", "bmp", "csv", "doc", "docx", "gif", "heic", "heif", "jpeg", "jpg",
  "m4a", "mp3", "mp4", "ods", "odt", "pdf", "png", "ppt", "pptx", "txt",
  "webp", "xls", "xlsx", "zip",
]);

const admissionsStaffRoles = new Set([
  "super_admin", "ketua_yayasan", "kepala_tu", "admin_tu", "admin_sekolah", "admin_unit",
  "admin_spmb", "bendahara", "kepsek", "kepala_unit",
]);

function json(status: number, body: Record<string, unknown>): ObjectStorageResponse {
  return { status, body };
}

function normalizeEndpoint(value?: string) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeFolder(value?: string) {
  const folder = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!folder || folder.includes("..") || !/^[a-zA-Z0-9/_-]+$/.test(folder)) return null;
  return folder;
}

function sanitizeFileName(value?: string) {
  const original = String(value || "file").trim();
  const extension = original.includes(".") ? original.split(".").pop()?.toLowerCase() || "" : "";
  if (!extension || !allowedExtensions.has(extension)) return null;
  const base = original.slice(0, -(extension.length + 1))
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
  return `${base}.${extension}`;
}

function objectKeyFromStoredPath(value?: string, bucket?: string) {
  const storedPath = String(value || "").trim();
  const prefix = `s3://${bucket}/`;
  if (!storedPath.startsWith(prefix)) return null;
  const key = storedPath.slice(prefix.length).replace(/^\/+/, "");
  if (!key || key.includes("..")) return null;
  return key;
}

function readRoleName(value: unknown) {
  if (Array.isArray(value)) return String(value[0]?.name || "");
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: string }).name || "");
  return "";
}

async function getActorAccess(admin: SupabaseClient, userId: string) {
  const [{ data: roleRows }, { data: employee }] = await Promise.all([
    admin.from("user_roles").select("roles(name)").eq("user_id", userId),
    admin.from("employees").select("id, status").eq("user_id", userId).maybeSingle(),
  ]);
  const roles = new Set((roleRows || []).map((row: { roles?: unknown }) => readRoleName(row.roles)).filter(Boolean));
  return { roles, isActiveEmployee: employee?.status === "active" };
}

async function canAccessKey(admin: SupabaseClient, userId: string, key: string, operation: "upload" | "download") {
  const root = key.split("/")[0];
  if (!allowedRoots.has(root)) return false;

  // Object keys contain generated UUIDs and are only disclosed by database rows
  // protected by RLS. Signed downloads may therefore serve any authenticated
  // portal user, except admission files which require an explicit ownership check.
  if (operation === "download" && root !== "admissions") return true;

  const actor = await getActorAccess(admin, userId);
  if (root === "finance") {
    if (actor.roles.size > 0 || actor.isActiveEmployee) return true;
    const studentId = key.split("/")[1];
    if (!studentId) return false;
    const { data: parent } = await admin.from("parents").select("id").eq("user_id", userId).maybeSingle();
    if (!parent?.id) return false;
    const { data: link } = await admin
      .from("student_parent_links")
      .select("student_id")
      .eq("student_id", studentId)
      .eq("parent_id", parent.id)
      .maybeSingle();
    return Boolean(link);
  }
  if (root !== "admissions") return actor.roles.size > 0 || actor.isActiveEmployee;

  const applicantId = key.split("/")[1];
  if (!applicantId) return false;
  const { data: applicant } = await admin
    .from("admissions_applicants")
    .select("user_id")
    .eq("id", applicantId)
    .maybeSingle();
  const ownsApplication = applicant?.user_id === userId;
  const canManageAdmissions = [...actor.roles].some((role) => admissionsStaffRoles.has(role));
  return ownsApplication || canManageAdmissions;
}

function createStorageClient(context: ObjectStorageContext) {
  return new S3Client({
    endpoint: normalizeEndpoint(context.endpoint),
    region: context.region || "default",
    forcePathStyle: true,
    credentials: {
      accessKeyId: String(context.accessKeyId),
      secretAccessKey: String(context.secretAccessKey),
    },
  });
}

async function processObjectStorage(context: ObjectStorageContext): Promise<ObjectStorageResponse> {
  const endpoint = normalizeEndpoint(context.endpoint);
  const bucket = String(context.bucket || "").trim();
  if (!context.supabaseUrl || !context.serviceRoleKey) return json(500, { error: "Konfigurasi autentikasi server belum lengkap." });
  if (!endpoint || !bucket || !context.accessKeyId || !context.secretAccessKey) return json(500, { error: "Konfigurasi Contabo Object Storage belum lengkap." });

  const token = context.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." });

  const admin = createClient(context.supabaseUrl, context.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: actorData, error: actorError } = await admin.auth.getUser(token);
  if (actorError || !actorData.user) return json(401, { error: "Sesi pengguna sudah tidak berlaku. Silakan masuk kembali." });

  const action = context.body?.action;
  const storage = createStorageClient(context);

  if (action === "create_upload") {
    const folder = normalizeFolder(context.body?.folder);
    const safeFileName = sanitizeFileName(context.body?.fileName);
    const fileSize = Number(context.body?.fileSize || 0);
    const maxFileSize = Number(context.maxFileSizeBytes || 50 * 1024 * 1024);
    if (!folder || !safeFileName) return json(400, { error: "Nama folder atau jenis file tidak diizinkan." });
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxFileSize) return json(400, { error: `Ukuran file harus antara 1 byte dan ${Math.floor(maxFileSize / 1024 / 1024)} MB.` });

    const root = folder.split("/")[0];
    if (!allowedRoots.has(root)) return json(403, { error: "Lokasi penyimpanan tidak diizinkan." });
    const key = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}-${safeFileName}`;
    if (!(await canAccessKey(admin, actorData.user.id, key, "upload"))) return json(403, { error: "Anda tidak memiliki akses untuk mengunggah ke lokasi ini." });

    const contentType = String(context.body?.contentType || "application/octet-stream").slice(0, 150);
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, CacheControl: "private, max-age=3600" });
    const uploadUrl = await getSignedUrl(storage, command, { expiresIn: 300 });
    return json(200, { uploadUrl, storedPath: `s3://${bucket}/${key}`, objectKey: key, expiresIn: 300 });
  }

  if (action === "create_download") {
    const key = objectKeyFromStoredPath(context.body?.storedPath, bucket);
    if (!key) return json(400, { error: "Referensi file Contabo tidak valid." });
    if (!(await canAccessKey(admin, actorData.user.id, key, "download"))) return json(403, { error: "Anda tidak memiliki akses untuk membuka file ini." });
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const downloadUrl = await getSignedUrl(storage, command, { expiresIn: 300 });
    return json(200, { downloadUrl, expiresIn: 300 });
  }

  return json(400, { error: "Perintah penyimpanan tidak valid." });
}

export async function handleObjectStorage(context: ObjectStorageContext): Promise<ObjectStorageResponse> {
  try {
    return await processObjectStorage(context);
  } catch (error) {
    console.error("[object-storage] Unexpected server error", error);
    return json(500, { error: "Layanan penyimpanan sedang mengalami gangguan. Silakan coba kembali." });
  }
}
