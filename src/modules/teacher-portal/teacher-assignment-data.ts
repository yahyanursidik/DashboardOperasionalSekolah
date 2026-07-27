/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseClient } from "../../lib/supabase/client";

export const HOMEROOM_ASSIGNMENT_ROLES = new Set(["homeroom", "wali_kelas"]);
export const TEACHING_ASSIGNMENT_ROLES = new Set([
  "subject",
  "subject_teacher",
  "guru_mapel",
  "guru_quran",
  "guru_diniyah",
  "substitute",
]);

const extendedSelect = [
  "id",
  "employee_id",
  "unit_id",
  "role_type",
  "class_id",
  "academic_year_id",
  "semester_id",
  "subject_id",
  "subject",
  "hours_per_week",
  "is_active",
  "classes(id,name,level,grade_level,capacity,homeroom_teacher_id,unit_id,academic_year_id,units(id,name,education_level))",
  "subjects(id,name,quran_program_type)",
].join(",");

const legacySelect = [
  "id",
  "employee_id",
  "unit_id",
  "role_type",
  "class_id",
  "academic_year_id",
  "subject",
  "hours_per_week",
  "is_active",
  "classes(id,name,level,grade_level,capacity,homeroom_teacher_id,unit_id,academic_year_id,units(id,name,education_level))",
].join(",");

function isLegacyAssignmentSchema(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return ["semester_id", "subject_id", "relationship", "subjects"].some((term) => message.includes(term));
}

function applyAssignmentScope(
  query: any,
  employeeId: string,
  academicYearId?: string | null,
  semesterId?: string | null,
  supportsSemester = true,
) {
  let next = query
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .not("class_id", "is", null);
  if (academicYearId) next = next.eq("academic_year_id", academicYearId);
  if (supportsSemester && semesterId) next = next.or(`semester_id.is.null,semester_id.eq.${semesterId}`);
  return next;
}

export function isHomeroomAssignment(assignment: any) {
  return HOMEROOM_ASSIGNMENT_ROLES.has(String(assignment?.role_type || ""));
}

export function isTeachingAssignment(assignment: any) {
  return TEACHING_ASSIGNMENT_ROLES.has(String(assignment?.role_type || ""))
    || Boolean(String(assignment?.subject || "").trim());
}

export async function loadTeacherAcademicAssignments({
  employeeId,
  academicYearId,
  semesterId,
}: {
  employeeId: string;
  academicYearId?: string | null;
  semesterId?: string | null;
}) {
  const extendedResult = await applyAssignmentScope(
    supabaseClient.from("teacher_assignments").select(extendedSelect),
    employeeId,
    academicYearId,
    semesterId,
  ).order("created_at");

  if (!extendedResult.error) return extendedResult;
  if (!isLegacyAssignmentSchema(extendedResult.error)) return extendedResult;

  const legacyResult = await applyAssignmentScope(
    supabaseClient.from("teacher_assignments").select(legacySelect),
    employeeId,
    academicYearId,
    null,
    false,
  ).order("created_at");
  return legacyResult.error
    ? legacyResult
    : {
        data: (legacyResult.data || []).map((assignment: any) => ({
          ...assignment,
          semester_id: null,
          subject_id: null,
          subjects: null,
        })),
        error: null,
      };
}

export async function loadTeacherAssignedClassIds(
  employeeId: string,
  academicYearId?: string | null,
  semesterId?: string | null,
) {
  const result = await loadTeacherAcademicAssignments({ employeeId, academicYearId, semesterId });
  return {
    data: Array.from(new Set((result.data || []).map((row: any) => row.class_id).filter(Boolean))) as string[],
    assignments: result.data || [],
    error: result.error,
  };
}
