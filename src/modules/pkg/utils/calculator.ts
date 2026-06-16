/**
 * Kalkulator PKG (Penilaian Kinerja Guru)
 * Berdasarkan Permenneg PAN & RB No. 16 Tahun 2009
 * dan Pedoman Pelaksanaan PKG Kemendikbud
 */

// ── Definisi Instrumen ──────────────────────────────────────────────────────

export interface PkgIndicator {
  id: string;
  label: string;
  description: string;
}

export interface PkgCompetency {
  id: string;
  key: "pedagogik" | "kepribadian" | "sosial" | "profesional";
  label: string;
  weight: number; // bobot dalam persen (0–100)
  indicators: PkgIndicator[];
  maxScore: number; // jumlah indikator × 4
}

export const PKG_COMPETENCIES: PkgCompetency[] = [
  {
    id: "k1",
    key: "pedagogik",
    label: "Kompetensi Pedagogik",
    weight: 70,
    indicators: [
      {
        id: "1",
        label: "Menguasai karakteristik peserta didik",
        description:
          "Guru mencatat dan menggunakan informasi tentang karakteristik peserta didik untuk membantu proses pembelajaran.",
      },
      {
        id: "2",
        label: "Menguasai teori belajar dan prinsip pembelajaran",
        description:
          "Guru menetapkan berbagai pendekatan, strategi, metode, dan teknik pembelajaran yang mendidik secara kreatif.",
      },
      {
        id: "3",
        label: "Pengembangan kurikulum",
        description:
          "Guru menyusun silabus sesuai dengan tujuan terpenting kurikulum dan menggunakan RPP sesuai tujuan dan lingkungan pembelajaran.",
      },
      {
        id: "4",
        label: "Kegiatan pembelajaran yang mendidik",
        description:
          "Guru melaksanakan aktivitas pembelajaran sesuai rancangan yang telah disusun secara lengkap dan pelaksanaan aktivitas tersebut mengindikasikan bahwa guru mengerti tentang tujuannya.",
      },
      {
        id: "5",
        label: "Pengembangan potensi peserta didik",
        description:
          "Guru menganalisis hasil belajar berdasarkan segala bentuk penilaian terhadap setiap peserta didik.",
      },
      {
        id: "6",
        label: "Komunikasi dengan peserta didik",
        description:
          "Guru menggunakan pertanyaan untuk mengetahui pemahaman dan menjaga partisipasi peserta didik.",
      },
      {
        id: "7",
        label: "Penilaian dan evaluasi",
        description:
          "Guru menyusun alat penilaian yang sesuai dengan tujuan pembelajaran untuk mencapai kompetensi tertentu.",
      },
    ],
    maxScore: 28, // 7 indikator × 4
  },
  {
    id: "k2",
    key: "kepribadian",
    label: "Kompetensi Kepribadian",
    weight: 10,
    indicators: [
      {
        id: "8",
        label: "Bertindak sesuai norma agama, hukum, sosial, dan kebudayaan",
        description:
          "Guru menghargai dan mempromosikan prinsip-prinsip Pancasila sebagai dasar ideologi dan etika bagi semua warga Indonesia.",
      },
      {
        id: "9",
        label: "Menunjukkan pribadi dewasa dan teladan",
        description:
          "Guru berperilaku jujur, tegas, dan manusiawi, berperilaku yang mencerminkan ketaqwaan dan akhlak mulia.",
      },
      {
        id: "10",
        label: "Etos kerja, tanggung jawab, dan rasa bangga menjadi guru",
        description:
          "Guru memahami dan melaksanakan berbagai program dalam lingkungan sosial, komunitas, dan memiliki visi jangka panjang.",
      },
    ],
    maxScore: 12, // 3 indikator × 4
  },
  {
    id: "k3",
    key: "sosial",
    label: "Kompetensi Sosial",
    weight: 10,
    indicators: [
      {
        id: "11",
        label: "Bersikap inklusif, bertindak objektif, serta tidak diskriminatif",
        description:
          "Guru tidak memihak kepada salah satu kelompok agama, suku, jenis kelamin, atau status sosial ekonomi.",
      },
      {
        id: "12",
        label: "Komunikasi dengan sesama guru, tenaga kependidikan, dan orang tua",
        description:
          "Guru menyampaikan informasi tentang kemajuan, kesulitan, dan potensi peserta didik kepada orang tuanya.",
      },
    ],
    maxScore: 8, // 2 indikator × 4
  },
  {
    id: "k4",
    key: "profesional",
    label: "Kompetensi Profesional",
    weight: 10,
    indicators: [
      {
        id: "13",
        label: "Penguasaan materi, struktur, konsep, dan pola pikir keilmuan",
        description:
          "Guru melakukan pemetaan standar kompetensi dan kompetensi dasar untuk mata pelajaran yang diampunya.",
      },
      {
        id: "14",
        label: "Mengembangkan keprofesionalan melalui tindakan reflektif",
        description:
          "Guru melakukan evaluasi diri secara spesifik, lengkap, dan didukung dengan contoh pengalaman diri sendiri.",
      },
    ],
    maxScore: 8, // 2 indikator × 4
  },
];

export type ScoreMap = Record<string, number>; // { "1": 3, "2": 4, ... }

export interface PkgResult {
  skorPedagogik: number;    // 0–100
  skorKepribadian: number;  // 0–100
  skorSosial: number;       // 0–100
  skorProfesional: number;  // 0–100
  nilaiAkhir: number;       // 0–100 (rata-rata tertimbang)
  nilaiNpkg: number;        // Nilai NPKG
  predikat: string;
  persentaseAngkaKredit: number;
}

/** Hitung skor per kompetensi (0–100) dari map skor indikator */
export function hitungSkorKompetensi(
  scores: ScoreMap,
  competency: PkgCompetency
): number {
  let total = 0;
  let filled = 0;
  for (const ind of competency.indicators) {
    const val = Number(scores[ind.id] ?? 0);
    if (val > 0) {
      total += val;
      filled++;
    }
  }
  if (filled === 0) return 0;
  // Normalisasi: (total / max yang bisa dicapai) × 100
  return Math.round((total / competency.maxScore) * 100 * 100) / 100;
}

/** Hitung semua hasil PKG */
export function hitungPKG(
  pedagogik: ScoreMap,
  kepribadian: ScoreMap,
  sosial: ScoreMap,
  profesional: ScoreMap
): PkgResult {
  const [k1, k2, k3, k4] = PKG_COMPETENCIES;

  const skorPedagogik    = hitungSkorKompetensi(pedagogik,    k1);
  const skorKepribadian  = hitungSkorKompetensi(kepribadian,  k2);
  const skorSosial       = hitungSkorKompetensi(sosial,       k3);
  const skorProfesional  = hitungSkorKompetensi(profesional,  k4);

  // Rata-rata tertimbang sesuai bobot Kemendikbud
  const nilaiAkhir =
    Math.round(
      (skorPedagogik    * (k1.weight / 100) +
       skorKepribadian  * (k2.weight / 100) +
       skorSosial       * (k3.weight / 100) +
       skorProfesional  * (k4.weight / 100)) * 100
    ) / 100;

  const { predikat, npkg, persen } = getPredikat(nilaiAkhir);

  return {
    skorPedagogik,
    skorKepribadian,
    skorSosial,
    skorProfesional,
    nilaiAkhir,
    nilaiNpkg: npkg,
    predikat,
    persentaseAngkaKredit: persen,
  };
}

/** Konversi nilai akhir ke predikat + NPKG + % Angka Kredit */
export function getPredikat(nilaiAkhir: number): {
  predikat: string;
  npkg: number;
  persen: number;
} {
  if (nilaiAkhir >= 91) return { predikat: "Amat Baik", npkg: 125, persen: 125 };
  if (nilaiAkhir >= 76) return { predikat: "Baik",      npkg: 100, persen: 100 };
  if (nilaiAkhir >= 61) return { predikat: "Cukup",     npkg: 75,  persen: 75  };
  if (nilaiAkhir >= 51) return { predikat: "Sedang",    npkg: 50,  persen: 50  };
  return                       { predikat: "Kurang",    npkg: 25,  persen: 25  };
}

/** Helper: Warna badge predikat */
export function getPredikatColor(predikat: string): string {
  switch (predikat) {
    case "Amat Baik": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Baik":      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Cukup":     return "bg-amber-100 text-amber-800 border-amber-200";
    case "Sedang":    return "bg-orange-100 text-orange-800 border-orange-200";
    case "Kurang":    return "bg-red-100 text-red-800 border-red-200";
    default:          return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

/** Tahun pelajaran options (5 tahun terakhir + 1 depan) */
export function getTahunPelajaranOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const options: string[] = [];
  for (let y = year + 1; y >= year - 4; y--) {
    options.push(`${y}/${y + 1}`);
  }
  return options;
}
