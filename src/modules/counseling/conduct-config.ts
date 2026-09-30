export type ConductKind = "violation" | "achievement";
export type ConductStatus = "open" | "followed_up" | "closed";

export const kindLabels: Record<ConductKind, string> = {
  violation: "Pelanggaran",
  achievement: "Prestasi",
};

export const statusLabels: Record<ConductStatus, string> = {
  open: "Perlu tindak lanjut",
  followed_up: "Sudah ditindaklanjuti",
  closed: "Selesai",
};

export const sessionTypeLabels: Record<string, string> = {
  individual: "Konseling individu",
  group: "Konseling kelompok",
  parent_meeting: "Pertemuan orang tua",
  home_visit: "Kunjungan rumah",
  referral: "Rujukan",
};

export const severityTones: Record<string, string> = {
  ringan: "bg-slate-100 text-slate-700",
  sedang: "bg-amber-100 text-amber-800",
  berat: "bg-rose-100 text-rose-800",
};

/**
 * Escalation ladder on net points (violation minus achievement, never below zero).
 * Ordered from the highest threshold down.
 */
export const conductThresholds = [
  { points: 100, level: "Sidang dewan guru", tone: "bg-rose-600 text-white" },
  { points: 75, level: "Peringatan 3 · surat pernyataan orang tua", tone: "bg-rose-100 text-rose-800" },
  { points: 50, level: "Peringatan 2 · pemanggilan orang tua", tone: "bg-orange-100 text-orange-800" },
  { points: 25, level: "Peringatan 1 · pembinaan wali kelas", tone: "bg-amber-100 text-amber-800" },
];

export function netConductPoints(violationPoints: number, achievementPoints: number) {
  return Math.max(0, (Number(violationPoints) || 0) - (Number(achievementPoints) || 0));
}

export function conductLevel(netPoints: number) {
  return conductThresholds.find((threshold) => netPoints >= threshold.points) || null;
}

/** Roles and positions that manage BK (mirrors public.is_counseling_manager()). */
export const COUNSELING_MANAGER_ROLES = ["super_admin", "ketua_yayasan", "kepsek", "wakasek", "admin_sekolah", "admin_unit"] as const;
export const COUNSELING_MANAGER_POSITIONS = ["bk", "kepala_sekolah", "kepala_unit", "wakasek_kesiswaan", "wakasek_umum"];
