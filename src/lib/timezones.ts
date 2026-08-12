export const SCHOOL_TIME_ZONE = "Asia/Jakarta";

export const indonesiaTimeZones = [
  { value: "Asia/Jakarta", label: "WIB - Jakarta (UTC+07:00)" },
  { value: "Asia/Makassar", label: "WITA - Makassar (UTC+08:00)" },
  { value: "Asia/Jayapura", label: "WIT - Jayapura (UTC+09:00)" },
] as const;

const fallbackInternationalTimeZones = [
  "UTC",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
];

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

export function detectBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SCHOOL_TIME_ZONE;
  } catch {
    return SCHOOL_TIME_ZONE;
  }
}

export function isValidTimeZone(value?: string | null) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("id-ID", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function offsetLabel(timeZone: string, date = new Date()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(date).find((item) => item.type === "timeZoneName")?.value;
    return part?.replace("GMT", "UTC") || "";
  } catch {
    return "";
  }
}

export function timeZoneLabel(timeZone?: string | null, date = new Date()) {
  if (!timeZone) return "Belum dipilih";
  const indonesia = indonesiaTimeZones.find((item) => item.value === timeZone);
  if (indonesia) return indonesia.label;
  const location = timeZone === "UTC" ? "UTC" : timeZone.replaceAll("_", " ").replace("/", " - ");
  const offset = offsetLabel(timeZone, date);
  return offset ? `${location} (${offset})` : location;
}

export function getInternationalTimeZoneOptions(currentValue?: string | null) {
  const supported = (Intl as IntlWithSupportedValues).supportedValuesOf?.("timeZone") || fallbackInternationalTimeZones;
  const values = Array.from(new Set([...(currentValue ? [currentValue] : []), "UTC", ...supported]))
    .filter((value) => isValidTimeZone(value) && !indonesiaTimeZones.some((item) => item.value === value));
  return values
    .map((value) => ({ value, label: timeZoneLabel(value) }))
    .sort((first, second) => first.label.localeCompare(second.label, "id-ID"));
}

export function isOnlinePreschoolProgram(row?: Record<string, unknown> | null) {
  if (!row) return false;
  const unit = String(row.unit_name || row.unit || (row.units as { name?: string } | undefined)?.name || "");
  const target = String(row.class_name || (row.desired_classes as { name?: string } | undefined)?.name || "");
  const combined = `${unit} ${target}`.toLowerCase();
  const isPreschool = /(preschool|paud|playgroup|kelompok bermain|\bkb\b|taman kanak|\btk\b)/i.test(combined);
  const isOnline = /(\bhbl\b|home[ -]?based learning|online|daring)/i.test(combined);
  return isPreschool && isOnline;
}

export function formatDateTimeInTimeZone(value?: string | null, timeZone = SCHOOL_TIME_ZONE) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : SCHOOL_TIME_ZONE;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: safeTimeZone,
    timeZoneName: "short",
  }).format(date);
}

export function schoolLocalDateTimeToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  return new Date(`${value}:00+07:00`).toISOString();
}

const weekDayIndexes: Record<string, number> = {
  Senin: 0,
  Selasa: 1,
  Rabu: 2,
  Kamis: 3,
  Jumat: 4,
  Sabtu: 5,
  Minggu: 6,
};

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekday: get("weekday") };
}

const englishDayIndex: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function targetScheduleParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  const weekday = get("weekday");
  return {
    day: weekday ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}` : "Senin",
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function localizeSchoolSchedule<T extends { day_of_week?: string | null; start_time?: string | null; end_time?: string | null }>(
  schedule: T,
  targetTimeZone?: string | null,
) {
  const safeTarget = targetTimeZone && isValidTimeZone(targetTimeZone) ? targetTimeZone : SCHOOL_TIME_ZONE;
  if (safeTarget === SCHOOL_TIME_ZONE || !schedule.day_of_week || !schedule.start_time || !schedule.end_time) return schedule;

  const nowAtSchool = partsInTimeZone(new Date(), SCHOOL_TIME_ZONE);
  const mondayDay = nowAtSchool.day - (englishDayIndex[nowAtSchool.weekday] ?? 0);
  const scheduleDay = weekDayIndexes[schedule.day_of_week] ?? 0;
  const [startHour, startMinute] = schedule.start_time.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = schedule.end_time.slice(0, 5).split(":").map(Number);
  const endDayOffset = (endHour * 60 + endMinute) <= (startHour * 60 + startMinute) ? 1 : 0;
  const start = new Date(Date.UTC(nowAtSchool.year, nowAtSchool.month - 1, mondayDay + scheduleDay, startHour - 7, startMinute));
  const end = new Date(Date.UTC(nowAtSchool.year, nowAtSchool.month - 1, mondayDay + scheduleDay + endDayOffset, endHour - 7, endMinute));
  const localizedStart = targetScheduleParts(start, safeTarget);
  const localizedEnd = targetScheduleParts(end, safeTarget);

  return {
    ...schedule,
    day_of_week: localizedStart.day,
    start_time: localizedStart.time,
    end_time: localizedEnd.time,
    school_day_of_week: schedule.day_of_week,
    school_start_time: schedule.start_time,
    school_end_time: schedule.end_time,
    localized_end_day: localizedEnd.day,
  };
}

export function currentWeekdayInTimeZone(timeZone?: string | null) {
  const safeTimeZone = timeZone && isValidTimeZone(timeZone) ? timeZone : SCHOOL_TIME_ZONE;
  const weekday = new Intl.DateTimeFormat("id-ID", { timeZone: safeTimeZone, weekday: "long" }).format(new Date());
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
}
