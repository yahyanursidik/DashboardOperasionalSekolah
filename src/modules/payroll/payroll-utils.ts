export const rupiah = (value: unknown) => `Rp${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;

export const periodLabel = (periodMonth?: string | null) =>
  periodMonth ? new Date(`${periodMonth}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "-";

export const runStatusLabels: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draf", tone: "bg-slate-100 text-slate-700" },
  approved: { label: "Disetujui", tone: "bg-blue-100 text-blue-800" },
  paid: { label: "Dibayar", tone: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Dibatalkan", tone: "bg-rose-100 text-rose-800" },
};

export const calcLabels: Record<string, string> = {
  fixed: "Tetap per bulan",
  per_attendance_day: "Per hari hadir",
  per_late_minute: "Per menit terlambat",
  per_absent_day: "Per hari tidak hadir",
  per_overtime_hour: "Per jam lembur (kompensasi dibayar)",
  percent_of_base: "Persen dari gaji pokok",
};
