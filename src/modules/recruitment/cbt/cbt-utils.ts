export function formatCbtDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function getParticipantStats(participants: any[] = []) {
  return {
    total: participants.length,
    pending: participants.filter((item) => item.status === "pending").length,
    inProgress: participants.filter((item) => item.status === "in_progress").length,
    completed: participants.filter((item) => item.status === "completed").length,
    passed: participants.filter((item) => item.is_passed === true).length,
  };
}

export function getExamQuestionTarget(mappings: any[] = []) {
  return mappings.reduce((total, mapping) => total + (Number(mapping.question_count) || 0), 0);
}

export function getExamReadiness(exam: any, participants: any[] = []) {
  const mappings = exam?.cbt_exam_banks ?? [];
  const questionTarget = getExamQuestionTarget(mappings);
  const hasBank = mappings.length > 0;
  const hasQuestionTarget = questionTarget > 0;
  const hasParticipants = participants.length > 0;

  if (hasBank && hasQuestionTarget && hasParticipants) return { label: "Siap Digunakan", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (hasBank && hasQuestionTarget) return { label: "Siap Dibagikan", className: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: "Perlu Bank Soal", className: "bg-amber-100 text-amber-700 border-amber-200" };
}

export function validateExamConfig(formData: { title: string; duration_minutes: number; passing_grade: number }) {
  if (!formData.title.trim()) return "Judul ujian wajib diisi";
  if (!Number.isFinite(formData.duration_minutes) || formData.duration_minutes < 5) return "Durasi minimal 5 menit";
  if (!Number.isFinite(formData.passing_grade) || formData.passing_grade < 1 || formData.passing_grade > 100) return "Ambang kelulusan harus 1 sampai 100";
  return null;
}
