export const ASSESSMENT_BASIS_OPTIONS = [
  { value: "progress", label: "Laporan Progres" },
  { value: "sts", label: "Sumatif Tengah Semester (STS)" },
  { value: "sas", label: "Sumatif Akhir Semester (SAS)" },
  { value: "asat", label: "Asesmen Sumatif Akhir Tahun (ASAT)" },
  { value: "program", label: "Program Khusus" },
] as const;

export function getAssessmentBasisLabel(value?: string) {
  return ASSESSMENT_BASIS_OPTIONS.find((option) => option.value === value)?.label || "Basis asesmen belum ditentukan";
}

export function getReportTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    progress_awal: "Laporan Progres Awal",
    progress_tengah: "Laporan Progres Tengah Semester",
    rapor_semester: "Rapor Semester",
    rapor_program_khusus: "Rapor Program Khusus",
  };
  return labels[value || ""] || value?.replace(/_/g, " ") || "Rapor";
}
