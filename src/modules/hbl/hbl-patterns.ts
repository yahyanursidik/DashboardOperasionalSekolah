/**
 * Learning patterns for /lms. Every program uses the same Program -> Group -> Meeting structure;
 * the pattern decides the vocabulary and which building blocks a meeting shows.
 * Add a pattern here (plus its journey_mode in the database check) to support a new level.
 */
export type HblPatternId = "preschool_thematic" | "elementary_subject";

export type HblPattern = {
  id: HblPatternId;
  journeyMode: "preschool_hbl" | "general_hbl";
  label: string;
  audience: string;
  summary: string;
  tone: string;
  group: { singular: string; plural: string; themeField: string | null; titlePlaceholder: string; example: string };
  meeting: { singular: string; titlePrefix: string };
  activity: { singular: string; plural: string; placeholder: string };
  /** Kurikulum Merdeka Fase Fondasi elements on meetings and notes. */
  usesCpElements: boolean;
  /** Meetings reference a master subject (mata pelajaran). */
  usesSubjects: boolean;
  /** Per-child notes after a meeting feed the PAUD observation journal. */
  developmentNotes: boolean;
  parentReportPath: string;
  parentReportLabel: string;
  steps: string[];
};

export const HBL_PATTERNS: Record<HblPatternId, HblPattern> = {
  preschool_thematic: {
    id: "preschool_thematic",
    journeyMode: "preschool_hbl",
    label: "Tematik PAUD",
    audience: "KB / TK",
    summary: "Belajar melalui tema dan subtema. Setiap pertemuan berisi kegiatan main bersama orang tua, bukan materi per mata pelajaran.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    group: { singular: "Tema", plural: "Tema & Subtema", themeField: "Tema", titlePlaceholder: "Subtema, mis. Tubuhku", example: "Diriku → Tubuhku" },
    meeting: { singular: "Pertemuan", titlePrefix: "Pertemuan" },
    activity: { singular: "Kegiatan main", plural: "Kegiatan main", placeholder: "Contoh: Menempel gambar anggota keluarga" },
    usesCpElements: true,
    usesSubjects: false,
    developmentNotes: true,
    parentReportPath: "/portal/paud",
    parentReportLabel: "Laporan perkembangan KB/TK",
    steps: ["Tautkan kelas", "Susun tema & subtema", "Jadwalkan pertemuan", "Terbitkan ke orang tua", "Catat kehadiran & perkembangan"],
  },
  elementary_subject: {
    id: "elementary_subject",
    journeyMode: "general_hbl",
    label: "Mapel SD",
    audience: "SD",
    summary: "Belajar per pekan dengan pertemuan per mata pelajaran: penjelasan guru, materi, tugas, dan lembar kerja.",
    tone: "bg-sky-50 text-sky-700 border-sky-200",
    group: { singular: "Pekan", plural: "Pekan belajar", themeField: null, titlePlaceholder: "Judul pekan, mis. Pekan 1 · Bilangan", example: "Pekan 1 → Matematika, Bahasa Indonesia" },
    meeting: { singular: "Pertemuan", titlePrefix: "Pertemuan" },
    activity: { singular: "Tugas", plural: "Tugas & latihan", placeholder: "Contoh: Kerjakan soal halaman 12 nomor 1–5" },
    usesCpElements: false,
    usesSubjects: true,
    developmentNotes: false,
    parentReportPath: "/portal/academic",
    parentReportLabel: "Nilai & e-Rapor",
    steps: ["Tautkan kelas", "Susun pekan belajar", "Jadwalkan pertemuan per mapel", "Terbitkan ke orang tua", "Catat kehadiran"],
  },
};

export function patternForProgram(program?: { journey_mode?: string | null } | null): HblPattern {
  return program?.journey_mode === "general_hbl" ? HBL_PATTERNS.elementary_subject : HBL_PATTERNS.preschool_thematic;
}

export function patternForUnit(unit?: { education_level?: string | null } | null): HblPattern {
  return !unit?.education_level || unit.education_level === "preschool" ? HBL_PATTERNS.preschool_thematic : HBL_PATTERNS.elementary_subject;
}
