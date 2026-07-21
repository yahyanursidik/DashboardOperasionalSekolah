/* eslint-disable @typescript-eslint/no-explicit-any */
export const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const workWeekDays = daysOfWeek.slice(0, 5);

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

export function formatScheduleEntryType(schedule: any) {
  const labels: Record<string, string> = {
    subject: "Mata Pelajaran",
    unit_activity: "Kegiatan Unit",
    preschool_activity: "Kegiatan Preschool",
    worship: "Ibadah Bersama",
    assembly: "Assembly / Apel",
    break: "Istirahat",
    meal: "Makan Bersama",
    play: "Bermain / Kegiatan Luar",
    other: "Kegiatan Pembelajaran",
  };
  if (isUnitLearningSchedule(schedule)) return labels[schedule?.schedule_kind || "unit_activity"];
  if (schedule?.schedule_type === "mengajar" && schedule?.schedule_kind) return labels[schedule.schedule_kind] || "Pembelajaran";
  return formatScheduleType(schedule?.schedule_type);
}

export function isUnitLearningSchedule(schedule: any) {
  return schedule?.schedule_type === "mengajar"
    && (schedule?.schedule_scope === "unit" || (!schedule?.class_id && Boolean(schedule?.unit_id)));
}

export function formatTime(time?: string | null) {
  return time ? time.slice(0, 5) : "--:--";
}

export function getScheduleSubjectName(schedule: any) {
  return schedule?.activity_name || schedule?.subjects?.name || schedule?.subject || "Mata Pelajaran";
}

export type ScheduleVisual = {
  key: string;
  accent: string;
  border: string;
  background: string;
  softBackground: string;
  text: string;
};

const lessonVisuals: ScheduleVisual[] = [
  { key: "blue", accent: "bg-blue-500", border: "border-blue-200", background: "bg-blue-50", softBackground: "bg-blue-100", text: "text-blue-800" },
  { key: "emerald", accent: "bg-emerald-500", border: "border-emerald-200", background: "bg-emerald-50", softBackground: "bg-emerald-100", text: "text-emerald-800" },
  { key: "amber", accent: "bg-amber-500", border: "border-amber-200", background: "bg-amber-50", softBackground: "bg-amber-100", text: "text-amber-900" },
  { key: "rose", accent: "bg-rose-500", border: "border-rose-200", background: "bg-rose-50", softBackground: "bg-rose-100", text: "text-rose-800" },
  { key: "cyan", accent: "bg-cyan-500", border: "border-cyan-200", background: "bg-cyan-50", softBackground: "bg-cyan-100", text: "text-cyan-900" },
  { key: "violet", accent: "bg-violet-500", border: "border-violet-200", background: "bg-violet-50", softBackground: "bg-violet-100", text: "text-violet-800" },
  { key: "lime", accent: "bg-lime-500", border: "border-lime-200", background: "bg-lime-50", softBackground: "bg-lime-100", text: "text-lime-900" },
  { key: "orange", accent: "bg-orange-500", border: "border-orange-200", background: "bg-orange-50", softBackground: "bg-orange-100", text: "text-orange-900" },
  { key: "sky", accent: "bg-sky-500", border: "border-sky-200", background: "bg-sky-50", softBackground: "bg-sky-100", text: "text-sky-900" },
  { key: "fuchsia", accent: "bg-fuchsia-500", border: "border-fuchsia-200", background: "bg-fuchsia-50", softBackground: "bg-fuchsia-100", text: "text-fuchsia-900" },
];

const workVisuals: Record<string, ScheduleVisual> = {
  piket: { key: "amber", accent: "bg-amber-500", border: "border-amber-200", background: "bg-amber-50", softBackground: "bg-amber-100", text: "text-amber-900" },
  shift_keamanan: { key: "slate", accent: "bg-slate-500", border: "border-slate-300", background: "bg-slate-50", softBackground: "bg-slate-200", text: "text-slate-800" },
  shift_kebersihan: { key: "cyan", accent: "bg-cyan-500", border: "border-cyan-200", background: "bg-cyan-50", softBackground: "bg-cyan-100", text: "text-cyan-900" },
  standby: { key: "violet", accent: "bg-violet-500", border: "border-violet-200", background: "bg-violet-50", softBackground: "bg-violet-100", text: "text-violet-800" },
};

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getSemanticLessonVisualIndex(name: string) {
  const rules: Array<[RegExp, number]> = [
    [/matematika|mathematics/, 0],
    [/agama|diniyah|fikih|fiqih|akidah|aqidah|sirah/, 1],
    [/bahasa indonesia/, 3],
    [/ipas|ipa|sains|science/, 2],
    [/bahasa inggris|english/, 5],
    [/bahasa sunda|muatan lokal/, 7],
    [/al.?qur|tahfidz|tahsin|quran/, 6],
    [/bahasa arab|arabic/, 8],
    [/pjok|olahraga|penjaskes/, 7],
    [/seni|prakarya|kesenian/, 9],
    [/informatika|komputer|teknologi/, 4],
    [/pancasila|kewarganegaraan|pkn/, 8],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1];
}

export function getScheduleVisual(schedule: any, mode: "lesson" | "work" = "lesson") {
  if (mode === "work" || schedule?.schedule_type !== "mengajar") {
    return workVisuals[schedule?.schedule_type] || {
      key: "emerald",
      accent: "bg-emerald-500",
      border: "border-emerald-200",
      background: "bg-emerald-50",
      softBackground: "bg-emerald-100",
      text: "text-emerald-800",
    };
  }

  const subjectName = String(getScheduleSubjectName(schedule)).trim().toLowerCase();
  const semanticIndex = getSemanticLessonVisualIndex(subjectName);
  if (semanticIndex !== undefined) return lessonVisuals[semanticIndex];

  const identity = subjectName || String(schedule?.subject_id || schedule?.subjects?.id || "mata-pelajaran");
  return lessonVisuals[stableHash(identity) % lessonVisuals.length];
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
  const conflicts: Array<{ type: "employee" | "class" | "unit"; first: any; second: any }> = [];

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

      if (
        first.schedule_type === "mengajar" &&
        second.schedule_type === "mengajar" &&
        first.unit_id &&
        first.unit_id === second.unit_id &&
        (first.schedule_scope === "unit" || second.schedule_scope === "unit")
      ) {
        conflicts.push({ type: "unit", first, second });
      }
    });
  });

  return conflicts;
}
