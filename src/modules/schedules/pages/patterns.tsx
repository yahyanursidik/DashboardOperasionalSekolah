/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { canReceiveAcademicAssignment } from "../../employees/employee-role-config";
import { useClassSubjectOptions } from "../use-class-subject-options";
import {
  daysOfWeek,
  formatTime,
  getScheduleSubjectName,
  getScheduleVisual,
  hasTimeOverlap,
  isParallelTeachingAssignment,
  workWeekDays,
} from "../schedule-utils";

type PatternMode = "unit" | "classes" | "preschool";
type PatternRow = { id: string; classId: string; employeeId: string; subjectId: string; subjectName: string };
type ScheduleSchemaMode = "checking" | "extended" | "legacy";
type UnitRecord = { id: string; name: string; education_level?: string | null; is_active?: boolean | null };
type ClassRecord = { id: string; name: string; grade_level?: number | null; level?: number | null; unit_id?: string | null; homeroom_teacher_id?: string | null };
type EmployeeRecord = { id: string; full_name: string; position?: string | null; unit_id?: string | null; status?: string | null };
type ScheduleRecord = {
  id: string;
  employee_id?: string | null;
  class_id?: string | null;
  subject_id?: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  schedule_type?: string | null;
  schedule_scope?: string | null;
  schedule_kind?: string | null;
  activity_name?: string | null;
  subject?: string | null;
  classes?: { id?: string; name?: string; grade_level?: number | null } | null;
  subjects?: { id?: string; name?: string } | null;
  employees?: { id?: string; full_name?: string; position?: string | null } | null;
};

const activityKinds = [
  { value: "unit_activity", label: "Kegiatan bersama unit" },
  { value: "worship", label: "Ibadah / salat berjamaah" },
  { value: "assembly", label: "Assembly / apel" },
  { value: "preschool_activity", label: "Kegiatan belajar Preschool" },
  { value: "play", label: "Bermain / kegiatan luar" },
  { value: "meal", label: "Makan bersama" },
  { value: "break", label: "Istirahat" },
  { value: "other", label: "Kegiatan lainnya" },
];

const preschoolPresets = ["Penyambutan", "Circle Time", "Tahfidz & Doa", "Kegiatan Sentra", "Bermain Luar", "Makan Bersama", "Istirahat", "Refleksi & Penutup"];
const unitPresets = ["Tahfidz Serentak", "Literasi Pagi", "Assembly", "Salat Dhuha", "Salat Zuhur Berjamaah", "Kegiatan Projek", "Pembinaan Karakter"];

function newRow(): PatternRow {
  return { id: crypto.randomUUID(), classId: "", employeeId: "", subjectId: "", subjectName: "" };
}

function isMissingColumnError(error: unknown, columns: string[]) {
  const message = String((error as { message?: string } | null)?.message || error || "").toLowerCase();
  return columns.some((column) => message.includes(column.toLowerCase()));
}

function toLegacySchedulePayload(row: Record<string, unknown>) {
  const next = { ...row };
  ["schedule_scope", "schedule_kind", "schedule_group_id", "activity_name", "is_synchronized", "assignment_id"]
    .forEach((column) => delete next[column]);
  return next;
}

function inferEducationLevel(unitName: string) {
  const normalized = unitName.toLowerCase();
  if (/preschool|paud|\btk\b|kelompok bermain|\bkb\b/.test(normalized)) return "preschool";
  if (/elementary|sekolah dasar|\bsd\b/.test(normalized)) return "elementary";
  return null;
}

function durationInMinutes(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(":").map(Number);
  return Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute));
}

function scheduleIdentity(schedule: ScheduleRecord) {
  return [
    schedule.day_of_week,
    schedule.start_time,
    schedule.end_time,
    schedule.subject_id || schedule.subjects?.id || getScheduleSubjectName(schedule),
  ].join(":");
}

function ClassPatternRow({
  row,
  classes,
  employees,
  academicYearId,
  semesterId,
  onChange,
  onRemove,
}: {
  row: PatternRow;
  classes: ClassRecord[];
  employees: EmployeeRecord[];
  academicYearId?: string | null;
  semesterId?: string | null;
  onChange: (next: PatternRow) => void;
  onRemove: () => void;
}) {
  const { options, isLoading, message } = useClassSubjectOptions({
    classId: row.classId,
    employeeId: row.employeeId,
    academicYearId,
    semesterId,
  });

  useEffect(() => {
    if (row.subjectId && !options.some((option) => option.value === row.subjectId && option.assigned)) {
      onChange({ ...row, subjectId: "", subjectName: "" });
    }
  }, [options, row, onChange]);

  return (
    <div className="grid gap-3 border-b py-4 last:border-0 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
      <label className="text-xs font-semibold text-muted-foreground">Kelas
        <select value={row.classId} onChange={(event) => onChange({ ...row, classId: event.target.value, subjectId: "", subjectName: "" })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-medium text-foreground">
          <option value="">Pilih kelas</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Guru pengampu
        <select value={row.employeeId} onChange={(event) => onChange({ ...row, employeeId: event.target.value, subjectId: "", subjectName: "" })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-medium text-foreground">
          <option value="">Pilih guru</option>
          {employees.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Mata pelajaran
        <select value={row.subjectId} disabled={!row.classId || !row.employeeId || isLoading} onChange={(event) => { const subject = options.find((option) => option.value === event.target.value); onChange({ ...row, subjectId: event.target.value, subjectName: subject?.label || "" }); }} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-medium text-foreground disabled:bg-muted">
          <option value="">{isLoading ? "Memuat mapel..." : "Pilih mata pelajaran"}</option>
          {options.map((option) => <option key={option.value} value={option.value} disabled={!option.assigned}>{option.label}{option.assigned ? "" : " - belum ditugaskan"}</option>)}
        </select>
        <span className="mt-1 block text-[10px] font-normal leading-4">{message}</span>
      </label>
      <button type="button" onClick={onRemove} title="Hapus baris" className="mt-5 flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

export const UnitSchedulePatterns: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [unitId, setUnitId] = useState(activeUnitId || "");
  const [mode, setMode] = useState<PatternMode>("unit");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Senin"]);
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("08:00");
  const [activityName, setActivityName] = useState("Tahfidz Serentak");
  const [activityKind, setActivityKind] = useState("unit_activity");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [rows, setRows] = useState<PatternRow[]>([newRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [referenceError, setReferenceError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [schemaMode, setSchemaMode] = useState<ScheduleSchemaMode>("checking");
  const [activeSchedules, setActiveSchedules] = useState<ScheduleRecord[]>([]);
  const [overviewClassId, setOverviewClassId] = useState("");
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoadingUnits(true);
    setReferenceError("");

    const loadUnits = async () => {
      const enhancedResult = await supabaseClient
        .from("units")
        .select("id,name,education_level,is_active")
        .eq("is_active", true)
        .order("sort_order") as any;
      if (!enhancedResult.error) return (enhancedResult.data || []) as UnitRecord[];

      const legacyResult = await supabaseClient.from("units").select("id,name").order("name") as any;
      if (legacyResult.error) throw legacyResult.error;
      return (legacyResult.data || []).map((unit: UnitRecord) => ({ ...unit, education_level: inferEducationLevel(unit.name), is_active: true }));
    };

    const detectScheduleSchema = async () => {
      const result = await supabaseClient
        .from("employee_schedules")
        .select("schedule_scope,schedule_kind,activity_name,schedule_group_id,is_synchronized")
        .limit(1) as any;
      if (!active) return;
      setSchemaMode(result.error ? "legacy" : "extended");
    };

    void Promise.all([loadUnits(), detectScheduleSchema()])
      .then(([unitRows]) => {
        if (!active) return;
        setUnits(unitRows);
      })
      .catch((error) => {
        if (active) setReferenceError(String(error?.message || "Unit sekolah gagal dimuat."));
      })
      .finally(() => {
        if (active) setIsLoadingUnits(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    if (!unitId && activeUnitId && units.some((unit) => unit.id === activeUnitId)) setUnitId(activeUnitId);
  }, [activeUnitId, unitId, units]);

  useEffect(() => {
    let active = true;
    if (!unitId || !activeYearId) {
      setClasses([]);
      setEmployees([]);
      return () => { active = false; };
    }

    setIsLoadingReferences(true);
    setReferenceError("");
    const loadClasses = async () => {
      const enhancedResult = await supabaseClient
        .from("classes")
        .select("id,name,grade_level,level,unit_id,homeroom_teacher_id")
        .eq("unit_id", unitId)
        .eq("academic_year_id", activeYearId)
        .order("name") as any;
      if (!enhancedResult.error) return (enhancedResult.data || []) as ClassRecord[];

      const legacyResult = await supabaseClient
        .from("classes")
        .select("id,name,grade_level,unit_id")
        .eq("unit_id", unitId)
        .eq("academic_year_id", activeYearId)
        .order("name") as any;
      if (legacyResult.error) throw legacyResult.error;
      return (legacyResult.data || []) as ClassRecord[];
    };

    const loadEmployees = async () => {
      let homeResult = await supabaseClient
        .from("employees")
        .select("id,full_name,position,unit_id,status")
        .eq("unit_id", unitId)
        .eq("status", "active")
        .order("full_name") as any;
      if (homeResult.error && isMissingColumnError(homeResult.error, ["status"])) {
        homeResult = await supabaseClient
          .from("employees")
          .select("id,full_name,position,unit_id")
          .eq("unit_id", unitId)
          .order("full_name") as any;
      }
      if (homeResult.error) throw homeResult.error;

      const employeeMap = new Map<string, EmployeeRecord>();
      (homeResult.data || []).forEach((employee: EmployeeRecord) => employeeMap.set(employee.id, employee));

      let assignmentQuery = supabaseClient
        .from("teacher_assignments")
        .select("employee_id,class_id,role_type")
        .eq("unit_id", unitId)
        .eq("academic_year_id", activeYearId)
        .eq("is_active", true);
      if (activeSemesterId) assignmentQuery = assignmentQuery.eq("semester_id", activeSemesterId);
      const assignmentResult = await assignmentQuery as any;
      const assignedIds = Array.from(new Set((assignmentResult.data || []).map((assignment: any) => assignment.employee_id).filter(Boolean))) as string[];
      const missingIds = assignedIds.filter((id) => !employeeMap.has(id));
      if (!assignmentResult.error && missingIds.length > 0) {
        const assignedEmployees = await supabaseClient
          .from("employees")
          .select("id,full_name,position,unit_id,status")
          .in("id", missingIds) as any;
        if (!assignedEmployees.error) (assignedEmployees.data || []).forEach((employee: EmployeeRecord) => employeeMap.set(employee.id, employee));
      }
      const homeroomByClass = new Map<string, string>();
      (assignmentResult.data || []).forEach((assignment: any) => {
        if (assignment.class_id && ["homeroom", "wali_kelas"].includes(assignment.role_type)) {
          homeroomByClass.set(assignment.class_id, assignment.employee_id);
        }
      });
      return {
        rows: Array.from(employeeMap.values())
          .filter((employee) => employee.status !== "inactive" && canReceiveAcademicAssignment(employee.position))
          .sort((first, second) => first.full_name.localeCompare(second.full_name, "id")),
        homeroomByClass,
      };
    };

    void Promise.all([loadClasses(), loadEmployees()])
      .then(([classRows, employeeResult]) => {
        if (!active) return;
        setClasses(classRows.map((classRecord) => ({
          ...classRecord,
          homeroom_teacher_id: classRecord.homeroom_teacher_id || employeeResult.homeroomByClass.get(classRecord.id) || null,
        })));
        setEmployees(employeeResult.rows);
      })
      .catch((error) => {
        if (!active) return;
        setClasses([]);
        setEmployees([]);
        setReferenceError(String(error?.message || "Kelas dan pegawai gagal dimuat."));
      })
      .finally(() => {
        if (active) setIsLoadingReferences(false);
      });
    return () => { active = false; };
  }, [activeSemesterId, activeYearId, reloadKey, unitId]);

  useEffect(() => {
    let active = true;
    if (!unitId || !activeYearId || !activeSemesterId) {
      setActiveSchedules([]);
      setScheduleError("");
      return () => { active = false; };
    }

    setIsLoadingSchedules(true);
    setScheduleError("");
    const loadSchedules = async () => {
      const extendedResult = await supabaseClient
        .from("employee_schedules")
        .select("id,employee_id,class_id,subject_id,day_of_week,start_time,end_time,schedule_type,schedule_scope,schedule_kind,activity_name,subject,classes(id,name,grade_level),subjects(id,name),employees(id,full_name,position)")
        .eq("unit_id", unitId)
        .eq("academic_year_id", activeYearId)
        .eq("semester_id", activeSemesterId)
        .eq("schedule_type", "mengajar")
        .order("start_time") as any;
      if (!extendedResult.error) return (extendedResult.data || []) as ScheduleRecord[];

      const legacyResult = await supabaseClient
        .from("employee_schedules")
        .select("id,employee_id,class_id,subject_id,day_of_week,start_time,end_time,schedule_type,subject,classes(id,name,grade_level),subjects(id,name),employees(id,full_name,position)")
        .eq("unit_id", unitId)
        .eq("academic_year_id", activeYearId)
        .eq("semester_id", activeSemesterId)
        .eq("schedule_type", "mengajar")
        .order("start_time") as any;
      if (legacyResult.error) throw legacyResult.error;
      return (legacyResult.data || []) as ScheduleRecord[];
    };

    void loadSchedules()
      .then((scheduleRows) => {
        if (!active) return;
        setActiveSchedules(scheduleRows);
      })
      .catch((error) => {
        if (!active) return;
        setActiveSchedules([]);
        setScheduleError(String(error?.message || "Jadwal aktif belum dapat dimuat."));
      })
      .finally(() => {
        if (active) setIsLoadingSchedules(false);
      });
    return () => { active = false; };
  }, [activeSemesterId, activeYearId, reloadKey, unitId]);

  useEffect(() => {
    if (classes.length === 0) {
      setOverviewClassId("");
      return;
    }
    if (!classes.some((item) => item.id === overviewClassId)) {
      const firstScheduledClass = classes.find((item) => activeSchedules.some((schedule) => schedule.class_id === item.id));
      setOverviewClassId(firstScheduledClass?.id || classes[0].id);
    }
  }, [activeSchedules, classes, overviewClassId]);

  const selectedUnit = units.find((unit) => unit.id === unitId);
  const isPreschoolUnit = selectedUnit?.education_level === "preschool";
  const selectedClasses = classes.filter((item) => selectedClassIds.includes(item.id));
  const preschoolReady = selectedClasses.filter((item) => item.homeroom_teacher_id || coordinatorId).length;
  const patternCount = mode === "unit" ? selectedDays.length : mode === "classes" ? selectedDays.length * rows.length : selectedDays.length * selectedClasses.length;
  const presets = mode === "preschool" ? preschoolPresets : unitPresets;
  const classSummaries = useMemo(() => classes.map((classRecord) => {
    const schedules = activeSchedules.filter((schedule) => schedule.class_id === classRecord.id);
    const uniqueBlocks = Array.from(new Map(schedules.map((schedule) => [scheduleIdentity(schedule), schedule])).values());
    return {
      ...classRecord,
      blockCount: uniqueBlocks.length,
      subjectCount: new Set(uniqueBlocks.map((schedule) => schedule.subject_id || getScheduleSubjectName(schedule))).size,
      teacherCount: new Set(schedules.map((schedule) => schedule.employee_id).filter(Boolean)).size,
      lessonHours: Math.round(uniqueBlocks.reduce((total, schedule) => total + durationInMinutes(schedule.start_time, schedule.end_time), 0) / 35),
    };
  }), [activeSchedules, classes]);
  const overviewClass = classes.find((item) => item.id === overviewClassId);
  const overviewSchedules = useMemo(
    () => activeSchedules.filter((schedule) => schedule.class_id === overviewClassId || schedule.schedule_scope === "unit"),
    [activeSchedules, overviewClassId],
  );
  const overviewBlocks = useMemo(() => {
    const grouped = new Map<string, { schedule: ScheduleRecord; teachers: string[] }>();
    overviewSchedules.forEach((schedule) => {
      const key = scheduleIdentity(schedule);
      const current = grouped.get(key) || { schedule, teachers: [] };
      const teacherName = schedule.employees?.full_name;
      if (teacherName && !current.teachers.includes(teacherName)) current.teachers.push(teacherName);
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((first, second) => {
      const dayDifference = daysOfWeek.indexOf(first.schedule.day_of_week) - daysOfWeek.indexOf(second.schedule.day_of_week);
      return dayDifference || first.schedule.start_time.localeCompare(second.schedule.start_time);
    });
  }, [overviewSchedules]);
  const activeTeachingTeam = useMemo(() => {
    const team = new Map<string, { id: string; name: string; position: string; subjects: Set<string>; minutes: number }>();
    overviewSchedules.forEach((schedule) => {
      if (!schedule.employee_id || !schedule.employees?.full_name) return;
      const current = team.get(schedule.employee_id) || {
        id: schedule.employee_id,
        name: schedule.employees.full_name,
        position: schedule.employees.position || "Guru / Pengajar",
        subjects: new Set<string>(),
        minutes: 0,
      };
      current.subjects.add(getScheduleSubjectName(schedule));
      current.minutes += durationInMinutes(schedule.start_time, schedule.end_time);
      team.set(schedule.employee_id, current);
    });
    return Array.from(team.values()).sort((first, second) => first.name.localeCompare(second.name, "id"));
  }, [overviewSchedules]);

  const toggleDay = (day: string) => setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : daysOfWeek.filter((item) => [...current, day].includes(item)));
  const updateRow = (id: string, next: PatternRow) => setRows((current) => current.map((row) => row.id === id ? next : row));
  const changeMode = (nextMode: PatternMode) => {
    setMode(nextMode);
    if (nextMode === "preschool") {
      setActivityKind("preschool_activity");
      setActivityName("Penyambutan");
      return;
    }
    if (nextMode === "unit") {
      setActivityKind("unit_activity");
      if (preschoolPresets.includes(activityName)) setActivityName("Tahfidz Serentak");
    }
  };

  const validate = () => {
    if (!unitId) return "Pilih unit sekolah.";
    if (!activeYearId || !activeSemesterId) return "Tahun ajaran dan semester aktif harus dipilih.";
    if (selectedDays.length === 0) return "Pilih minimal satu hari.";
    if (!startTime || !endTime || startTime >= endTime) return "Jam selesai harus lebih besar dari jam mulai.";
    if (mode === "unit" && (!activityName.trim() || !coordinatorId)) return "Nama kegiatan dan penanggung jawab wajib diisi.";
    if (mode === "classes" && (rows.length === 0 || rows.some((row) => !row.classId || !row.employeeId || !row.subjectId))) return "Lengkapi kelas, guru, dan mata pelajaran pada setiap baris.";
    if (mode === "preschool" && !isPreschoolUnit) return "Pola Preschool hanya dapat dibuat pada unit dengan jenjang Preschool.";
    if (mode === "preschool" && (!activityName.trim() || selectedClasses.length === 0)) return "Pilih kegiatan dan minimal satu kelompok Preschool.";
    if (mode === "preschool" && preschoolReady !== selectedClasses.length) return "Setiap kelompok harus mempunyai wali kelas atau gunakan penanggung jawab pengganti.";
    return "";
  };

  const savePattern = async () => {
    const validationMessage = validate();
    if (validationMessage) return toast.error("Pola jadwal belum lengkap", { description: validationMessage });
    setIsSaving(true);
    const groupId = crypto.randomUUID();

    try {
      const assignmentMap = new Map<string, string>();
      if (mode === "classes") {
        const { data: assignments, error } = await supabaseClient
          .from("teacher_assignments")
          .select("id,employee_id,class_id,subject_id")
          .eq("unit_id", unitId)
          .eq("academic_year_id", activeYearId!)
          .eq("semester_id", activeSemesterId!)
          .eq("is_active", true);
        if (error) throw error;
        (assignments || []).forEach((assignment: any) => assignmentMap.set(`${assignment.employee_id}:${assignment.class_id}:${assignment.subject_id}`, assignment.id));
        const missing = rows.find((row) => !assignmentMap.has(`${row.employeeId}:${row.classId}:${row.subjectId}`));
        if (missing) throw new Error("Salah satu guru belum memiliki penugasan aktif untuk kelas dan mata pelajaran yang dipilih.");
      }

      const base = {
        academic_year_id: activeYearId,
        semester_id: activeSemesterId,
        unit_id: unitId,
        schedule_type: "mengajar",
        start_time: startTime,
        end_time: endTime,
        ...(schemaMode === "extended" ? { schedule_group_id: groupId } : {}),
      };
      const payload: any[] = [];
      selectedDays.forEach((day) => {
        if (mode === "unit") {
          payload.push({ ...base, day_of_week: day, employee_id: coordinatorId, class_id: null, subject_id: null, subject: activityName.trim(), ...(schemaMode === "extended" ? { activity_name: activityName.trim(), schedule_scope: "unit", schedule_kind: activityKind, is_synchronized: true } : {}) });
        } else if (mode === "classes") {
          rows.forEach((row) => payload.push({ ...base, day_of_week: day, employee_id: row.employeeId, class_id: row.classId, subject_id: row.subjectId, subject: row.subjectName, ...(schemaMode === "extended" ? { activity_name: null, assignment_id: assignmentMap.get(`${row.employeeId}:${row.classId}:${row.subjectId}`), schedule_scope: "class", schedule_kind: "subject", is_synchronized: rows.length > 1 } : {}) }));
        } else {
          selectedClasses.forEach((classRecord) => payload.push({ ...base, day_of_week: day, employee_id: classRecord.homeroom_teacher_id || coordinatorId, class_id: classRecord.id, subject_id: null, subject: activityName.trim(), ...(schemaMode === "extended" ? { activity_name: activityName.trim(), schedule_scope: "class", schedule_kind: activityKind === "unit_activity" ? "preschool_activity" : activityKind, is_synchronized: selectedClasses.length > 1 } : {}) }));
        }
      });

      const conflictColumns = schemaMode === "extended"
        ? "id,employee_id,class_id,subject_id,day_of_week,start_time,end_time,schedule_type,schedule_scope,activity_name,subject"
        : "id,employee_id,class_id,subject_id,day_of_week,start_time,end_time,schedule_type,subject";
      const { data: existing, error: conflictError } = await supabaseClient
        .from("employee_schedules")
        .select(conflictColumns)
        .eq("unit_id", unitId)
        .eq("academic_year_id", activeYearId!)
        .eq("semester_id", activeSemesterId!)
        .in("day_of_week", selectedDays);
      if (conflictError) throw conflictError;

      const combined = [...(existing || []), ...payload];
      for (let index = 0; index < combined.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < combined.length; nextIndex += 1) {
          const first: any = combined[index];
          const second: any = combined[nextIndex];
          if (first.day_of_week !== second.day_of_week || !hasTimeOverlap(first.start_time, first.end_time, second.start_time, second.end_time)) continue;
          const bothNewPreschoolRows = mode === "preschool" && index >= (existing || []).length;
          const sameEmployee = !bothNewPreschoolRows && first.employee_id && first.employee_id === second.employee_id;
          const sameClass = first.class_id && first.class_id === second.class_id;
          const parallelTeaching = isParallelTeachingAssignment(first, second);
          const firstIsUnitWide = first.schedule_scope === "unit" || (first.schedule_type === "mengajar" && !first.class_id);
          const secondIsUnitWide = second.schedule_scope === "unit" || (second.schedule_type === "mengajar" && !second.class_id);
          const unitBlocksLearning = first.schedule_type === "mengajar" && second.schedule_type === "mengajar" && (firstIsUnitWide || secondIsUnitWide);
          if (sameEmployee || (!parallelTeaching && sameClass) || unitBlocksLearning) {
            throw new Error(`Bentrok ${first.day_of_week} ${formatTime(first.start_time)}-${formatTime(first.end_time)} dengan ${first.activity_name || first.subject || "jadwal yang sudah ada"}.`);
          }
        }
      }

      let { error } = await supabaseClient.from("employee_schedules").insert(payload);
      if (error && schemaMode === "extended" && isMissingColumnError(error, ["schedule_scope", "schedule_kind", "schedule_group_id", "activity_name", "is_synchronized", "assignment_id"])) {
        setSchemaMode("legacy");
        const legacyPayload = payload.map(toLegacySchedulePayload);
        ({ error } = await supabaseClient.from("employee_schedules").insert(legacyPayload));
      }
      if (error) throw error;
      toast.success(`${payload.length} jadwal berhasil dibuat`, { description: "Pola langsung tersedia di portal terkait pada periode aktif." });
      navigate("/schedules");
    } catch (error: any) {
      const message = String(error?.message || error || "Pola jadwal gagal disimpan.");
      toast.error("Pola jadwal belum dapat disimpan", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pola Jadwal Unit" description="Susun kegiatan serentak, mapel berbeda per kelas, dan ritme pembelajaran khusus Preschool." action={<Link to="/schedules" className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Kembali</Link>} />

      {referenceError && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">Data acuan belum dapat dimuat</p><p className="mt-1 text-xs leading-5">{referenceError}</p></div></div>
          <button type="button" onClick={() => setReloadKey((current) => current + 1)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-3 text-xs font-bold"><RefreshCw className="h-4 w-4" /> Muat ulang</button>
        </div>
      )}

      {schemaMode === "legacy" && !referenceError && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
          Mode kompatibilitas aktif. Semua pola tetap dapat disimpan dan dibaca portal; metadata pengelompokan lanjutan akan dipakai otomatis setelah migrasi database tersedia.
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Jadwal pelajaran aktif</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih kelas untuk melihat jadwal mingguan dan tim pengajar pada periode aktif.</p>
          </div>
          <Link to="/schedules" className="inline-flex h-9 items-center gap-2 self-start rounded-md border bg-card px-3 text-xs font-bold text-primary">
            <CalendarDays className="h-4 w-4" /> Kelola seluruh jadwal
          </Link>
        </div>

        {scheduleError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <span>{scheduleError}</span>
            <button type="button" onClick={() => setReloadKey((current) => current + 1)} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-red-300 bg-white px-3 text-xs font-bold">
              <RefreshCw className="h-4 w-4" /> Muat ulang
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {classSummaries.map((classRecord) => {
            const selected = overviewClassId === classRecord.id;
            return (
              <button
                key={classRecord.id}
                type="button"
                onClick={() => setOverviewClassId(classRecord.id)}
                className={`min-h-32 rounded-lg border p-4 text-left shadow-sm transition ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${selected ? "bg-primary text-primary-foreground" : "bg-blue-50 text-blue-700"}`}>
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${classRecord.blockCount ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {classRecord.blockCount ? "AKTIF" : "BELUM ADA"}
                  </span>
                </div>
                <p className="mt-3 font-bold">{classRecord.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {classRecord.blockCount} slot · {classRecord.subjectCount} mapel · {classRecord.teacherCount} pengajar
                </p>
              </button>
            );
          })}
          {!isLoadingReferences && unitId && classSummaries.length === 0 && (
            <div className="rounded-lg border border-dashed bg-card p-5 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">Belum ada kelas pada unit dan tahun ajaran aktif.</div>
          )}
        </div>

        {isLoadingSchedules ? (
          <div className="flex min-h-44 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat jadwal pelajaran aktif...
          </div>
        ) : overviewClass && (
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold">Jadwal Mingguan {overviewClass.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Slot paralel ditampilkan sekali; seluruh pengajar kelompok tetap tercantum.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-blue-700">{overviewBlocks.length} slot</span>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-700">{activeTeachingTeam.length} pengajar</span>
                  <span className="rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-800">{classSummaries.find((item) => item.id === overviewClassId)?.lessonHours || 0} JP</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-[900px] grid-cols-5 divide-x">
                  {workWeekDays.map((day) => {
                    const blocks = overviewBlocks.filter((item) => item.schedule.day_of_week === day);
                    return (
                      <div key={day} className="min-h-64 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <strong className="text-sm">{day}</strong>
                          <span className="text-[10px] font-bold text-muted-foreground">{blocks.length} SLOT</span>
                        </div>
                        <div className="space-y-2">
                          {blocks.map(({ schedule, teachers }) => {
                            const visual = getScheduleVisual(schedule, "lesson");
                            return (
                              <div key={scheduleIdentity(schedule)} className={`relative overflow-hidden rounded-md border p-3 pl-4 ${visual.border} ${visual.background}`}>
                                <span className={`absolute inset-y-0 left-0 w-1 ${visual.accent}`} />
                                <p className={`text-[11px] font-bold ${visual.text}`}>{formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}</p>
                                <p className="mt-1 text-sm font-bold leading-5">{getScheduleSubjectName(schedule)}</p>
                                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{teachers.join(" · ") || "Pengajar belum ditautkan"}</p>
                              </div>
                            );
                          })}
                          {blocks.length === 0 && <p className="rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground">Belum ada jadwal</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-bold">Tim Pengajar Aktif</h3>
                  <p className="text-xs text-muted-foreground">{overviewClass.name} · periode aktif</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {activeTeachingTeam.map((teacher) => (
                  <div key={teacher.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><UserRound className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{teacher.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{teacher.position}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-bold">{Math.round(teacher.minutes / 35)} JP</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from(teacher.subjects).map((subject) => <span key={subject} className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-semibold text-primary">{subject}</span>)}
                    </div>
                  </div>
                ))}
                {activeTeachingTeam.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Belum ada tim pengajar pada jadwal kelas ini.</p>}
              </div>
            </aside>
          </div>
        )}
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Unit sekolah
                <select value={unitId} disabled={isLoadingUnits} onChange={(event) => { setUnitId(event.target.value); setClasses([]); setEmployees([]); setSelectedClassIds([]); setRows([newRow()]); }} className="mt-1 h-11 w-full rounded-md border bg-background px-3 font-medium disabled:bg-muted">
                  <option value="">{isLoadingUnits ? "Memuat unit..." : "Pilih unit"}</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                </select>
              </label>
              <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground">Jenjang unit</p><p className="mt-1 font-bold">{selectedUnit?.education_level === "preschool" ? "Preschool" : selectedUnit?.education_level === "elementary" ? "Elementary" : selectedUnit?.education_level || "Belum dikonfigurasi"}</p></div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-bold">Pilih pola</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { value: "unit", title: "Serentak Satu Unit", description: "Satu kegiatan terlihat oleh seluruh kelas", icon: Building2 },
                { value: "classes", title: "Berbeda per Kelas", description: "Mapel dan guru berbeda pada slot yang sama", icon: BookOpen },
                { value: "preschool", title: "Ritme Preschool", description: "Kegiatan sentra dan rutinitas kelompok", icon: Sparkles },
              ].map((item) => <button key={item.value} type="button" onClick={() => changeMode(item.value as PatternMode)} className={`min-h-28 rounded-md border p-4 text-left transition ${mode === item.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"}`}><item.icon className={`h-5 w-5 ${mode === item.value ? "text-primary" : "text-muted-foreground"}`} /><p className="mt-3 text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></button>)}
            </div>
            {mode === "preschool" && unitId && !isPreschoolUnit && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Unit ini belum dikonfigurasi sebagai Preschool pada Master Data Unit.</p>}
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2"><p className="text-sm font-bold">Hari berlaku</p><div className="mt-2 flex flex-wrap gap-2">{daysOfWeek.map((day) => <button key={day} type="button" onClick={() => toggleDay(day)} className={`h-9 rounded-md border px-3 text-xs font-bold ${selectedDays.includes(day) ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>{day}</button>)}</div><button type="button" onClick={() => setSelectedDays(workWeekDays)} className="mt-2 text-xs font-semibold text-primary">Pilih Senin-Jumat</button></div>
              <label className="text-sm font-semibold">Jam mulai<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
              <label className="text-sm font-semibold">Jam selesai<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
            </div>
          </section>

          {mode === "classes" ? (
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Pembagian kelas pada slot ini</h2><p className="mt-1 text-xs text-muted-foreground">Setiap baris dapat memakai guru dan mata pelajaran berbeda.</p></div><button type="button" onClick={() => setRows((current) => [...current, newRow()])} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold"><Plus className="h-4 w-4" /> Tambah kelas</button></div>
              {isLoadingReferences ? <div className="flex min-h-28 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memuat kelas dan guru...</div> : <div className="mt-3">{rows.map((row) => <ClassPatternRow key={row.id} row={row} classes={classes} employees={employees} academicYearId={activeYearId} semesterId={activeSemesterId} onChange={(next) => updateRow(row.id, next)} onRemove={() => setRows((current) => current.filter((item) => item.id !== row.id))} />)}{unitId && classes.length === 0 && !referenceError && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Belum ada kelas pada unit dan tahun ajaran aktif.</p>}</div>}
            </section>
          ) : (
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-semibold">Nama kegiatan<input list="activity-presets" value={activityName} onChange={(event) => setActivityName(event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3" placeholder="Contoh: Tahfidz Serentak" /><datalist id="activity-presets">{presets.map((preset) => <option key={preset} value={preset} />)}</datalist></label>
                <label className="text-sm font-semibold">Jenis kegiatan<select value={activityKind} onChange={(event) => setActivityKind(event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3">{activityKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="text-sm font-semibold md:col-span-2">{mode === "unit" ? "Penanggung jawab kegiatan" : "Penanggung jawab pengganti (opsional)"}<select value={coordinatorId} onChange={(event) => setCoordinatorId(event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3"><option value="">{mode === "unit" ? "Pilih penanggung jawab" : "Gunakan wali kelas masing-masing"}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></label>
              </div>
              {mode === "preschool" && <div className="mt-5"><p className="text-sm font-bold">Kelompok sasaran</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{classes.map((classRecord) => { const checked = selectedClassIds.includes(classRecord.id); return <label key={classRecord.id} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${checked ? "border-primary bg-primary/5" : "bg-background"}`}><span><strong>{classRecord.name}</strong><span className="mt-0.5 block text-[10px] text-muted-foreground">{classRecord.homeroom_teacher_id ? "Wali kelas siap" : coordinatorId ? "Memakai penanggung jawab pengganti" : "Wali kelas belum diisi"}</span></span><input type="checkbox" checked={checked} onChange={() => setSelectedClassIds((current) => checked ? current.filter((id) => id !== classRecord.id) : [...current, classRecord.id])} className="h-4 w-4 accent-primary" /></label>; })}</div></div>}
            </section>
          )}
        </div>

        <aside className="space-y-4 2xl:sticky 2xl:top-20 2xl:self-start">
          <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5 text-primary" /> Ringkasan pola</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Unit</span><strong>{selectedUnit?.name || "-"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Hari</span><strong>{selectedDays.length}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Slot</span><strong>{startTime}-{endTime}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Jadwal dibuat</span><strong>{patternCount}</strong></div></div></section>
          <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="font-bold">Kesiapan</h2><div className="mt-3 space-y-2 text-xs">{[
            ["Periode akademik aktif", Boolean(activeYearId && activeSemesterId)],
            ["Unit dan hari dipilih", Boolean(unitId && selectedDays.length)],
            ["Rentang waktu valid", Boolean(startTime && endTime && startTime < endTime)],
            [mode === "classes" ? "Pembagian kelas lengkap" : mode === "preschool" ? "Kelompok dan wali siap" : "Kegiatan dan PIC lengkap", !validate()],
          ].map(([label, done]) => <div key={String(label)} className="flex items-center gap-2"><CheckCircle2 className={`h-4 w-4 ${done ? "text-emerald-600" : "text-muted-foreground/40"}`} /><span className={done ? "font-medium" : "text-muted-foreground"}>{label}</span></div>)}</div></section>
           <button type="button" onClick={() => void savePattern()} disabled={isSaving || isLoadingUnits || isLoadingReferences || schemaMode === "checking"} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{isSaving || schemaMode === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? "Menyimpan..." : schemaMode === "checking" ? "Memeriksa sistem..." : `Simpan ${patternCount || ""} Jadwal`}</button>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><div className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" /><p>Kegiatan unit akan muncul pada semua portal siswa dan guru di unit. Jadwal kelas hanya muncul pada kelas dan guru terkait.</p></div></div>
        </aside>
      </div>
    </div>
  );
};
