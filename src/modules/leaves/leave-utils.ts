export const leaveTypes = [
  { value: "sakit", label: "Sakit" },
  { value: "izin", label: "Izin Pribadi" },
  { value: "cuti_tahunan", label: "Cuti Tahunan" },
  { value: "cuti_melahirkan", label: "Cuti Melahirkan" },
  { value: "dinas_luar", label: "Dinas Luar" },
  { value: "lainnya", label: "Lainnya" },
];

export const leaveStatusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Menunggu",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Disetujui",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const legacyLeaveTypeLabels: Record<string, string> = {
  sick: "Sakit",
  annual: "Cuti Tahunan",
  maternity: "Cuti Melahirkan",
  other: "Izin Pribadi",
};

export function formatLeaveType(type?: string | null) {
  return leaveTypes.find((item) => item.value === type)?.label ?? legacyLeaveTypeLabels[type || ""] ?? (type || "-").replace(/_/g, " ");
}

export function formatLeaveStatus(status?: string | null) {
  return leaveStatusConfig[status || "pending"]?.label ?? status ?? "-";
}

export function formatLeaveDate(dateStr?: string | null, options: Intl.DateTimeFormatOptions = {}) {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...options,
    }).format(new Date(`${dateStr}`));
  } catch {
    return dateStr;
  }
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLeaveDurationDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function getDatesInRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return [];
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return dates;

  while (cursor <= end) {
    dates.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function isLeaveActiveOnDate(leave: any, date = toDateInputValue(new Date())) {
  return leave?.start_date <= date && leave?.end_date >= date;
}

export function requiresStrongProof(type?: string | null, durationDays = 0) {
  return type === "cuti_melahirkan" || type === "dinas_luar" || (type === "sakit" && durationDays > 1);
}
