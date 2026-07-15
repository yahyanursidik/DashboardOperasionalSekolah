import { supabaseClient } from "../../lib/supabase/client";
import {
  CURRICULUM_SEMESTERS,
  type CurriculumSemesterName,
  type CurriculumSemesterPlan,
} from "./curriculum-utils";
import { getAssessmentWeightTotal } from "./assessment-policy";

export function getSemesterPlanStatus(plan: CurriculumSemesterPlan) {
  const prosemCount = plan.prosem_data?.rows?.length || 0;
  const rppmCount = plan.prosem_data?.rppm?.length || 0;
  const moduleCount = plan.learning_plan_data?.length || 0;
  if (prosemCount > 0 && rppmCount > 0 && moduleCount > 0) return "ready";
  if (prosemCount > 0 || rppmCount > 0 || moduleCount > 0) return "in_progress";
  return "draft";
}

export async function saveCurriculumSemesterPlans({
  subjectCurriculumId,
  academicYearId,
  plans,
  enabledSemesters = [...CURRICULUM_SEMESTERS],
}: {
  subjectCurriculumId: string;
  academicYearId: string;
  plans: Record<CurriculumSemesterName, CurriculumSemesterPlan>;
  enabledSemesters?: CurriculumSemesterName[];
}) {
  const { data: semesterRows, error: semesterError } = await supabaseClient
    .from("semesters")
    .select("id, name")
    .eq("academic_year_id", academicYearId)
    .in("name", enabledSemesters);

  if (semesterError) throw semesterError;
  const missingSemesters = enabledSemesters.filter(
    (name) => !(semesterRows || []).some((row: any) => row.name === name),
  );
  if (missingSemesters.length > 0) {
    throw new Error(`Semester ${missingSemesters.join(" dan ")} belum dikonfigurasi pada tahun ajaran ini.`);
  }

  enabledSemesters.forEach((semesterName) => {
    const plan = plans[semesterName];
    const total = getAssessmentWeightTotal(plan);
    if (total !== 100) {
      throw new Error(`Total bobot asesmen semester ${semesterName} harus 100% (saat ini ${total}%).`);
    }
    if (plan.final_assessment_type === "none" && Number(plan.assessment_weights?.semester_final || 0) !== 0) {
      throw new Error(`Bobot asesmen akhir semester ${semesterName} harus 0% karena ujian akhir dinonaktifkan.`);
    }
  });

  const payload = enabledSemesters.map((semesterName) => {
    const plan = plans[semesterName];
    const semester = ((semesterRows || []) as any[]).find((row: any) => row.name === semesterName);
    if (!semester) throw new Error(`Semester ${semesterName} belum dikonfigurasi pada tahun ajaran ini.`);
    return {
      subject_curriculum_id: subjectCurriculumId,
      semester_id: semester.id,
      semester_name: semesterName,
      weekly_hours: plan.weekly_hours === "" || plan.weekly_hours == null ? null : Number(plan.weekly_hours),
      include_in_report: plan.include_in_report !== false,
      final_assessment_type: plan.final_assessment_type,
      assessment_weights: {
        formatif: Number(plan.assessment_weights?.formatif) || 0,
        sumatif_lingkup: Number(plan.assessment_weights?.sumatif_lingkup) || 0,
        sts: Number(plan.assessment_weights?.sts) || 0,
        semester_final: Number(plan.assessment_weights?.semester_final) || 0,
      },
      prosem_data: {
        rows: Array.isArray(plan.prosem_data?.rows) ? plan.prosem_data.rows : [],
        rppm: Array.isArray(plan.prosem_data?.rppm) ? plan.prosem_data.rppm : [],
      },
      learning_plan_data: Array.isArray(plan.learning_plan_data) ? plan.learning_plan_data : [],
      status: getSemesterPlanStatus(plan),
      review_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    };
  });

  const { error } = await supabaseClient
    .from("subject_curriculum_semesters")
    .upsert(payload, { onConflict: "subject_curriculum_id,semester_id" });
  if (error) throw error;
}

export function getEnabledSubjectSemesters(subject: any): CurriculumSemesterName[] {
  const configured = Array.isArray(subject?.semesters)
    ? subject.semesters.filter((name: string) => CURRICULUM_SEMESTERS.includes(name as CurriculumSemesterName))
    : [];
  return configured.length > 0 ? configured : [...CURRICULUM_SEMESTERS];
}
