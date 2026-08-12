import { supabaseClient } from "./client";

const LEGACY_BUCKET_NAME = "school-documents";

interface StorageApiResponse {
  uploadUrl?: string;
  downloadUrl?: string;
  storedPath?: string;
  error?: string;
}

function storageEndpoint() {
  return import.meta.env.VITE_STORAGE_API_URL?.trim() || "/api/storage";
}

async function callStorageApi(body: Record<string, unknown>) {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi pengguna tidak ditemukan. Silakan masuk kembali.");

  const response = await fetch(storageEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as StorageApiResponse;
  if (!response.ok) throw new Error(payload.error || "Layanan penyimpanan tidak merespons dengan benar.");
  return payload;
}

export const isContaboStoragePath = (value?: string | null) => String(value || "").startsWith("s3://");

export const uploadDocument = async (file: File, folder: string) => {
  const signed = await callStorageApi({
    action: "create_upload",
    folder,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
  });
  if (!signed.uploadUrl || !signed.storedPath) throw new Error("URL unggah tidak diterima dari server.");

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error(`Contabo menolak unggahan (${uploadResponse.status}).`);

  return {
    filePath: signed.storedPath,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
};

export const getDocumentSignedUrl = async (filePath: string, expiresIn = 60) => {
  if (!filePath) throw new Error("Referensi file kosong.");
  if (/^https?:\/\//i.test(filePath)) return filePath;

  if (isContaboStoragePath(filePath)) {
    const signed = await callStorageApi({ action: "create_download", storedPath: filePath, expiresIn });
    if (!signed.downloadUrl) throw new Error("URL unduh tidak diterima dari server.");
    return signed.downloadUrl;
  }

  const { data, error } = await supabaseClient.storage
    .from(LEGACY_BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};
