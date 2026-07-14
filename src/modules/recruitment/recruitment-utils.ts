export const recruitmentStatuses = [
  { id: "berkas_masuk", label: "Berkas Masuk", shortLabel: "Berkas", className: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "seleksi_berkas", label: "Seleksi Berkas", shortLabel: "Seleksi", className: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "ujian_tulis", label: "Ujian Tulis & Praktik", shortLabel: "Ujian", className: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "wawancara", label: "Wawancara", shortLabel: "Wawancara", className: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "lulus", label: "Lulus / Diterima", shortLabel: "Lulus", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "ditolak", label: "Ditolak / Gagal", shortLabel: "Ditolak", className: "bg-red-100 text-red-700 border-red-200" },
];

export const vacancyStatuses: Record<string, { label: string; className: string }> = {
  open: { label: "Dibuka", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" },
  closed: { label: "Ditutup", className: "bg-red-100 text-red-700 border-red-200" },
};

export const recruitmentPositions = [
  { value: "kepala_sekolah", label: "Kepala Sekolah / Pimpinan" },
  { value: "wakasek_umum", label: "Wakil Kepala Sekolah (Umum)" },
  { value: "wakasek_kurikulum", label: "Wakil Kepala Sekolah Bidang Kurikulum" },
  { value: "wakasek_kesiswaan", label: "Wakil Kepala Sekolah Bidang Kesiswaan" },
  { value: "kepala_unit", label: "Kepala Unit" },
  { value: "guru", label: "Guru / Tenaga Pendidik" },
  { value: "guru_quran", label: "Guru Al-Quran" },
  { value: "school_center", label: "School Center" },
  { value: "bendahara", label: "Bendahara / Keuangan" },
  { value: "penanggung_jawab", label: "Penanggung Jawab" },
  { value: "bk", label: "Bimbingan Konseling" },
  { value: "pustakawan", label: "Pustakawan" },
  { value: "laboran", label: "Laboran" },
  { value: "tu", label: "Staff Tata Usaha / Administrasi" },
  { value: "sarpras", label: "Sarana Prasarana" },
  { value: "satpam", label: "Security / Keamanan" },
  { value: "cleaning_service", label: "Cleaning Service" },
  { value: "lainnya", label: "Posisi Lainnya" },
];

export function formatRecruitmentStatus(status?: string | null) {
  return recruitmentStatuses.find((item) => item.id === status)?.label ?? status ?? "-";
}

export function getRecruitmentStatusConfig(status?: string | null) {
  return recruitmentStatuses.find((item) => item.id === status) ?? recruitmentStatuses[0];
}

export function formatVacancyStatus(status?: string | null) {
  return vacancyStatuses[status || "draft"]?.label ?? status ?? "-";
}

export function getVacancyStatusConfig(status?: string | null) {
  return vacancyStatuses[status || "draft"] ?? vacancyStatuses.draft;
}

export function formatPosition(position?: string | null) {
  return recruitmentPositions.find((item) => item.value === position)?.label ?? (position || "-").replace(/_/g, " ");
}

export function formatRecruitmentDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${dateStr}T00:00:00`));
  } catch {
    return dateStr;
  }
}

export function getDaysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function calculateAverageScore(applicant: any) {
  const scores = [applicant?.score_diniyah, applicant?.score_pedagogik, applicant?.score_wawancara].filter((score) => typeof score === "number");
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function getApplicantQuality(applicant: any) {
  let score = 0;
  if (applicant?.full_name) score += 15;
  if (applicant?.phone) score += 15;
  if (applicant?.email) score += 15;
  if (applicant?.last_education) score += 15;
  if (applicant?.address) score += 10;
  if (applicant?.cv_url) score += 10;
  if (calculateAverageScore(applicant) !== null) score += 20;
  return score;
}

export function getApplicantNextAction(applicant: any) {
  if (applicant?.employee_id) return "Sudah menjadi pegawai";
  if (applicant?.status === "lulus") return "Konversi ke pegawai";
  if (applicant?.status === "ditolak") return applicant?.rejection_notes ? "Arsip penolakan lengkap" : "Lengkapi alasan penolakan";
  if (applicant?.status === "wawancara") return "Input nilai wawancara";
  if (applicant?.status === "ujian_tulis") return "Pantau hasil CBT/praktik";
  if (applicant?.status === "seleksi_berkas") return "Validasi berkas dan CV";
  return "Mulai seleksi berkas";
}
