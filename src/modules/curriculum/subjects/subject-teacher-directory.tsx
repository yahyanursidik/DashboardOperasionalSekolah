import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  Filter,
  GraduationCap,
  Grid3x3,
  Layers3,
  ListFilter,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CurriculumSectionNav } from "../components/CurriculumSectionNav";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SD_PHASES } from "../subject-curriculums/sdCurriculumStructure";
import {
  getCurriculumCompletion,
  getCurriculumRecord,
  getPhaseReferenceRecord,
  getSemesterLearningPlanRows,
  getSemesterPlan,
  getSemesterRppmRows,
  getSubjectTargetGrades,
  getTeacherCoverage,
} from "../curriculum-utils";

type ViewMode = "grid" | "list";
type DirectoryFilter = "all" | "needs_teacher" | "needs_curriculum" | "ready";

const CATEGORY_CFG: Record<string, { color: string; bg: string }> = {
  Nasional: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  "Khas Sekolah": { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  Lainnya: { color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
  "from-cyan-500 to-sky-600",
];

function getInitials(name = "-") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(name = "-") {
  let hash = 0;
  for (const char of name) hash += char.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string | undefined | null): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    const key = getKey(item);
    if (key && !map.has(key)) map.set(key, item);
  });
  return [...map.values()];
}

function getSubjectMetrics(subject: any, assignments: any[], curriculums: any[], classes: any[], semesterId?: string | null) {
  const targetGrades = getSubjectTargetGrades(subject);
  const assignedGrades = new Set(
    targetGrades.filter((grade) => getTeacherCoverage(assignments, classes, subject, grade).complete),
  );
  const curriculumGrades = new Set(curriculums.map((record) => Number(record.grade_level)).filter(Boolean));
  const readyGrades = new Set(
    targetGrades.filter((grade) => {
      const record = getCurriculumRecord(curriculums, String(subject.id), grade);
      const phaseRecord = getPhaseReferenceRecord(curriculums, String(subject.id), grade);
      return getCurriculumCompletion(record, phaseRecord, semesterId).ready;
    }),
  );
  const missingTeacherGrades = targetGrades.filter((grade) => !assignedGrades.has(grade));
  const missingCurriculumGrades = targetGrades.filter((grade) => !curriculumGrades.has(grade));
  const uniqueTeachers = uniqueBy(assignments, (assignment) => assignment.employees?.id);

  return {
    targetGrades,
    uniqueTeachers,
    assignedGrades,
    curriculumGrades,
    readyGrades,
    missingTeacherGrades,
    missingCurriculumGrades,
    hasTeacherCoverage: missingTeacherGrades.length === 0 && targetGrades.length > 0,
    hasCurriculumCoverage: missingCurriculumGrades.length === 0 && targetGrades.length > 0,
    isReady:
      missingTeacherGrades.length === 0 &&
      missingCurriculumGrades.length === 0 &&
      readyGrades.size === targetGrades.length,
  };
}

const StatusPill: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${
      done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
    }`}
  >
    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
    {label}
  </span>
);

const TeacherAvatarStack: React.FC<{ assignments: any[] }> = ({ assignments }) => {
  const teachers = uniqueBy(assignments, (assignment) => assignment.employees?.id);
  if (teachers.length === 0) {
    return <span className="text-xs font-semibold text-amber-700">Belum ada guru</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {teachers.slice(0, 4).map((assignment: any) => {
          const name = assignment.employees?.full_name || "-";
          return (
            <div
              key={assignment.employees?.id}
              title={name}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br ${getAvatarColor(name)} text-[10px] font-bold text-white`}
            >
              {getInitials(name)}
            </div>
          );
        })}
        {teachers.length > 4 ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-muted-foreground">
            +{teachers.length - 4}
          </div>
        ) : null}
      </div>
      <span className="text-xs text-muted-foreground">{teachers.length} guru</span>
    </div>
  );
};

function SubjectCard({
  subject,
  assignments,
  curriculums,
  classes,
  semesterId,
  isSelected,
  onSelect,
}: {
  subject: any;
  assignments: any[];
  curriculums: any[];
  classes: any[];
  semesterId?: string | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const catKey = subject.category ?? "Lainnya";
  const cat = CATEGORY_CFG[catKey] ?? CATEGORY_CFG.Lainnya;
  const metrics = getSubjectMetrics(subject, assignments, curriculums, classes, semesterId);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex h-full flex-col rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md ${
        isSelected ? "border-primary ring-2 ring-primary/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${cat.bg}`}>
            <BookOpen className={`h-5 w-5 ${cat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight text-foreground">{subject.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subject.code || "Tanpa kode"}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{catKey}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {SD_PHASES.filter((phase) => phase.grades.some((grade) => metrics.targetGrades.includes(grade))).map((phase) => (
          <span key={phase.id} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {phase.label}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <TeacherAvatarStack assignments={assignments} />
        <div className="flex flex-wrap gap-2">
          <StatusPill done={metrics.missingTeacherGrades.length === 0} label={metrics.missingTeacherGrades.length === 0 ? "Guru lengkap" : `Guru kurang: K${metrics.missingTeacherGrades.join(", K")}`} />
          <StatusPill done={metrics.missingCurriculumGrades.length === 0} label={metrics.missingCurriculumGrades.length === 0 ? "Kurikulum lengkap" : `Kurikulum kurang: K${metrics.missingCurriculumGrades.join(", K")}`} />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>{metrics.curriculumGrades.size}/{metrics.targetGrades.length} kelas punya kurikulum</span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Detail <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function SubjectDetailPanel({
  subject,
  assignments,
  curriculums,
  classes,
  semesterId,
  onClose,
  onNavigateTeacher,
}: {
  subject: any;
  assignments: any[];
  curriculums: any[];
  classes: any[];
  semesterId?: string | null;
  onClose: () => void;
  onNavigateTeacher: (id: string) => void;
}) {
  const metrics = getSubjectMetrics(subject, assignments, curriculums, classes, semesterId);
  const teachers = metrics.uniqueTeachers;

  return (
    <aside className="sticky top-4 rounded-xl border bg-card shadow-sm">
      <div className="border-b p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detail Pengampu</p>
            <h2 className="mt-1 text-xl font-bold">{subject.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cek guru pengampu, kelas yang tertutup, dan kesiapan perangkat ajar.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <p className="text-xl font-bold">{teachers.length}</p>
            <p className="text-xs text-muted-foreground">Guru</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <p className="text-xl font-bold">{metrics.assignedGrades.size}</p>
            <p className="text-xs text-muted-foreground">Kelas</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-center">
            <p className="text-xl font-bold">{metrics.readyGrades.size}</p>
            <p className="text-xs text-muted-foreground">Siap</p>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-5">
        <div className="space-y-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Users className="h-4 w-4 text-primary" />
              Guru Pengampu
            </h3>
            {teachers.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-amber-50/40 p-4 text-sm text-amber-800">
                Belum ada guru yang terhubung melalui jadwal mengajar.
              </div>
            ) : (
              <div className="space-y-2">
                {teachers.map((assignment: any) => {
                  const name = assignment.employees?.full_name || "-";
                  return (
                    <button
                      key={assignment.employees?.id}
                      type="button"
                      onClick={() => onNavigateTeacher(assignment.employees?.id)}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(name)} text-xs font-bold text-white`}>
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">{assignment.employees?.position || "Guru"}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Layers3 className="h-4 w-4 text-primary" />
              Coverage Kelas & Perangkat
            </h3>
            <div className="space-y-2">
              {metrics.targetGrades.map((grade) => {
                const teacherCoverage = getTeacherCoverage(assignments, classes, subject, grade);
                const curriculum = getCurriculumRecord(curriculums, String(subject.id), grade);
                const phaseRecord = getPhaseReferenceRecord(curriculums, String(subject.id), grade);
                const ready = getCurriculumCompletion(curriculum, phaseRecord, semesterId).ready;
                const semesterPlan = getSemesterPlan(curriculum, semesterId);
                return (
                  <div key={grade} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">Kelas {grade}</p>
                        <p className="text-xs text-muted-foreground">
                          {teacherCoverage.total > 0 ? `${teacherCoverage.covered}/${teacherCoverage.total} rombel memiliki pengampu` : "Belum ada rombel pada tahun aktif"}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <StatusPill done={teacherCoverage.complete} label="Guru" />
                        <StatusPill done={Boolean(curriculum)} label="Kurikulum" />
                        <StatusPill done={ready} label="Siap" />
                      </div>
                    </div>
                    {curriculum ? (
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="rounded-md bg-muted/40 p-2">{curriculum.prota_data?.length || 0}<br />Prota</div>
                        <div className="rounded-md bg-muted/40 p-2">{semesterPlan?.prosem_data?.rows?.length || 0}<br />Promes</div>
                        <div className="rounded-md bg-muted/40 p-2">{getSemesterRppmRows(curriculum, semesterId).length}<br />RPPM</div>
                        <div className="rounded-md bg-muted/40 p-2">{getSemesterLearningPlanRows(curriculum, semesterId).length}<br />RPPH</div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-2 border-t bg-muted/20 p-4 sm:grid-cols-2">
        <Link
          to={`/curriculum/subjects/show/${subject.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <BookOpen className="h-4 w-4" />
          Buka Kurikulum
        </Link>
        <Link
          to="/schedules"
          className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          <CalendarDays className="h-4 w-4" />
          Atur Jadwal
        </Link>
      </div>
    </aside>
  );
}

export const SubjectTeacherDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [workflowFilter, setWorkflowFilter] = useState<DirectoryFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const { data: subjectsData, isLoading: subjectsLoading } = useList({
    resource: "subjects",
    pagination: { pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "*, units(id, name)" },
  });

  const { data: unitsData } = useList({ resource: "units", pagination: { pageSize: 50 } });

  const scheduleFilters: any[] = [
    { field: "schedule_type", operator: "eq", value: "mengajar" },
    { field: "subject_id", operator: "nnull", value: null },
  ];
  if (activeYearId) scheduleFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) scheduleFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const { data: assignmentsData, isLoading: assignmentsLoading } = useList({
    resource: "employee_schedules",
    pagination: { pageSize: 2000 },
    filters: scheduleFilters,
    meta: {
      select: "*, employees(id, full_name, position, status, nik), classes(id, name, grade_level), subjects(id, name)",
    },
  });

  const classFilters: any[] = [];
  if (activeYearId) classFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  const { data: classesData, isLoading: classesLoading } = useList({
    resource: "classes",
    pagination: { pageSize: 1000 },
    filters: classFilters,
  });

  const curriculumFilters: any[] = [];
  if (activeYearId) curriculumFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data: curriculumsData, isLoading: curriculumsLoading } = useList({
    resource: "subject_curriculums",
    pagination: { pageSize: 2000 },
    filters: curriculumFilters,
    meta: { select: "*, subject_curriculum_semesters(*)" },
  });

  const allSubjects = subjectsData?.data ?? [];
  const allAssignments = assignmentsData?.data ?? [];
  const allCurriculums = curriculumsData?.data ?? [];
  const allClasses = classesData?.data ?? [];

  const assignmentsBySubjectId = useMemo(() => {
    const map: Record<string, any[]> = {};
    allAssignments.forEach((assignment) => {
      if (!assignment.subject_id) return;
      const key = String(assignment.subject_id);
      if (!map[key]) map[key] = [];
      map[key].push(assignment);
    });
    return map;
  }, [allAssignments]);

  const curriculumsBySubjectId = useMemo(() => {
    const map: Record<string, any[]> = {};
    allCurriculums.forEach((record) => {
      if (!record.subject_id) return;
      const key = String(record.subject_id);
      if (!map[key]) map[key] = [];
      map[key].push(record);
    });
    return map;
  }, [allCurriculums]);

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((subject) => {
      const assignments = assignmentsBySubjectId[String(subject.id)] || [];
      const curriculums = curriculumsBySubjectId[String(subject.id)] || [];
      const metrics = getSubjectMetrics(subject, assignments, curriculums, allClasses, activeSemesterId);
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || subject.name?.toLowerCase().includes(term) || subject.code?.toLowerCase().includes(term);
      const matchesCategory = !filterCategory || subject.category === filterCategory;
      const matchesUnit = !filterUnit ? (!activeUnitId || subject.unit_id === activeUnitId) : subject.unit_id === filterUnit;
      const matchesStatus = filterStatus === "active" ? subject.is_active !== false : filterStatus === "inactive" ? subject.is_active === false : true;
      const matchesWorkflow =
        workflowFilter === "all" ||
        (workflowFilter === "needs_teacher" && metrics.missingTeacherGrades.length > 0) ||
        (workflowFilter === "needs_curriculum" && metrics.missingCurriculumGrades.length > 0) ||
        (workflowFilter === "ready" && metrics.isReady);
      return matchesSearch && matchesCategory && matchesUnit && matchesStatus && matchesWorkflow;
    });
  }, [activeSemesterId, activeUnitId, allClasses, allSubjects, assignmentsBySubjectId, curriculumsBySubjectId, filterCategory, filterStatus, filterUnit, search, workflowFilter]);

  const stats = useMemo(() => {
    const withTeachers = filteredSubjects.filter((subject) => {
      const assignments = assignmentsBySubjectId[String(subject.id)] || [];
      return getSubjectMetrics(subject, assignments, curriculumsBySubjectId[String(subject.id)] || [], allClasses, activeSemesterId).missingTeacherGrades.length === 0;
    });
    const withCurriculum = filteredSubjects.filter((subject) => {
      const curriculums = curriculumsBySubjectId[String(subject.id)] || [];
      return getSubjectMetrics(subject, assignmentsBySubjectId[String(subject.id)] || [], curriculums, allClasses, activeSemesterId).missingCurriculumGrades.length === 0;
    });
    const ready = filteredSubjects.filter((subject) => {
      return getSubjectMetrics(subject, assignmentsBySubjectId[String(subject.id)] || [], curriculumsBySubjectId[String(subject.id)] || [], allClasses, activeSemesterId).isReady;
    });

    return {
      total: filteredSubjects.length,
      withTeachers: withTeachers.length,
      needsTeacher: filteredSubjects.length - withTeachers.length,
      withCurriculum: withCurriculum.length,
      ready: ready.length,
      totalTeachers: new Set(allAssignments.map((assignment) => assignment.employees?.id).filter(Boolean)).size,
    };
  }, [activeSemesterId, allAssignments, allClasses, assignmentsBySubjectId, curriculumsBySubjectId, filteredSubjects]);

  const selectedSubject = allSubjects.find((subject) => String(subject.id) === selectedSubjectId);
  const selectedAssignments = selectedSubject ? assignmentsBySubjectId[String(selectedSubject.id)] || [] : [];
  const selectedCurriculums = selectedSubject ? curriculumsBySubjectId[String(selectedSubject.id)] || [] : [];
  const isLoading = subjectsLoading || assignmentsLoading || curriculumsLoading || classesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/subjects" className="rounded-full p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title="Direktori Pengampu & Kesiapan Kurikulum"
          description="Kontrol siapa guru pengampu setiap mapel, kelas mana yang belum tertutup, dan perangkat ajar mana yang belum siap."
        />
      </div>
      <CurriculumSectionNav />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <GraduationCap className="h-4 w-4" />
              Masih perlu, sebagai kontrol operasional
            </div>
            <h2 className="mt-3 text-2xl font-bold">Mapel, guru, kelas, dan kurikulum dalam satu tempat</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Halaman ini mendukung alur baru: CP/ATP per fase tetap dikelola di kurikulum mapel, sementara direktori ini memastikan setiap kelas punya guru pengampu dan perangkat ajar yang bisa dijalankan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-4">
              <BookOpen className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">1. Pilih Mapel</p>
              <p className="mt-1 text-xs text-muted-foreground">Lihat fase dan kelas sasaran.</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">2. Cek Guru</p>
              <p className="mt-1 text-xs text-muted-foreground">Pastikan tiap kelas ada pengampu.</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">3. Cek Siap</p>
              <p className="mt-1 text-xs text-muted-foreground">Pantau Prota sampai RPPH.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: BookOpen, label: "Mapel Terfilter", value: stats.total, color: "bg-blue-100 text-blue-700" },
          { icon: Users, label: "Guru Lengkap", value: stats.withTeachers, color: "bg-emerald-100 text-emerald-700" },
          { icon: AlertCircle, label: "Butuh Guru", value: stats.needsTeacher, color: "bg-amber-100 text-amber-700" },
          { icon: Layers3, label: "Kurikulum Lengkap", value: stats.withCurriculum, color: "bg-cyan-100 text-cyan-700" },
          { icon: CheckCircle2, label: "Siap Jalan", value: stats.ready, color: "bg-teal-100 text-teal-700" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau kode mata pelajaran..."
              className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value as DirectoryFilter)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="all">Semua Workflow</option>
              <option value="needs_teacher">Butuh Guru</option>
              <option value="needs_curriculum">Butuh Kurikulum</option>
              <option value="ready">Siap Jalan</option>
            </select>
            <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Semua Kategori</option>
              <option value="Nasional">Nasional</option>
              <option value="Khas Sekolah">Khas Sekolah</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            <select value={filterUnit} onChange={(event) => setFilterUnit(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Unit Aktif / Semua</option>
              {(unitsData?.data ?? []).map((unit: any) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
            <div className="flex overflow-hidden rounded-lg border">
              <button type="button" onClick={() => setViewMode("grid")} className={`p-2.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`} title="Tampilan kartu">
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setViewMode("list")} className={`p-2.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`} title="Tampilan tabel">
                <ListFilter className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>{isLoading ? "Memuat data..." : `${filteredSubjects.length} mata pelajaran tampil`}</span>
          <span>Guru unik: {stats.totalTeachers}</span>
          {(search || filterCategory || filterUnit || filterStatus !== "active" || workflowFilter !== "all") ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterCategory("");
                setFilterUnit("");
                setFilterStatus("active");
                setWorkflowFilter("all");
              }}
              className="ml-auto font-semibold text-rose-600 hover:underline"
            >
              Reset filter
            </button>
          ) : null}
        </div>
      </section>

      <div className={selectedSubjectId ? "grid gap-6 xl:grid-cols-[1fr_420px]" : ""}>
        <main>
          {isLoading ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="rounded-xl border bg-card p-14 text-center">
              <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">Tidak ada mata pelajaran sesuai filter</p>
              <p className="mt-1 text-sm text-muted-foreground">Ubah filter atau tambah mata pelajaran baru.</p>
              <Link to="/curriculum/subjects/create" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" />
                Tambah Mapel
              </Link>
            </div>
          ) : viewMode === "grid" ? (
            <div className={`grid gap-4 ${selectedSubjectId ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {filteredSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  assignments={assignmentsBySubjectId[String(subject.id)] || []}
                  curriculums={curriculumsBySubjectId[String(subject.id)] || []}
                  classes={allClasses}
                  semesterId={activeSemesterId}
                  isSelected={String(subject.id) === selectedSubjectId}
                  onSelect={() => setSelectedSubjectId(String(subject.id) === selectedSubjectId ? null : String(subject.id))}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Mata Pelajaran</th>
                    <th className="px-5 py-3">Guru</th>
                    <th className="px-5 py-3">Kelas</th>
                    <th className="px-5 py-3">Kurikulum</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSubjects.map((subject) => {
                    const assignments = assignmentsBySubjectId[String(subject.id)] || [];
                    const curriculums = curriculumsBySubjectId[String(subject.id)] || [];
                    const metrics = getSubjectMetrics(subject, assignments, curriculums, allClasses, activeSemesterId);
                    const selected = String(subject.id) === selectedSubjectId;
                    return (
                      <tr key={subject.id} className={selected ? "bg-primary/5" : "hover:bg-muted/30"}>
                        <td className="px-5 py-4">
                          <p className="font-semibold">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code || "Tanpa kode"}</p>
                        </td>
                        <td className="px-5 py-4"><TeacherAvatarStack assignments={assignments} /></td>
                        <td className="px-5 py-4 text-sm">{metrics.assignedGrades.size}/{metrics.targetGrades.length}</td>
                        <td className="px-5 py-4 text-sm">{metrics.curriculumGrades.size}/{metrics.targetGrades.length}</td>
                        <td className="px-5 py-4">
                          <StatusPill done={metrics.isReady} label={metrics.isReady ? "Siap" : "Perlu tindak lanjut"} />
                        </td>
                        <td className="px-5 py-4">
                          <button type="button" onClick={() => setSelectedSubjectId(selected ? null : String(subject.id))} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                            <Eye className="h-4 w-4" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {selectedSubject && (
          <SubjectDetailPanel
            subject={selectedSubject}
            assignments={selectedAssignments}
            curriculums={selectedCurriculums}
            classes={allClasses}
            semesterId={activeSemesterId}
            onClose={() => setSelectedSubjectId(null)}
            onNavigateTeacher={(teacherId) => navigate(`/employees/show/${teacherId}`)}
          />
        )}
      </div>
    </div>
  );
};
