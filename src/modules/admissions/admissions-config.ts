export const admissionStatuses = [
  "draft",
  "submitted",
  "documents_review",
  "verified",
  "assessment_scheduled",
  "assessed",
  "accepted",
  "waitlisted",
  "rejected",
  "enrolled",
  "withdrawn",
] as const;

export type AdmissionStatus = (typeof admissionStatuses)[number];

export const admissionStatusMeta: Record<AdmissionStatus, { label: string; tone: string; description: string }> = {
  draft: { label: "Draf", tone: "bg-slate-100 text-slate-700", description: "Formulir belum dikirim." },
  submitted: { label: "Menunggu pemeriksaan", tone: "bg-amber-100 text-amber-800", description: "Pendaftaran sudah dikirim ke panitia." },
  documents_review: { label: "Pemeriksaan berkas", tone: "bg-sky-100 text-sky-800", description: "Berkas sedang diperiksa." },
  verified: { label: "Berkas terverifikasi", tone: "bg-blue-100 text-blue-800", description: "Berkas lengkap dan valid." },
  assessment_scheduled: { label: "Seleksi dijadwalkan", tone: "bg-violet-100 text-violet-800", description: "Jadwal observasi atau tes sudah tersedia." },
  assessed: { label: "Seleksi selesai", tone: "bg-cyan-100 text-cyan-800", description: "Hasil seleksi siap diputuskan." },
  accepted: { label: "Diterima", tone: "bg-emerald-100 text-emerald-800", description: "Calon murid dinyatakan diterima." },
  waitlisted: { label: "Daftar tunggu", tone: "bg-orange-100 text-orange-800", description: "Menunggu ketersediaan kuota." },
  rejected: { label: "Belum diterima", tone: "bg-rose-100 text-rose-800", description: "Pendaftaran belum dapat diterima." },
  enrolled: { label: "Menjadi siswa", tone: "bg-green-100 text-green-800", description: "Data telah dikonversi menjadi siswa aktif." },
  withdrawn: { label: "Mengundurkan diri", tone: "bg-slate-200 text-slate-700", description: "Pendaftaran dihentikan atas permintaan keluarga." },
};

export const admissionStatusOrder: AdmissionStatus[] = [
  "draft", "submitted", "documents_review", "verified", "assessment_scheduled", "assessed", "accepted", "enrolled",
];

export const admissionDocumentTypes = [
  { value: "family_card", label: "Kartu Keluarga", required: true },
  { value: "birth_certificate", label: "Akta Kelahiran", required: true },
  { value: "photo", label: "Pas Foto", required: true },
  { value: "previous_report", label: "Rapor / laporan perkembangan terakhir", required: false },
  { value: "transfer_letter", label: "Surat pindah (khusus siswa pindahan)", required: false },
] as const;

export const legacyToAdmissionStatus = (legacy?: string | null): AdmissionStatus => {
  const map: Record<string, AdmissionStatus> = {
    Draf: "draft",
    "Menunggu Verifikasi": "submitted",
    "Berkas Lengkap": "documents_review",
    "Verifikasi Valid": "verified",
    "Jadwal Seleksi": "assessment_scheduled",
    "Selesai Seleksi": "assessed",
    "Lulus Tes": "accepted",
    "Daftar Tunggu": "waitlisted",
    Ditolak: "rejected",
    "Menjadi Siswa": "enrolled",
    "Mengundurkan Diri": "withdrawn",
  };
  return map[legacy || ""] || "submitted";
};

export const getAdmissionStatus = (row: { workflow_status?: string | null; status?: string | null }): AdmissionStatus => {
  const canonical = row.workflow_status as AdmissionStatus | undefined;
  return canonical && admissionStatuses.includes(canonical) ? canonical : legacyToAdmissionStatus(row.status);
};

export const formatAdmissionDate = (value?: string | null, includeTime = false) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", includeTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }
    : { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
};
