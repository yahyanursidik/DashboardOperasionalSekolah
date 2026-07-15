import type { AssessmentWeights, FinalAssessmentType } from "./curriculum-utils";

export const DEFAULT_ASSESSMENT_WEIGHTS: AssessmentWeights = {
  formatif: 30,
  sumatif_lingkup: 30,
  sts: 20,
  semester_final: 20,
};

export type AssessmentGradeType = "formatif" | "sumatif_lingkup" | "sts" | "sas" | "asat";

export function getAssessmentWeights(plan?: any): AssessmentWeights {
  return {
    ...DEFAULT_ASSESSMENT_WEIGHTS,
    ...(plan?.assessment_weights || {}),
  };
}

export function getFinalAssessmentType(plan?: any, semesterName?: string): FinalAssessmentType {
  if (["sas", "asat", "none"].includes(plan?.final_assessment_type)) {
    return plan.final_assessment_type;
  }
  return semesterName === "Genap" ? "asat" : "sas";
}

export function getAssessmentGradeTypes(plan?: any, semesterName?: string) {
  const weights = getAssessmentWeights(plan);
  const finalType = getFinalAssessmentType(plan, semesterName);
  const types: Array<{ value: AssessmentGradeType; label: string; weight: number }> = [
    { value: "formatif", label: "Asesmen Formatif", weight: Number(weights.formatif) || 0 },
    { value: "sumatif_lingkup", label: "Sumatif Lingkup Materi", weight: Number(weights.sumatif_lingkup) || 0 },
    { value: "sts", label: "Sumatif Tengah Semester (STS)", weight: Number(weights.sts) || 0 },
  ];
  if (finalType === "sas") types.push({ value: "sas", label: "Sumatif Akhir Semester (SAS)", weight: Number(weights.semester_final) || 0 });
  if (finalType === "asat") types.push({ value: "asat", label: "Asesmen Sumatif Akhir Tahun (ASAT)", weight: Number(weights.semester_final) || 0 });
  return types.filter((type) => type.weight > 0);
}

export function getAssessmentWeightTotal(plan?: any) {
  const weights = getAssessmentWeights(plan);
  return Object.values(weights).reduce((total, weight) => total + (Number(weight) || 0), 0);
}

export function calculateFinalScore(grades: Record<string, string | number | null | undefined>, plan?: any, semesterName?: string) {
  const components = getAssessmentGradeTypes(plan, semesterName);
  if (components.length === 0) return null;
  let result = 0;
  for (const component of components) {
    const rawScore = grades[component.value];
    if (rawScore === "" || rawScore === null || rawScore === undefined) return null;
    const score = Number(rawScore);
    if (!Number.isFinite(score)) return null;
    result += score * (component.weight / 100);
  }
  return Math.round(result * 100) / 100;
}
