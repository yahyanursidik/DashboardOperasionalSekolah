const permittedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const permittedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);
const genericMobileMimeTypes = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/x-pdf",
  "application/force-download",
]);

export const ADMISSION_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ADMISSION_PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

const fileExtension = (file: File) => file.name.split(".").pop()?.toLocaleLowerCase() || "";

// Android file pickers sometimes expose a valid PDF as application/octet-stream
// or application/x-pdf. The extension remains the reliable browser-side signal;
// we normalize the content type so the signed S3 request and PUT request match.
export const admissionUploadContentType = (file: File) => {
  const extension = fileExtension(file);
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return file.type || "application/octet-stream";
};

export const admissionUploadError = (file: File, maximumBytes: number) => {
  if (!file.name.trim()) return "Nama berkas tidak terbaca. Pilih berkas lain.";
  if (file.size <= 0) return "Berkas kosong tidak dapat diunggah.";
  if (file.size > maximumBytes) return `Ukuran berkas maksimal ${Math.round(maximumBytes / 1024 / 1024)} MB.`;
  const extension = fileExtension(file);
  if (!extension || !permittedExtensions.has(extension)) return "Gunakan berkas PDF, JPG, atau PNG.";
  const mimeType = file.type.toLocaleLowerCase();
  if (mimeType && !permittedMimeTypes.has(mimeType) && !genericMobileMimeTypes.has(mimeType)) return "Gunakan berkas PDF, JPG, atau PNG.";
  return null;
};

export const ADMISSION_FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
