export const HBL_PRESCHOOL_LEVELS = [
  { value: "kb", label: "KB · Kelompok Bermain" },
  { value: "tka", label: "TK-A" },
  { value: "tkb", label: "TK-B" },
] as const;

export const HBL_LEVEL_LABELS: Record<string, string> = { kb: "KB", tka: "TK-A", tkb: "TK-B" };

/** KB / TK-A / TK-B from a class level or name such as "kbhbl", "TK-A HBL", "tkbhbl". */
export function normalizePreschoolLevel(...values: (string | null | undefined)[]) {
  for (const value of values) {
    const text = String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
    if (!text) continue;
    if (text.startsWith("kb") || text.includes("kelompokbermain") || text.includes("playgroup")) return "kb";
    if (text.includes("tka")) return "tka";
    if (text.includes("tkb")) return "tkb";
  }
  return "";
}

export const HBL_STATUS_LABELS: Record<string, string> = { draft: "Draf", scheduled: "Terjadwal", published: "Terbit", archived: "Arsip" };

export const HBL_ACTIVITY_TYPES: Record<string, string> = {
  observe: "Mengamati",
  explore: "Eksplorasi",
  create: "Berkreasi",
  movement: "Gerak",
  story: "Cerita",
  music: "Musik & lagu",
  routine: "Pembiasaan",
  reflection: "Refleksi",
};

export const HBL_EVIDENCE_TYPES: Record<string, string> = {
  none: "Tidak perlu bukti",
  checklist: "Checklist selesai",
  parent_note: "Catatan orang tua",
  photo: "Foto",
  video: "Video",
  audio: "Audio",
  optional_upload: "Unggahan opsional",
};

export const HBL_MEDIA_TYPES: Record<string, string> = {
  youtube: "YouTube",
  google_drive: "Google Drive",
  video: "Video",
  audio: "Audio / lagu",
  pdf: "PDF / cerita",
  link: "Tautan lain",
};

export const HBL_PLATFORMS: Record<string, string> = { google_meet: "Google Meet", zoom: "Zoom", other: "Platform lain" };

export const HBL_ATTENDANCE_STATUSES = [
  { value: "hadir", label: "Hadir", tone: "bg-emerald-600 text-white" },
  { value: "izin", label: "Izin", tone: "bg-sky-600 text-white" },
  { value: "sakit", label: "Sakit", tone: "bg-amber-500 text-white" },
  { value: "alpa", label: "Tidak hadir", tone: "bg-rose-600 text-white" },
] as const;

export type HblMediaLink = { title: string; type: string; url: string };

export function meetingTiming(meeting: { meeting_date?: string | null }, today = new Date().toLocaleDateString("en-CA")) {
  if (!meeting.meeting_date) return "flexible" as const;
  if (meeting.meeting_date === today) return "today" as const;
  return meeting.meeting_date < today ? ("past" as const) : ("upcoming" as const);
}

export function formatMeetingDate(date?: string | null, start?: string | null, end?: string | null) {
  if (!date) return "Jadwal fleksibel";
  const label = new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = start ? ` · ${start.slice(0, 5)}${end ? `–${end.slice(0, 5)}` : ""}` : "";
  return `${label}${time}`;
}
