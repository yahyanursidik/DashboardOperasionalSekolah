export const TEACHER_POSITIONS = new Set([
  "guru",
  "guru_quran",
  "wali_kelas",
  "kepala_sekolah",
  "wakasek_umum",
  "wakasek_kurikulum",
  "wakasek_kesiswaan",
  "kepala_unit",
]);

export const POSITION_LABELS: Record<string, string> = {
  guru: "Guru",
  guru_quran: "Guru Quran",
  wali_kelas: "Wali Kelas",
  kepala_sekolah: "Kepala Sekolah",
  wakasek: "Wakil Kepala",
  wakasek_umum: "Wakil Kepala Sekolah",
  wakasek_kurikulum: "Wakil Kurikulum",
  wakasek_kesiswaan: "Wakil Kesiswaan",
  kepala_unit: "Kepala Unit",
  tu: "Tata Usaha",
};

export function isPkgEligibleEmployee(employee: any) {
  return employee?.status === "active" && TEACHER_POSITIONS.has(employee?.position);
}

export function formatPkgDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...options,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getPkgStatusConfig(status?: string | null) {
  if (status === "final") {
    return { label: "Final", color: "bg-emerald-100 text-emerald-700", tone: "green" };
  }
  return { label: "Draft", color: "bg-amber-100 text-amber-700", tone: "amber" };
}

export function getPkgFollowUp(nilai?: number | string | null, status?: string | null) {
  if (status !== "final") {
    return {
      label: "Lanjutkan penilaian",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      description: "Lengkapi indikator dan catatan sebelum finalisasi.",
    };
  }

  const score = Number(nilai ?? 0);
  if (score >= 91) {
    return {
      label: "Praktik baik",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description: "Pertahankan mutu dan libatkan sebagai mentor rekan sejawat.",
    };
  }
  if (score >= 76) {
    return {
      label: "Penguatan terarah",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      description: "Tetapkan target peningkatan pada kompetensi dengan skor terendah.",
    };
  }
  if (score >= 61) {
    return {
      label: "Pembinaan prioritas",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      description: "Susun rencana coaching dan supervisi kelas berkala.",
    };
  }
  return {
    label: "Supervisi intensif",
    color: "bg-red-50 text-red-700 border-red-200",
    description: "Butuh pendampingan intensif dan monitoring tindak lanjut.",
  };
}

export function getPkgReadiness(input: {
  competencies: any[];
  indicators: any[];
  totalWeight?: number;
}) {
  const activeCompetencies = input.competencies.filter((c) => c.is_active !== false);
  const activeIndicators = input.indicators.filter((i) => i.is_active !== false);
  const totalWeight =
    input.totalWeight ??
    activeCompetencies.reduce((sum, c) => sum + Number(c.weight ?? 0), 0);

  const missingIndicatorCompetencies = activeCompetencies.filter(
    (comp) => !activeIndicators.some((ind) => ind.competency_id === comp.id)
  );

  const issues: string[] = [];
  if (activeCompetencies.length === 0) issues.push("Belum ada kompetensi aktif.");
  if (activeIndicators.length === 0) issues.push("Belum ada indikator aktif.");
  if (missingIndicatorCompetencies.length > 0) {
    issues.push(`${missingIndicatorCompetencies.length} kompetensi belum punya indikator aktif.`);
  }
  if (Math.abs(totalWeight - 100) >= 0.01) issues.push("Total bobot belum 100%.");

  return {
    ready: issues.length === 0,
    activeCompetencies: activeCompetencies.length,
    activeIndicators: activeIndicators.length,
    totalWeight,
    issues,
  };
}
