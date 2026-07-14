export const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const scheduleTypes = [
  { value: "mengajar", label: "Mengajar (Guru)" },
  { value: "piket", label: "Piket Harian" },
  { value: "shift_keamanan", label: "Shift Keamanan (Satpam)" },
  { value: "shift_kebersihan", label: "Shift Kebersihan (CS)" },
  { value: "standby", label: "Standby / Umum" },
];

export const dayMap: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  0: "Minggu",
};

export function formatScheduleType(type?: string) {
  return scheduleTypes.find((item) => item.value === type)?.label ?? (type || "-").replace(/_/g, " ");
}

export function formatTime(time?: string | null) {
  return time ? time.slice(0, 5) : "--:--";
}

export function getScheduleSubjectName(schedule: any) {
  return schedule?.subjects?.name || schedule?.subject || "Mata Pelajaran";
}

function toMinutes(time?: string | null) {
  if (!time) return 0;
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isValidTimeRange(startTime: string, endTime: string, allowOvernight = false) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return allowOvernight ? start !== end : start < end;
}

export function hasTimeOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null
) {
  const aStart = toMinutes(startA);
  let aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  let bEnd = toMinutes(endB);

  if (aEnd <= aStart) aEnd += 24 * 60;
  if (bEnd <= bStart) bEnd += 24 * 60;

  return aStart < bEnd && bStart < aEnd;
}

export function findScheduleConflicts(schedules: any[]) {
  const conflicts: Array<{ type: "employee" | "class"; first: any; second: any }> = [];

  schedules.forEach((first, index) => {
    schedules.slice(index + 1).forEach((second) => {
      if (first.day_of_week !== second.day_of_week) return;
      if (!hasTimeOverlap(first.start_time, first.end_time, second.start_time, second.end_time)) return;

      if (first.employee_id && first.employee_id === second.employee_id) {
        conflicts.push({ type: "employee", first, second });
      }

      if (
        first.schedule_type === "mengajar" &&
        second.schedule_type === "mengajar" &&
        first.class_id &&
        first.class_id === second.class_id
      ) {
        conflicts.push({ type: "class", first, second });
      }
    });
  });

  return conflicts;
}
