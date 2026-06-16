import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  BookOpen, Users, Search, Filter, ChevronRight, ArrowLeft,
  GraduationCap, Building2, User, Eye, AlertCircle,
  Layers, CheckCircle2, XCircle, ListFilter, Grid3x3,
  BookMarked, UserCheck, Star
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_CFG: Record<string, { color: string; bg: string; dot: string }> = {
  Nasional:      { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",    dot: "bg-blue-500" },
  "Khas Sekolah": { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  Lainnya:       { color: "text-slate-600",   bg: "bg-slate-50 border-slate-200",  dot: "bg-slate-400" },
};

const ROLE_LABEL: Record<string, string> = {
  wali_kelas:   "Wali Kelas",
  guru_mapel:   "Guru Mata Pelajaran",
  guru_quran:   "Guru Al-Qur'an",
  guru_diniyah: "Guru Diniyah",
  staff:        "Staff",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
  "from-cyan-500 to-sky-600",
];
function getAvatarColor(name: string) {
  let h = 0; for (const c of name) h += c.charCodeAt(0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── Teacher Chip ─────────────────────────────────────────────────────────────
function TeacherChip({ assignment, onNavigate }: { assignment: any; onNavigate: () => void }) {
  const name = assignment.employees?.full_name ?? "—";
  const color = getAvatarColor(name);
  const roleLabel = ROLE_LABEL[assignment.role_type] ?? assignment.role_type;
  const classLabel = assignment.classes?.name;

  return (
    <button
      onClick={onNavigate}
      className="group flex items-center gap-3 w-full text-left p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all"
    >
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}>
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {name}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
          {classLabel && (
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              {classLabel}
            </span>
          )}
          {assignment.units?.name && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {assignment.units.name}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
    </button>
  );
}

// ─── Subject Card (Grid View) ──────────────────────────────────────────────────
function SubjectCard({
  subject, assignments, onSelectSubject,
}: {
  subject: any;
  assignments: any[];
  onSelectSubject: (id: string) => void;
}) {
  const catKey = subject.category ?? "Lainnya";
  const cat = CATEGORY_CFG[catKey] ?? CATEGORY_CFG["Lainnya"];
  const uniqueTeachers = [...new Map(assignments.map((a) => [a.employees?.id, a])).values()];

  return (
    <div
      onClick={() => onSelectSubject(subject.id)}
      className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cat.bg}`}>
            <BookOpen className={`w-5 h-5 ${cat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground leading-tight">{subject.name}</p>
            {subject.code && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{subject.code}</p>}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
          {catKey}
        </span>
      </div>

      {/* Teachers summary */}
      <div className="flex-1">
        {uniqueTeachers.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            Belum ada guru ditugaskan
          </div>
        ) : (
          <div className="space-y-1.5">
            {uniqueTeachers.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarColor(a.employees?.full_name ?? "?")} flex items-center justify-center text-white font-bold text-[8px] shrink-0`}>
                  {getInitials(a.employees?.full_name ?? "?")}
                </div>
                <span className="text-xs text-foreground truncate font-medium">{a.employees?.full_name}</span>
                {a.classes?.name && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-auto shrink-0">{a.classes.name}</span>
                )}
              </div>
            ))}
            {uniqueTeachers.length > 3 && (
              <p className="text-xs text-muted-foreground pl-7">+{uniqueTeachers.length - 3} guru lainnya</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{uniqueTeachers.length} guru</span>
          {assignments.length > uniqueTeachers.length && (
            <span className="text-[10px]">({assignments.length} kelas)</span>
          )}
        </div>
        <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Lihat Detail <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

// ─── Subject Detail Panel (Right side) ───────────────────────────────────────
function SubjectDetailPanel({
  subject, assignments, onClose, onNavigateTeacher,
}: {
  subject: any;
  assignments: any[];
  onClose: () => void;
  onNavigateTeacher: (id: string) => void;
}) {
  const catKey = subject.category ?? "Lainnya";
  const cat = CATEGORY_CFG[catKey] ?? CATEGORY_CFG["Lainnya"];

  // Group assignments by class
  const byClass = useMemo(() => {
    const map: Record<string, { className: string; unitName: string; teachers: any[] }> = {};
    assignments.forEach((a) => {
      const key = a.classes?.id ?? "no_class";
      if (!map[key]) map[key] = {
        className: a.classes?.name ?? "Tanpa Kelas Spesifik",
        unitName: a.units?.name ?? "—",
        teachers: [],
      };
      map[key].teachers.push(a);
    });
    return Object.values(map);
  }, [assignments]);

  const uniqueTeachers = [...new Map(assignments.map((a) => [a.employees?.id, a])).values()];

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Panel header */}
      <div className={`p-5 border-b bg-gradient-to-r from-primary/5 to-transparent`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${cat.bg} shrink-0`}>
              <BookOpen className={`w-6 h-6 ${cat.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg leading-tight">{subject.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {subject.code && <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{subject.code}</span>}
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
                  {catKey}
                </span>
                {subject.is_active === false && (
                  <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full">Nonaktif</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-background rounded-lg p-3 border text-center">
            <p className="text-xl font-bold text-foreground">{uniqueTeachers.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Guru</p>
          </div>
          <div className="bg-background rounded-lg p-3 border text-center">
            <p className="text-xl font-bold text-foreground">{byClass.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kelas Diajar</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 text-amber-500" />
            </div>
            <p className="font-semibold text-sm mb-1">Belum Ada Penugasan</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Mata pelajaran ini belum memiliki guru yang ditugaskan di tahun ajaran aktif.
            </p>
            <Link
              to="/teachers"
              className="mt-4 text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Ke halaman guru
            </Link>
          </div>
        ) : (
          <>
            {/* Semua Guru Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" /> Semua Guru yang Mengajar
              </h4>
              <div className="space-y-2">
                {uniqueTeachers.map((a) => (
                  <TeacherChip
                    key={a.id}
                    assignment={a}
                    onNavigate={() => onNavigateTeacher(a.employees?.id)}
                  />
                ))}
              </div>
            </div>

            {/* Per Kelas Section */}
            {byClass.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Penugasan per Kelas
                </h4>
                <div className="space-y-3">
                  {byClass.map((cls, i) => (
                    <div key={i} className="border rounded-xl p-4 bg-muted/10">
                      <div className="flex items-center justify-between mb-2.5">
                        <div>
                          <p className="font-semibold text-sm">{cls.className}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> {cls.unitName}
                          </p>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          {cls.teachers.length} guru
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {cls.teachers.map((t: any) => (
                          <button
                            key={t.id}
                            onClick={() => onNavigateTeacher(t.employees?.id)}
                            className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors group"
                          >
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(t.employees?.full_name ?? "?")} flex items-center justify-center text-white font-bold text-[9px] shrink-0`}>
                              {getInitials(t.employees?.full_name ?? "?")}
                            </div>
                            <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                              {t.employees?.full_name ?? "—"}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer action */}
      <div className="p-4 border-t bg-muted/20">
        <Link
          to={`/curriculum/subjects/edit/${subject.id}`}
          className="flex items-center justify-center gap-2 w-full text-sm font-medium border rounded-lg py-2 hover:bg-muted transition-colors"
        >
          <BookMarked className="w-4 h-4" /> Edit Mata Pelajaran
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";

export const SubjectTeacherDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); // "active"|""|"inactive"
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Load all subjects
  const { data: subjectsData, isLoading: subjectsLoading } = useList({
    resource: "subjects",
    pagination: { pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "*, units(id, name)" },
  });

  // Load all units for filter
  const { data: unitsData } = useList({ resource: "units", pagination: { pageSize: 50 } });

  // Load teacher_assignments with employee & class data
  const { data: assignmentsData, isLoading: assignmentsLoading } = useList({
    resource: "teacher_assignments",
    pagination: { pageSize: 2000 },
    filters: [
      { field: "is_active", operator: "eq" as const, value: true },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    meta: {
      select: "*, employees(id, full_name, position, status, nik), units(id, name), classes(id, name)",
    },
  });

  const allSubjects = subjectsData?.data ?? [];
  const allAssignments = assignmentsData?.data ?? [];

  // Build assignment lookup: subject name → assignments array
  // teacher_assignments uses `subject` as free text — match by subject name
  const assignmentsBySubjectName = useMemo(() => {
    const map: Record<string, any[]> = {};
    allAssignments.forEach((a) => {
      if (!a.subject) return;
      const key = a.subject.trim().toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [allAssignments]);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((s) => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.code ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCategory = !filterCategory || s.category === filterCategory;
      const matchUnit = !filterUnit ? (!activeUnitId || s.unit_id === activeUnitId) : s.unit_id === filterUnit;
      const matchStatus = filterStatus === "active" ? s.is_active !== false : filterStatus === "inactive" ? s.is_active === false : true;
      return matchSearch && matchCategory && matchUnit && matchStatus;
    });
  }, [allSubjects, search, filterCategory, filterUnit, filterStatus, activeUnitId]);

  // Stats
  const stats = useMemo(() => {
    const withTeachers = filteredSubjects.filter((s) => {
      const key = s.name.trim().toLowerCase();
      return (assignmentsBySubjectName[key]?.length ?? 0) > 0;
    });
    const totalTeachers = new Set(
      allAssignments.filter((a) => a.subject).map((a) => a.employees?.id)
    ).size;

    return {
      total: filteredSubjects.length,
      withTeachers: withTeachers.length,
      withoutTeachers: filteredSubjects.length - withTeachers.length,
      totalTeachers,
    };
  }, [filteredSubjects, assignmentsBySubjectName, allAssignments]);

  const selectedSubject = allSubjects.find((s) => s.id === selectedSubjectId);
  const selectedAssignments = selectedSubject
    ? (assignmentsBySubjectName[selectedSubject.name.trim().toLowerCase()] ?? [])
    : [];

  const isLoading = subjectsLoading || assignmentsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum" className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title="Direktori Mata Pelajaran & Guru"
          description="Lihat siapa yang mengajar setiap mata pelajaran. Bantu perencanaan penugasan dan penjadwalan."
        />
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen,  label: "Total Mata Pelajaran", value: stats.total,          color: "bg-blue-100 text-blue-700" },
          { icon: CheckCircle2, label: "Sudah Ada Guru",    value: stats.withTeachers,   color: "bg-emerald-100 text-emerald-700" },
          { icon: AlertCircle,  label: "Belum Ada Guru",   value: stats.withoutTeachers, color: "bg-amber-100 text-amber-700" },
          { icon: GraduationCap, label: "Total Guru Aktif", value: stats.totalTeachers, color: "bg-purple-100 text-purple-700" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau kode mata pelajaran..."
              className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            />
          </div>
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              title="Tampilan Grid"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              title="Tampilan List"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Kategori</option>
            <option value="Nasional">Nasional (Kurikulum Merdeka)</option>
            <option value="Khas Sekolah">Khas Sekolah</option>
            <option value="Lainnya">Lainnya</option>
          </select>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Unit</option>
            {(unitsData?.data ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          {(filterCategory || filterUnit || search) && (
            <button
              onClick={() => { setFilterCategory(""); setFilterUnit(""); setSearch(""); setFilterStatus("active"); }}
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {isLoading ? "Memuat..." : `${filteredSubjects.length} mata pelajaran`}
          </span>
        </div>
      </div>

      {/* ── Main Content (2-panel layout if subject selected) ── */}
      <div className={`${selectedSubjectId ? "grid grid-cols-1 lg:grid-cols-5 gap-6" : ""}`}>
        {/* Left panel: subject list/grid */}
        <div className={selectedSubjectId ? "lg:col-span-3" : ""}>
          {isLoading ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-card border rounded-xl p-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-foreground mb-1">Tidak Ada Mata Pelajaran</p>
              <p className="text-sm text-muted-foreground">Coba ubah filter atau tambah mata pelajaran baru.</p>
              <Link
                to="/curriculum/subjects/create"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                + Tambah Mata Pelajaran
              </Link>
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className={`grid gap-4 ${selectedSubjectId ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
              {filteredSubjects.map((subject) => {
                const key = subject.name.trim().toLowerCase();
                const assignments = assignmentsBySubjectName[key] ?? [];
                const isSelected = selectedSubjectId === subject.id;
                return (
                  <div key={subject.id} className={isSelected ? "ring-2 ring-primary rounded-xl" : ""}>
                    <SubjectCard
                      subject={subject}
                      assignments={assignments}
                      onSelectSubject={(id) => setSelectedSubjectId(selectedSubjectId === id ? null : id)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Mata Pelajaran</th>
                    <th className="px-5 py-3.5 text-left">Kategori</th>
                    <th className="px-5 py-3.5 text-left">Unit</th>
                    <th className="px-5 py-3.5 text-left">Guru yang Mengajar</th>
                    <th className="px-5 py-3.5 text-center">Kelas</th>
                    <th className="px-5 py-3.5 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubjects.map((subject) => {
                    const key = subject.name.trim().toLowerCase();
                    const assignments = assignmentsBySubjectName[key] ?? [];
                    const uniqueTeachers = [...new Map(assignments.map((a) => [a.employees?.id, a])).values()];
                    const catKey = subject.category ?? "Lainnya";
                    const cat = CATEGORY_CFG[catKey] ?? CATEGORY_CFG["Lainnya"];
                    const isSelected = selectedSubjectId === subject.id;

                    return (
                      <tr
                        key={subject.id}
                        onClick={() => setSelectedSubjectId(isSelected ? null : String(subject.id))}
                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-semibold text-foreground">{subject.name}</p>
                            {subject.code && <p className="text-xs text-muted-foreground font-mono">{subject.code}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cat.bg} ${cat.color}`}>
                            {catKey}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {subject.units?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {uniqueTeachers.length === 0 ? (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Belum ada
                            </span>
                          ) : (
                            <div className="flex -space-x-2">
                              {uniqueTeachers.slice(0, 4).map((a, i) => (
                                <div
                                  key={i}
                                  title={a.employees?.full_name}
                                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(a.employees?.full_name ?? "?")} border-2 border-background flex items-center justify-center text-white font-bold text-[9px]`}
                                >
                                  {getInitials(a.employees?.full_name ?? "?")}
                                </div>
                              ))}
                              {uniqueTeachers.length > 4 && (
                                <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                  +{uniqueTeachers.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-xs font-semibold ${assignments.length > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {assignments.length}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedSubjectId(isSelected ? null : String(subject.id)); }}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right panel: detail */}
        {selectedSubjectId && selectedSubject && (
          <div className="lg:col-span-2 h-fit sticky top-4">
            <SubjectDetailPanel
              subject={selectedSubject}
              assignments={selectedAssignments}
              onClose={() => setSelectedSubjectId(null)}
              onNavigateTeacher={(id) => navigate(`/employees/show/${id}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
