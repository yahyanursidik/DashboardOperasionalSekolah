/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useList } from "@/lib/refine-compat";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { isPaudUnit, type PaudLearningMode } from "./paud-config";

export type PaudModeFilter = "all" | PaudLearningMode;

export type PaudUnit = { id: string; name: string; education_level: string | null; delivery_mode: PaudLearningMode };
export type PaudClass = { id: string; name: string; unit_id: string; grade_level: number | null; homeroom_teacher_id: string | null };
export type PaudStudent = {
  id: string;
  full_name: string;
  nickname: string | null;
  nis: string | null;
  nisn: string | null;
  gender: string | null;
  date_of_birth: string | null;
  class_id: string | null;
  unit_id: string | null;
};

/**
 * KB/TK scope for the admin PAUD pages: only preschool units (regular and online HBL), never
 * Elementary. When the active unit is a PAUD unit the scope narrows to it; otherwise every PAUD
 * unit is included, further filtered by learning mode.
 */
export function usePaudScope(options: { withStudents?: boolean } = {}) {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [mode, setMode] = React.useState<PaudModeFilter>("all");

  const unitsQuery = useList({
    resource: "units",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "id,name,education_level,delivery_mode,is_active" },
  });
  const allPaudUnits = React.useMemo(
    () => ((unitsQuery.data?.data || []) as any[])
      .filter((unit) => unit.is_active !== false && isPaudUnit(unit))
      .map((unit) => ({ ...unit, delivery_mode: unit.delivery_mode === "online" ? "online" : "reguler" })) as PaudUnit[],
    [unitsQuery.data],
  );
  const activeIsPaud = allPaudUnits.some((unit) => unit.id === activeUnitId);
  const activeIsOtherLevel = Boolean(activeUnitId) && !activeIsPaud && !unitsQuery.isLoading;
  const units = React.useMemo(
    () => allPaudUnits
      .filter((unit) => !activeIsPaud || unit.id === activeUnitId)
      .filter((unit) => mode === "all" || unit.delivery_mode === mode),
    [activeIsPaud, activeUnitId, allPaudUnits, mode],
  );
  const unitIds = React.useMemo(() => units.map((unit) => unit.id), [units]);
  const hasUnits = unitIds.length > 0;

  const classesQuery = useList({
    resource: "classes",
    filters: [
      { field: "unit_id", operator: "in", value: unitIds },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: hasUnits },
    meta: { select: "id,name,unit_id,grade_level,homeroom_teacher_id" },
  });
  const classes = React.useMemo(() => (hasUnits ? classesQuery.data?.data || [] : []) as PaudClass[], [classesQuery.data, hasUnits]);

  const studentsQuery = useList({
    resource: "students",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "unit_id", operator: "in", value: unitIds },
    ],
    sorters: [{ field: "full_name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: hasUnits && options.withStudents !== false },
    meta: { select: "id,full_name,nickname,nis,nisn,gender,date_of_birth,class_id,unit_id" },
  });
  const students = (hasUnits ? studentsQuery.data?.data || [] : []) as PaudStudent[];

  const semesterQuery = useList({
    resource: "semesters",
    filters: activeSemesterId ? [{ field: "id", operator: "eq", value: activeSemesterId }] : [],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: Boolean(activeSemesterId) },
    meta: { select: "id,name,start_date,end_date,academic_year_id" },
  });
  const semester = (semesterQuery.data?.data?.[0] || null) as any;

  const unitById = React.useMemo(() => new Map(allPaudUnits.map((unit) => [unit.id, unit])), [allPaudUnits]);
  const classById = React.useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);

  return {
    mode,
    setMode,
    units,
    allPaudUnits,
    unitIds,
    unitById,
    classes,
    classById,
    students,
    semester,
    activeYearId,
    activeSemesterId,
    activeIsPaud,
    activeIsOtherLevel,
    hasOnlineUnit: allPaudUnits.some((unit) => unit.delivery_mode === "online"),
    isLoading: unitsQuery.isLoading || (hasUnits && (classesQuery.isLoading || (options.withStudents !== false && studentsQuery.isLoading))),
    isError: unitsQuery.isError || classesQuery.isError || studentsQuery.isError,
    /** The learning mode of a student, derived from the unit's delivery mode. */
    studentMode(student?: { unit_id?: string | null } | null): PaudLearningMode {
      return unitById.get(student?.unit_id || "")?.delivery_mode || "reguler";
    },
  };
}
