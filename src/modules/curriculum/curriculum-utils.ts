import {
  getRppmRows,
  getRpphRows,
  getSdPhaseByGrade,
  hasRows,
} from "./subject-curriculums/sdCurriculumStructure";
import { getAssessmentWeightTotal } from "./assessment-policy";

export const CURRICULUM_GRADES = [1, 2, 3, 4, 5, 6] as const;
export const CURRICULUM_SEMESTERS = ["Ganjil", "Genap"] as const;
export type CurriculumSemesterName = (typeof CURRICULUM_SEMESTERS)[number];
export type FinalAssessmentType = "sas" | "asat" | "none";
export type AssessmentWeights = {
  formatif: number;
  sumatif_lingkup: number;
  sts: number;
  semester_final: number;
};

export type CurriculumSemesterPlan = {
  id?: string;
  semester_id?: string;
  semester_name: CurriculumSemesterName;
  weekly_hours?: number | string | null;
  include_in_report: boolean;
  final_assessment_type: FinalAssessmentType;
  assessment_weights: AssessmentWeights;
  prosem_data: { rows: any[]; rppm: any[] };
  learning_plan_data: any[];
  status?: "draft" | "in_progress" | "ready" | "reviewed";
  review_notes?: string | null;
};

export function createEmptySemesterPlan(semesterName: CurriculumSemesterName): CurriculumSemesterPlan {
  return {
    semester_name: semesterName,
    weekly_hours: "",
    include_in_report: true,
    final_assessment_type: semesterName === "Genap" ? "asat" : "sas",
    assessment_weights: { formatif: 30, sumatif_lingkup: 30, sts: 20, semester_final: 20 },
    prosem_data: { rows: [], rppm: [] },
    learning_plan_data: [],
    status: "draft",
    review_notes: "",
  };
}

export function createEmptySemesterPlans(): Record<CurriculumSemesterName, CurriculumSemesterPlan> {
  return {
    Ganjil: createEmptySemesterPlan("Ganjil"),
    Genap: createEmptySemesterPlan("Genap"),
  };
}

export function normalizeSemesterPlans(
  rows: any[] = [],
  legacyRecord?: any,
): Record<CurriculumSemesterName, CurriculumSemesterPlan> {
  const result = createEmptySemesterPlans();
  rows.forEach((row) => {
    const name = row.semester_name as CurriculumSemesterName;
    if (!CURRICULUM_SEMESTERS.includes(name)) return;
    result[name] = {
      ...result[name],
      ...row,
      include_in_report: row.include_in_report !== false,
      final_assessment_type: row.final_assessment_type || (name === "Genap" ? "asat" : "sas"),
      assessment_weights: {
        ...result[name].assessment_weights,
        ...(row.assessment_weights || {}),
      },
      prosem_data: {
        rows: Array.isArray(row.prosem_data?.rows) ? row.prosem_data.rows : [],
        rppm: Array.isArray(row.prosem_data?.rppm) ? row.prosem_data.rppm : [],
      },
      learning_plan_data: Array.isArray(row.learning_plan_data) ? row.learning_plan_data : [],
    };
  });

  if (rows.length === 0 && legacyRecord) {
    const legacyName: CurriculumSemesterName = legacyRecord.prosem_data?.semester === "Genap" ? "Genap" : "Ganjil";
    result[legacyName] = {
      ...result[legacyName],
      prosem_data: {
        rows: Array.isArray(legacyRecord.prosem_data?.rows) ? legacyRecord.prosem_data.rows : [],
        rppm: Array.isArray(legacyRecord.prosem_data?.rppm) ? legacyRecord.prosem_data.rppm : [],
      },
      learning_plan_data: Array.isArray(legacyRecord.learning_plan_data) ? legacyRecord.learning_plan_data : [],
    };
  }
  return result;
}

export function getSemesterPlan(record: any, semesterId?: string | null, semesterName?: string | null) {
  const plans = Array.isArray(record?.subject_curriculum_semesters)
    ? record.subject_curriculum_semesters
    : [];
  if (semesterId) {
    const byId = plans.find((plan: any) => String(plan.semester_id) === String(semesterId));
    if (byId) return byId;
  }
  if (semesterName) {
    const byName = plans.find((plan: any) => plan.semester_name === semesterName);
    if (byName) return byName;
  }
  return undefined;
}

export function getSemesterRppmRows(record: any, semesterId?: string | null, semesterName?: string | null) {
  const plan = getSemesterPlan(record, semesterId, semesterName);
  if (plan) return Array.isArray(plan.prosem_data?.rppm) ? plan.prosem_data.rppm : [];
  return getRppmRows(record);
}

export function getSemesterLearningPlanRows(record: any, semesterId?: string | null, semesterName?: string | null) {
  const plan = getSemesterPlan(record, semesterId, semesterName);
  if (plan) return Array.isArray(plan.learning_plan_data) ? plan.learning_plan_data : [];
  return getRpphRows(record);
}

export function getSubjectTargetGrades(subject: any): number[] {
  const grades = Array.isArray(subject?.grade_levels)
    ? subject.grade_levels.map(Number).filter((grade: number) => CURRICULUM_GRADES.includes(grade as any))
    : [];

  return grades.length > 0
    ? [...new Set<number>(grades)].sort((a, b) => a - b)
    : [...CURRICULUM_GRADES];
}

export function getCurriculumRecord(records: any[], subjectId: string, grade: number) {
  return records.find(
    (record) => String(record.subject_id) === String(subjectId) && Number(record.grade_level) === grade,
  );
}

export function getPhaseReferenceRecord(records: any[], subjectId: string, grade: number) {
  const phase = getSdPhaseByGrade(grade);
  if (!phase) return undefined;

  return records.find(
    (record) =>
      String(record.subject_id) === String(subjectId) &&
      (phase.grades as readonly number[]).includes(Number(record.grade_level)) &&
      Boolean(record.cp_text || record.atp_text),
  );
}

export function getCurriculumCompletion(
  record: any,
  phaseRecord?: any,
  semesterId?: string | null,
  semesterName?: string | null,
) {
  const phaseSource = phaseRecord || record;
  const semesterPlan = getSemesterPlan(record, semesterId, semesterName);
  const prosemData = semesterPlan?.prosem_data || record?.prosem_data;
  const assessmentPolicyReady = Boolean(
    semesterPlan
    && getAssessmentWeightTotal(semesterPlan) === 100
    && (semesterPlan.final_assessment_type !== "none" || Number(semesterPlan.assessment_weights?.semester_final || 0) === 0),
  );
  const checks = [
    { key: "cp", label: "CP fase", done: Boolean(phaseSource?.cp_text) },
    { key: "atp", label: "ATP fase", done: Boolean(phaseSource?.atp_text) },
    { key: "prota", label: "Prota", done: hasRows(record?.prota_data) },
    { key: "prosem", label: "Promes", done: Array.isArray(prosemData?.rows) && prosemData.rows.length > 0 },
    { key: "rppm", label: "RPPM", done: getSemesterRppmRows(record, semesterId, semesterName).length > 0 },
    { key: "rpph", label: "RPPH / Modul", done: getSemesterLearningPlanRows(record, semesterId, semesterName).length > 0 },
    { key: "assessment", label: "Kebijakan asesmen & rapor", done: assessmentPolicyReady },
  ];
  const completed = checks.filter((check) => check.done).length;

  return {
    checks,
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    ready: completed === checks.length,
    missing: checks.filter((check) => !check.done).map((check) => check.label),
  };
}

export function getAssignmentGrade(assignment: any) {
  const directGrade = Number(assignment?.classes?.grade_level);
  if (directGrade) return directGrade;

  const match = String(assignment?.classes?.name || "").match(/\b([1-6])\b/);
  return match ? Number(match[1]) : undefined;
}

export function hasTeacherAssignment(assignments: any[], subjectId: string, grade: number) {
  return assignments.some(
    (assignment) =>
      String(assignment.subject_id) === String(subjectId) && getAssignmentGrade(assignment) === grade,
  );
}

export function getTeacherCoverage(assignments: any[], classes: any[], subject: any, grade: number) {
  const targetClasses = classes.filter(
    (classRecord) =>
      Number(classRecord.grade_level) === grade &&
      (!subject.unit_id || String(classRecord.unit_id) === String(subject.unit_id)),
  );
  const assignedClassIds = new Set(
    assignments
      .filter((assignment) => String(assignment.subject_id) === String(subject.id))
      .map((assignment) => String(assignment.class_id || assignment.classes?.id || ""))
      .filter(Boolean),
  );
  const covered = targetClasses.filter((classRecord) => assignedClassIds.has(String(classRecord.id))).length;

  return {
    covered,
    total: targetClasses.length,
    complete: targetClasses.length > 0 && covered === targetClasses.length,
  };
}
