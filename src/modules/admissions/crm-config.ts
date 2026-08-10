export const leadStages = [
  "new",
  "contacted",
  "qualified",
  "visit_scheduled",
  "visited",
  "nurturing",
  "ready_to_apply",
  "converted",
  "lost",
] as const;

export type LeadStage = (typeof leadStages)[number];

export const leadStageMeta: Record<LeadStage, { label: string; shortLabel: string; tone: string; description: string }> = {
  new: { label: "Prospek baru", shortLabel: "Baru", tone: "bg-sky-100 text-sky-800", description: "Belum ditindaklanjuti." },
  contacted: { label: "Sudah dihubungi", shortLabel: "Dihubungi", tone: "bg-blue-100 text-blue-800", description: "Kontak awal sudah dilakukan." },
  qualified: { label: "Minat terkonfirmasi", shortLabel: "Terkualifikasi", tone: "bg-indigo-100 text-indigo-800", description: "Kebutuhan dan tujuan keluarga sudah jelas." },
  visit_scheduled: { label: "Kunjungan dijadwalkan", shortLabel: "Jadwal kunjungan", tone: "bg-violet-100 text-violet-800", description: "Survei atau pertemuan sudah dijadwalkan." },
  visited: { label: "Sudah berkunjung", shortLabel: "Berkunjung", tone: "bg-purple-100 text-purple-800", description: "Keluarga sudah melihat sekolah atau bertemu panitia." },
  nurturing: { label: "Pendampingan lanjutan", shortLabel: "Pendampingan", tone: "bg-amber-100 text-amber-800", description: "Belum mendaftar dan tetap perlu dirawat komunikasinya." },
  ready_to_apply: { label: "Siap mendaftar", shortLabel: "Siap daftar", tone: "bg-emerald-100 text-emerald-800", description: "Siap dipindahkan ke pendaftaran resmi." },
  converted: { label: "Menjadi pendaftar", shortLabel: "Pendaftar", tone: "bg-green-100 text-green-800", description: "Sudah masuk alur SPMB resmi." },
  lost: { label: "Tidak dilanjutkan", shortLabel: "Tidak lanjut", tone: "bg-slate-200 text-slate-700", description: "Prospek berhenti atau memilih opsi lain." },
};

export const leadSources = [
  { value: "walk_in", label: "Datang / survei langsung" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referral", label: "Kenalan / rekomendasi" },
  { value: "partner", label: "Lembaga / mitra" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Media sosial" },
  { value: "event", label: "Acara / open house" },
  { value: "other", label: "Sumber lainnya" },
] as const;

export const leadSourceLabel = (value?: string | null) =>
  leadSources.find((source) => source.value === value)?.label || "Sumber lainnya";

export const activityTypes = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telepon" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Kunjungan sekolah" },
  { value: "survey", label: "Survei langsung" },
  { value: "meeting", label: "Pertemuan" },
  { value: "follow_up", label: "Tindak lanjut" },
  { value: "note", label: "Catatan internal" },
] as const;

export const formatCrmDate = (value?: string | null, includeTime = true) => {
  if (!value) return "Belum dijadwalkan";
  return new Intl.DateTimeFormat("id-ID", includeTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }
    : { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
};

export const toWhatsappNumber = (phone?: string | null) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
};
