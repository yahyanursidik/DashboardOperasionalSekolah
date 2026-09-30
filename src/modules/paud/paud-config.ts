export const PAUD_SCALES = ["BB", "MB", "BSH", "BSB"] as const;

export type PaudScale = (typeof PAUD_SCALES)[number];

export const PAUD_SCALE_LABELS: Record<PaudScale, string> = {
  BB: "Belum Berkembang",
  MB: "Mulai Berkembang",
  BSH: "Berkembang Sesuai Harapan",
  BSB: "Berkembang Sangat Baik",
};

export const PAUD_SCALE_TONES: Record<PaudScale, string> = {
  BB: "border-rose-200 bg-rose-50 text-rose-700",
  MB: "border-amber-200 bg-amber-50 text-amber-700",
  BSH: "border-sky-200 bg-sky-50 text-sky-700",
  BSB: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const PAUD_SCALE_RANK: Record<PaudScale, number> = { BB: 1, MB: 2, BSH: 3, BSB: 4 };

/** Six STPPA developmental aspects (optional detail under the Kurikulum Merdeka elements). */
export const PAUD_ASPECTS = [
  {
    id: "agama_moral",
    title: "Nilai Agama & Budi Pekerti",
    shortTitle: "Agama & Budi Pekerti",
    description: "Iman, ibadah, adab, kejujuran, kepedulian, dan kebiasaan baik.",
  },
  {
    id: "fisik_motorik",
    title: "Fisik Motorik",
    shortTitle: "Fisik Motorik",
    description: "Motorik kasar, motorik halus, kesehatan, kemandirian, dan keselamatan.",
  },
  {
    id: "kognitif",
    title: "Kognitif",
    shortTitle: "Kognitif",
    description: "Pemecahan masalah, berpikir logis, eksplorasi, dan pengenalan lingkungan.",
  },
  {
    id: "bahasa",
    title: "Bahasa",
    shortTitle: "Bahasa",
    description: "Menyimak, berbicara, mengekspresikan gagasan, dan keaksaraan awal.",
  },
  {
    id: "sosial_emosional",
    title: "Sosial Emosional & Jati Diri",
    shortTitle: "Sosial Emosional",
    description: "Kesadaran diri, regulasi emosi, tanggung jawab, dan perilaku prososial.",
  },
  {
    id: "seni",
    title: "Seni, Kreativitas & STEAM",
    shortTitle: "Seni & Kreativitas",
    description: "Eksplorasi, imajinasi, apresiasi, dan ekspresi melalui karya serta permainan.",
  },
] as const;

/** Capaian Pembelajaran Fase Fondasi (Kurikulum Merdeka). */
export const PAUD_CP_ELEMENTS = [
  {
    id: "nab",
    title: "Nilai Agama dan Budi Pekerti",
    shortTitle: "Agama & Budi Pekerti",
    description: "Mengenal dan mempraktikkan ajaran pokok agama, adab kepada diri, sesama, dan alam, serta akhlak mulia.",
    prompts: ["Ibadah dan doa harian", "Adab dan akhlak kepada orang lain", "Menyayangi ciptaan Allah"],
  },
  {
    id: "jati_diri",
    title: "Jati Diri",
    shortTitle: "Jati Diri",
    description: "Mengenali identitas diri dan keluarga, mengelola emosi, mandiri, berinteraksi sosial, dan menjaga kesehatan serta keselamatan tubuh.",
    prompts: ["Kemandirian dan regulasi emosi", "Interaksi dengan teman dan guru", "Motorik dan kesehatan diri"],
  },
  {
    id: "steam",
    title: "Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni",
    shortTitle: "Literasi & STEAM",
    description: "Mengenali dan memahami informasi, berkomunikasi, bernalar kritis, memecahkan masalah, serta berekspresi melalui karya.",
    prompts: ["Menyimak, berbicara, dan keaksaraan awal", "Bilangan, pola, dan pemecahan masalah", "Eksplorasi, rancang bangun, dan karya seni"],
  },
] as const;

export type PaudCpElementId = (typeof PAUD_CP_ELEMENTS)[number]["id"];

export const PAUD_PHASES = [
  {
    id: "awal",
    title: "Asesmen Awal",
    shortTitle: "Awal",
    timing: "Awal semester (minggu 1–3)",
    purpose: "Mengenali kondisi awal, minat, dan kebutuhan dukungan anak sebagai dasar perencanaan pembelajaran.",
  },
  {
    id: "tengah",
    title: "Asesmen Tengah",
    shortTitle: "Tengah",
    timing: "Tengah semester",
    purpose: "Memantau kemajuan dari bukti observasi dan menyesuaikan stimulasi di sekolah maupun di rumah.",
  },
  {
    id: "akhir",
    title: "Asesmen Akhir",
    shortTitle: "Akhir",
    timing: "Akhir semester (laporan rapor)",
    purpose: "Merangkum capaian perkembangan selama satu semester untuk laporan kepada orang tua.",
  },
] as const;

export type PaudPhaseId = (typeof PAUD_PHASES)[number]["id"];

export const PAUD_PHASE_LABELS: Record<PaudPhaseId, string> = {
  awal: "Asesmen Awal",
  tengah: "Asesmen Tengah",
  akhir: "Asesmen Akhir",
};

export const PAUD_LEARNING_MODES = [
  { value: "reguler", label: "Reguler (tatap muka)", shortLabel: "Reguler" },
  { value: "online", label: "Online / Homeschooling (HBL)", shortLabel: "Online (HBL)" },
] as const;

export type PaudLearningMode = (typeof PAUD_LEARNING_MODES)[number]["value"];

export const PAUD_LEARNING_MODE_LABELS: Record<PaudLearningMode, string> = {
  reguler: "Reguler",
  online: "Online (HBL)",
};

export const PAUD_EVIDENCE_SOURCES = [
  { value: "observasi_kelas", label: "Observasi di kelas", modes: ["reguler"] },
  { value: "live_meet", label: "Sesi live meet", modes: ["online"] },
  { value: "tugas_rumah", label: "Tugas / lembar kerja di rumah", modes: ["online", "reguler"] },
  { value: "laporan_orang_tua", label: "Laporan pendamping / orang tua", modes: ["online", "reguler"] },
  { value: "karya", label: "Hasil karya anak", modes: ["online", "reguler"] },
  { value: "projek", label: "Projek P5", modes: ["online", "reguler"] },
] as const;

export const PAUD_EVIDENCE_SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  PAUD_EVIDENCE_SOURCES.map((item) => [item.value, item.label]),
);

export const PAUD_OBSERVATION_METHODS = [
  { value: "anecdotal", label: "Catatan anekdot" },
  { value: "photo", label: "Dokumentasi foto" },
  { value: "work_sample", label: "Hasil karya" },
  { value: "checklist", label: "Checklist perkembangan" },
] as const;

export const PAUD_ISLAMIC_VALUES = [
  "Adab",
  "Ibadah",
  "Akhlak",
  "Kemandirian",
  "Tanggung jawab",
  "Kasih sayang",
  "Kebersihan",
  "Cinta Al-Qur'an",
] as const;

/** Tema Projek Penguatan Profil Pelajar Pancasila untuk PAUD. */
export const PAUD_P5_THEMES = [
  "Aku Sayang Bumi",
  "Aku Cinta Indonesia",
  "Kita Semua Bersaudara",
  "Imajinasi dan Kreativitasku",
] as const;

/** HBL observation domains mapped to the Kurikulum Merdeka element they evidence. */
export const HBL_DOMAIN_TO_ELEMENT: Record<string, PaudCpElementId> = {
  religious_values: "nab",
  social_emotional: "jati_diri",
  motor: "jati_diri",
  independence: "jati_diri",
  language: "steam",
  cognitive: "steam",
  art: "steam",
  other: "steam",
};

export const HBL_DOMAIN_LABELS: Record<string, string> = {
  language: "Bahasa",
  cognitive: "Kognitif",
  motor: "Motorik",
  social_emotional: "Sosial emosional",
  religious_values: "Nilai agama",
  art: "Seni",
  independence: "Kemandirian",
  other: "Lainnya",
};

export const HBL_STAGE_LABELS: Record<string, string> = {
  emerging: "Mulai muncul",
  developing: "Berkembang",
  secure: "Konsisten",
  beyond: "Melampaui",
};

type UnitLike = { name?: string | null; education_level?: string | null } | null | undefined;

/** True for KB/TK units, including the online Preschool HBL unit. */
export function isPaudUnit(unit: UnitLike) {
  if (!unit) return false;
  if (unit.education_level === "preschool") return true;
  if (unit.education_level) return false;
  const name = String(unit.name || "").toLowerCase();
  return ["paud", "preschool", "kindergarten", "playgroup"].some((term) => name.includes(term))
    || /\b(tk|kb)\b/.test(name);
}

export function formatPaudDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function paudPeriodName(phase: PaudPhaseId, semesterName?: string | null) {
  return `${PAUD_PHASE_LABELS[phase]}${semesterName ? ` Semester ${semesterName}` : ""}`;
}
