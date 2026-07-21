/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseClient } from "../../lib/supabase/client";

const extendedSelect = "id, employee_id, day_of_week, start_time, end_time, schedule_type, schedule_scope, schedule_kind, activity_name, schedule_group_id, is_synchronized, subject, subject_id, unit_id, class_id, academic_year_id, semester_id, classes(name, unit_id, units(name)), units(name), subjects(name), employees(full_name)";
const legacySelect = "id, employee_id, day_of_week, start_time, end_time, schedule_type, subject, subject_id, unit_id, class_id, academic_year_id, semester_id, classes(name, unit_id, units(name)), units(name), subjects(name), employees(full_name)";

function missingPatternColumns(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return ["schedule_scope", "schedule_kind", "activity_name", "schedule_group_id", "is_synchronized"]
    .some((column) => message.includes(column));
}

function normalizeLegacyRows(rows: any[] | null) {
  return (rows || []).map((row) => ({
    ...row,
    schedule_scope: row.schedule_type === "mengajar" && !row.class_id && row.unit_id ? "unit" : "class",
    schedule_kind: row.schedule_type === "mengajar" && !row.class_id && row.unit_id ? "unit_activity" : "subject",
    activity_name: row.schedule_type === "mengajar" && !row.class_id && row.unit_id ? row.subject : null,
    is_synchronized: row.schedule_type === "mengajar" && !row.class_id && Boolean(row.unit_id),
  }));
}

function mergeRows(...groups: any[][]) {
  const merged = new Map<string, any>();
  groups.flat().forEach((row) => merged.set(String(row.id), row));
  return Array.from(merged.values());
}

function applyExactPeriod(query: any, academicYearId?: string | null, semesterId?: string | null) {
  let next = query;
  if (academicYearId) next = next.eq("academic_year_id", academicYearId);
  if (semesterId) next = next.eq("semester_id", semesterId);
  return next;
}

function applyEmployeePeriod(query: any, academicYearId?: string | null, semesterId?: string | null) {
  let next = query;
  if (academicYearId) next = next.or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`);
  if (semesterId) next = next.or(`semester_id.eq.${semesterId},semester_id.is.null`);
  return next;
}

export async function loadTeacherAssignedUnitIds(employeeId: string, academicYearId?: string | null, semesterId?: string | null) {
  const createQuery = (includeSemester: boolean) => {
    let query = supabaseClient
      .from("teacher_assignments")
      .select("unit_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true);
    if (academicYearId) query = query.or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`);
    if (includeSemester && semesterId) query = query.or(`semester_id.eq.${semesterId},semester_id.is.null`);
    return query;
  };
  let result = await createQuery(true);
  if (result.error && semesterId && String(result.error.message || "").includes("semester_id")) {
    result = await createQuery(false);
  }
  if (result.error) return [];
  return Array.from(new Set((result.data || []).map((row: any) => row.unit_id).filter(Boolean))) as string[];
}

export async function loadStudentLearningSchedules({
  classId,
  unitId,
  academicYearId,
  semesterId,
}: {
  classId: string;
  unitId?: string | null;
  academicYearId?: string | null;
  semesterId?: string | null;
}) {
  let query = supabaseClient
    .from("employee_schedules")
    .select(extendedSelect)
    .eq("schedule_type", "mengajar")
    .order("start_time");
  query = unitId
    ? query.or(`class_id.eq.${classId},and(schedule_scope.eq.unit,unit_id.eq.${unitId})`)
    : query.eq("class_id", classId);
  const result = await applyExactPeriod(query, academicYearId, semesterId);
  if (!result.error || !missingPatternColumns(result.error)) return result;

  let legacyQuery = supabaseClient
    .from("employee_schedules")
    .select(legacySelect)
    .eq("schedule_type", "mengajar")
    .order("start_time");
  legacyQuery = unitId
    ? legacyQuery.or(`class_id.eq.${classId},and(class_id.is.null,unit_id.eq.${unitId})`)
    : legacyQuery.eq("class_id", classId);
  legacyQuery = applyExactPeriod(legacyQuery, academicYearId, semesterId);
  const legacyResult = await legacyQuery;
  return legacyResult.error
    ? legacyResult
    : { data: normalizeLegacyRows(legacyResult.data), error: null };
}

export async function loadTeacherLearningSchedules({
  employeeId,
  homeUnitId,
  academicYearId,
  semesterId,
}: {
  employeeId: string;
  homeUnitId?: string | null;
  academicYearId?: string | null;
  semesterId?: string | null;
}) {
  const assignedUnitIds = await loadTeacherAssignedUnitIds(employeeId, academicYearId, semesterId);
  let ownQuery = supabaseClient
    .from("employee_schedules")
    .select(extendedSelect)
    .eq("employee_id", employeeId)
    .order("start_time");
  ownQuery = applyEmployeePeriod(ownQuery, academicYearId, semesterId);
  const ownResult = await ownQuery;

  if (ownResult.error && missingPatternColumns(ownResult.error)) {
    let legacyQuery = supabaseClient
      .from("employee_schedules")
      .select(legacySelect)
      .eq("employee_id", employeeId)
      .order("start_time");
    legacyQuery = applyEmployeePeriod(legacyQuery, academicYearId, semesterId);
    const legacyOwnResult = await legacyQuery;
    if (legacyOwnResult.error) return legacyOwnResult;

    const unitIds = Array.from(new Set([
      homeUnitId,
      ...assignedUnitIds,
      ...(legacyOwnResult.data || []).map((row: any) => row.unit_id),
    ].filter(Boolean))) as string[];
    if (unitIds.length === 0) return { data: normalizeLegacyRows(legacyOwnResult.data), error: null };

    let legacyUnitQuery = supabaseClient
      .from("employee_schedules")
      .select(legacySelect)
      .eq("schedule_type", "mengajar")
      .is("class_id", null)
      .in("unit_id", unitIds)
      .order("start_time");
    legacyUnitQuery = applyExactPeriod(legacyUnitQuery, academicYearId, semesterId);
    const legacyUnitResult = await legacyUnitQuery;
    return {
      data: mergeRows(normalizeLegacyRows(legacyOwnResult.data), normalizeLegacyRows(legacyUnitResult.error ? [] : legacyUnitResult.data)),
      error: null,
    };
  }
  if (ownResult.error) return ownResult;

  const unitIds = Array.from(new Set([
    homeUnitId,
    ...assignedUnitIds,
    ...(ownResult.data || []).map((row: any) => row.unit_id),
  ].filter(Boolean))) as string[];
  if (unitIds.length === 0) return ownResult;

  let unitQuery = supabaseClient
    .from("employee_schedules")
    .select(extendedSelect)
    .eq("schedule_type", "mengajar")
    .eq("schedule_scope", "unit")
    .in("unit_id", unitIds)
    .order("start_time");
  unitQuery = applyExactPeriod(unitQuery, academicYearId, semesterId);
  const unitResult = await unitQuery;
  if (unitResult.error) return ownResult;

  return { data: mergeRows(ownResult.data || [], unitResult.data || []), error: null };
}
