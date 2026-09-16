const permittedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const permittedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

export const admissionUploadError = (file: File, maximumBytes: number) => {
  if (!file.name.trim()) return "Nama berkas tidak terbaca. Pilih berkas lain.";
  if (file.size <= 0) return "Berkas kosong tidak dapat diunggah.";
  if (file.size > maximumBytes) return `Ukuran berkas maksimal ${Math.round(maximumBytes / 1024 / 1024)} MB.`;
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  if (!extension || !permittedExtensions.has(extension)) return "Gunakan berkas PDF, JPG, atau PNG.";
  if (file.type && !permittedMimeTypes.has(file.type)) return "Gunakan berkas PDF, JPG, atau PNG.";
  return null;
};

export const ADMISSION_FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
