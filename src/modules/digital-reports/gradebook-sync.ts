import { supabaseClient } from "../../lib/supabase/client";
import { calculateFinalScore } from "../curriculum/assessment-policy";

type GradeRow = {
  subject_id: string;
  grade_type: string;
  score: string | null;
  subject_curriculum_semesters: { final_assessment_type?: string | null; assessment_weights?: Record<string, number> | null } | null;
};

/**
 * Final Gradebook score per subject for one student in one semester, using the same
 * weighting as the Gradebook screen (curriculum semester plan + semester name).
 * Subjects with incomplete components are omitted.
 */
export async function loadGradebookFinalScores(studentId: string, semesterId: string, semesterName?: string) {
  const { data, error } = await supabaseClient
    .from("academic_grades")
    .select("subject_id, grade_type, score, subject_curriculum_semesters(final_assessment_type, assessment_weights)")
    .eq("student_id", studentId)
    .eq("semester_id", semesterId);
  if (error) return { scores: {} as Record<string, number>, error };

  const bySubject = new Map<string, { grades: Record<string, string | null>; plan: GradeRow["subject_curriculum_semesters"] }>();
  for (const row of (data || []) as unknown as GradeRow[]) {
    const entry = bySubject.get(row.subject_id) || { grades: {}, plan: row.subject_curriculum_semesters };
    entry.grades[row.grade_type] = row.score;
    entry.plan = entry.plan || row.subject_curriculum_semesters;
    bySubject.set(row.subject_id, entry);
  }

  const scores: Record<string, number> = {};
  bySubject.forEach((entry, subjectId) => {
    const finalScore = calculateFinalScore(entry.grades, entry.plan, semesterName);
    if (finalScore !== null) scores[subjectId] = finalScore;
  });
  return { scores, error: null };
}

/** Gradebook scores are 0-100; report items may use another maximum. */
export function scaleToItemMax(score: number, maxScore?: number | null) {
  const max = Number(maxScore) || 100;
  return Math.round((score * max / 100) * 100) / 100;
}
