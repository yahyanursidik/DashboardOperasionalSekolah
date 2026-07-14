export const substituteStatusConfig: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: "Dijadwalkan",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  completed: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function formatSubstituteStatus(status?: string | null) {
  return substituteStatusConfig[status || "scheduled"]?.label ?? status ?? "-";
}

export function formatAssignmentDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${dateStr}T00:00:00`));
  } catch {
    return dateStr;
  }
}

export function formatShortTime(time?: string | null) {
  return time ? time.slice(0, 5) : "--:--";
}

function toMinutes(time?: string | null) {
  if (!time) return 0;
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isValidAssignmentTime(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return false;
  return toMinutes(startTime) < toMinutes(endTime);
}

export function hasAssignmentOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null
) {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

export function getAssignmentDurationMinutes(startTime?: string | null, endTime?: string | null) {
  if (!isValidAssignmentTime(startTime, endTime)) return 0;
  return toMinutes(endTime) - toMinutes(startTime);
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
