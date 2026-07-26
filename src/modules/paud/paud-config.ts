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

export function formatPaudDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
