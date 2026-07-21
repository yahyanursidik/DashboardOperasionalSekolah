import React, { useMemo, useState } from "react";
import { useDelete, useList } from "@refinedev/core";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Edit,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SD_PHASES, getSdPhaseByGrade } from "../subject-curriculums/sdCurriculumStructure";
import { CurriculumSectionNav } from "../components/CurriculumSectionNav";
import {
  getCurriculumCompletion,
  getSemesterLearningPlanRows,
  getSemesterPlan,
  getSemesterRppmRows,
} from "../curriculum-utils";
import { getAssessmentWeightTotal, getFinalAssessmentType } from "../assessment-policy";

type ViewMode = "class" | "master";

const GRADES = [1, 2, 3, 4, 5, 6];

const CATEGORY_STYLE: Record<string, string> = {
  Nasional: "border-blue-200 bg-blue-50 text-blue-700",
  "Khas Sekolah": "border-emerald-200 bg-emerald-50 text-emerald-700",
  Lainnya: "border-slate-200 bg-slate-50 text-slate-600",
};

function getTargetGrades(subject: any) {
  const grades = Array.isArray(subject.grade_levels) ? subject.grade_levels.map(Number).filter(Boolean) : [];
  return grades.length > 0 ? grades.sort((a: number, b: number) => a - b) : GRADES;
}

function subjectMatchesGrade(subject: any, grade: number) {
  return getTargetGrades(subject).includes(grade);
}

function getSubjectRecords(subjectId: string, records: any[]) {
  return records.filter((record) => String(record.subject_id) === String(subjectId));
}

function findClassRecord(subjectId: string, grade: number, records: any[]) {
  return getSubjectRecords(subjectId, records).find((record) => Number(record.grade_level) === grade);
}

function findPhaseRecord(subjectId: string, grade: number, records: any[]) {
  const phase = getSdPhaseByGrade(grade);
  if (!phase) return undefined;
  return getSubjectRecords(subjectId, records).find(
    (record) => (phase.grades as readonly number[]).includes(Number(record.grade_level)) && (record.cp_text || record.atp_text)
  );
}

function makeCurriculumCreateUrl(subjectId: string, grade: number, activeYearId: string | null) {
  const params = new URLSearchParams({ subject_id: subjectId, grade_level: String(grade) });
  if (activeYearId) params.set("academic_year_id", activeYearId);
  return `/curriculum/subject-curriculums/create?${params.toString()}`;
}

const StatusPill: React.FC<{ done: boolean; label: string; detail?: string }> = ({ done, label, detail }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${
      done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
    }`}
  >
    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
    {label}
    {detail ? <span className="font-normal opacity-80">({detail})</span> : null}
  </span>
);

const ModeButton: React.FC<{ active: boolean; icon: React.ElementType; children: React.ReactNode; onClick: () => void }> = ({
  active,
  icon: Icon,
  children,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    <Icon className="h-4 w-4" />
    {children}
  </button>
);

export const SubjectsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteSubject } = useDelete();
  const initialGrade = Number(searchParams.get("grade_level"));

  const [mode, setMode] = useState<ViewMode>("class");
  const [selectedGrade, setSelectedGrade] = useState(GRADES.includes(initialGrade) ? initialGrade : 1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const subjectFilters: any[] = [];
  if (activeUnitId) subjectFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (filterCategory) subjectFilters.push({ field: "category", operator: "eq", value: filterCategory });

  const curriculumFilters: any[] = [];
  if (activeYearId) curriculumFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data: subjectsData, isLoading: subjectsLoading } = useList({
    resource: "subjects",
    filters: subjectFilters,
    sorters: [{ field: "name", order: "asc" }],
    pagination: { pageSize: 300 },
    meta: { select: "*, units(name)" },
  });

  const { data: curriculumsData, isLoading: curriculumsLoading } = useList({
    resource: "subject_curriculums",
    filters: curriculumFilters,
    pagination: { pageSize: 2000 },
    meta: { select: "*, subject_curriculum_semesters(*)" },
  });

  const subjects = subjectsData?.data || [];
  const curriculums = curriculumsData?.data || [];
  const term = search.trim().toLowerCase();

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject: any) => {
      const matchesSearch = !term || subject.name?.toLowerCase().includes(term) || subject.code?.toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [subjects, term]);

  const classSubjects = useMemo(() => {
    return filteredSubjects.filter((subject: any) => subjectMatchesGrade(subject, selectedGrade));
  }, [filteredSubjects, selectedGrade]);

  const gradeStats = useMemo(() => {
    return GRADES.map((grade) => {
      const gradeSubjects = filteredSubjects.filter((subject: any) => subjectMatchesGrade(subject, grade));
      const readyCount = gradeSubjects.filter((subject: any) => {
        const record = findClassRecord(subject.id, grade, curriculums);
        const phaseRecord = findPhaseRecord(subject.id, grade, curriculums);
        return getCurriculumCompletion(record, phaseRecord, activeSemesterId).ready;
      }).length;

      return {
        grade,
        subjectsCount: gradeSubjects.length,
        readyCount,
        phase: getSdPhaseByGrade(grade),
      };
    });
  }, [activeSemesterId, curriculums, filteredSubjects]);

  const selectedPhase = getSdPhaseByGrade(selectedGrade);
  const selectedStats = gradeStats.find((item) => item.grade === selectedGrade);
  const isLoading = subjectsLoading || curriculumsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum" className="rounded-full p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title="Kurikulum SD"
          description="Mulai dari kelas, pilih mata pelajaran, lalu lengkapi CP/ATP fase dan perangkat ajar kelas."
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                to="/curriculum/subjects/directory"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Users className="h-4 w-4" />
                Cek Guru & Kelengkapan
              </Link>
              <Link
                to="/curriculum/subjects/create"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Tambah Data Mapel
              </Link>
            </div>
          }
        />
      </div>
      <CurriculumSectionNav />

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <GraduationCap className="h-4 w-4" />
              Alur pengisian
            </div>
            <h2 className="mt-3 text-2xl font-bold">Pilih kelas, lalu lengkapi kurikulum tiap mapel</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Data mapel tetap disimpan satu kali, misalnya Bahasa Inggris. Di halaman ini mapel ditampilkan per kelas agar CP/ATP fase dan perangkat ajar kelas tidak tertukar.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-4">
              <BookOpen className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">1. Kelas</p>
              <p className="mt-1 text-xs text-muted-foreground">Pilih kelas operasional.</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <ListChecks className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">2. Mapel</p>
              <p className="mt-1 text-xs text-muted-foreground">Lihat mapel di kelas itu.</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">3. Selesai</p>
              <p className="mt-1 text-xs text-muted-foreground">Pantau CP sampai RPPH.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            <ModeButton active={mode === "class"} icon={LayoutGrid} onClick={() => setMode("class")}>
              Kurikulum Per Kelas
            </ModeButton>
            <ModeButton active={mode === "master"} icon={BookOpen} onClick={() => setMode("master")}>
              Data Induk Mapel
            </ModeButton>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau kode mata pelajaran..."
              className="w-full rounded-md border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className="rounded-md border bg-background px-3 py-2.5 text-sm">
            <option value="">Semua Kategori</option>
            <option value="Nasional">Nasional</option>
            <option value="Khas Sekolah">Khas Sekolah</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>{isLoading ? "Memuat data..." : `${filteredSubjects.length} mata pelajaran tampil`}</span>
          {!activeYearId ? (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Status menampilkan data lintas tahun ajaran
            </span>
          ) : null}
        </div>
      </section>

      {mode === "class" ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {gradeStats.map((item) => {
              const active = item.grade === selectedGrade;
              const percent = item.subjectsCount > 0 ? Math.round((item.readyCount / item.subjectsCount) * 100) : 0;
              return (
                <button
                  key={item.grade}
                  type="button"
                  onClick={() => {
                    setSelectedGrade(item.grade);
                    setSearchParams({ grade_level: String(item.grade) });
                  }}
                  className={`rounded-lg border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/50 ${
                    active ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">Kelas {item.grade}</p>
                      <p className="text-xs font-semibold text-primary">{item.phase?.label || "-"}</p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{percent}%</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.readyCount}/{item.subjectsCount} mapel siap
                  </p>
                </button>
              );
            })}
          </div>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div>
                <div className="inline-flex rounded-md bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {selectedPhase?.label || "Fase"} | Kelas {selectedGrade}
                </div>
                <h2 className="mt-3 text-2xl font-bold">Kurikulum Mapel Kelas {selectedGrade}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedStats?.subjectsCount || 0} mapel tersedia untuk kelas ini, {selectedStats?.readyCount || 0} sudah lengkap sampai modul ajar.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                <p className="font-semibold">Syarat lengkap</p>
                <p className="mt-1 text-muted-foreground">CP/ATP fase, perangkat ajar, serta kebijakan asesmen dan rapor semester sudah terisi.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 py-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="h-56 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : classSubjects.length === 0 ? (
              <div className="py-14 text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="font-semibold">Belum ada mapel untuk kelas ini</p>
                <p className="mt-1 text-sm text-muted-foreground">Tambahkan mapel atau ubah alokasi kelas di master mapel.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {classSubjects.map((subject: any) => {
                  const classRecord = findClassRecord(subject.id, selectedGrade, curriculums);
                  const phaseRecord = findPhaseRecord(subject.id, selectedGrade, curriculums);
                  const cpSource = phaseRecord || classRecord;
                  const protaCount = Array.isArray(classRecord?.prota_data) ? classRecord.prota_data.length : 0;
                  const semesterPlan = getSemesterPlan(classRecord, activeSemesterId);
                  const prosemCount = Array.isArray(semesterPlan?.prosem_data?.rows) ? semesterPlan.prosem_data.rows.length : 0;
                  const rppmCount = getSemesterRppmRows(classRecord, activeSemesterId).length;
                  const rpphCount = getSemesterLearningPlanRows(classRecord, activeSemesterId).length;
                  const ready = getCurriculumCompletion(classRecord, phaseRecord, activeSemesterId).ready;
                  const finalAssessment = getFinalAssessmentType(semesterPlan, semesterPlan?.semester_name);
                  const assessmentWeightTotal = getAssessmentWeightTotal(semesterPlan);
                  const categoryClass = CATEGORY_STYLE[subject.category] || CATEGORY_STYLE.Lainnya;
                  const targetUrl = classRecord
                    ? `/curriculum/subject-curriculums/edit/${classRecord.id}`
                    : makeCurriculumCreateUrl(subject.id, selectedGrade, activeYearId);

                  return (
                    <article key={subject.id} className="flex min-h-[270px] flex-col rounded-lg border bg-background p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold">{subject.name}</p>
                          {subject.quran_program_type && (
                            <span className="mt-1 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                              {subject.quran_program_type === "both" ? "Tahsin & Tahfidz" : subject.quran_program_type}
                            </span>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">{subject.code || "Tanpa kode"} | {subject.units?.name || "Unit belum dipilih"}</p>
                        </div>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${categoryClass}`}>{subject.category || "Lainnya"}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill done={Boolean(semesterPlan)} label={semesterPlan?.semester_name ? `Semester ${semesterPlan.semester_name}` : "Semester Aktif"} />
                        <StatusPill done={Boolean(semesterPlan)} label={finalAssessment === "none" ? "Tanpa SAS/ASAT" : finalAssessment.toUpperCase()} />
                        <StatusPill done={Boolean(semesterPlan) && semesterPlan?.include_in_report !== false} label={semesterPlan?.include_in_report === false ? "Laporan Terpisah" : "Masuk Rapor"} />
                        <StatusPill done={assessmentWeightTotal === 100} label="Bobot Nilai" detail={`${assessmentWeightTotal}%`} />
                        <StatusPill done={Boolean(cpSource?.cp_text && cpSource?.atp_text)} label="CP/ATP Fase" />
                        <StatusPill done={protaCount > 0} label="Prota" detail={`${protaCount}`} />
                        <StatusPill done={prosemCount > 0} label="Promes" detail={`${prosemCount}`} />
                        <StatusPill done={rppmCount > 0} label="RPPM" detail={`${rppmCount}`} />
                        <StatusPill done={rpphCount > 0} label="RPPH" detail={`${rpphCount}`} />
                      </div>

                      <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">Status kelas {selectedGrade}</span>
                          <span className={`rounded-md px-2 py-1 text-xs font-bold ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {ready ? "Siap" : "Perlu dilengkapi"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          CP/ATP mengikuti {selectedPhase?.label || "fase"}, perangkat ajar disimpan khusus kelas {selectedGrade}.
                        </p>
                      </div>

                      <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
                        <Link
                          to={targetUrl}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          {classRecord ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {classRecord ? "Edit Kurikulum" : "Buat Kurikulum"}
                        </Link>
                        <Link
                          to={`/curriculum/subjects/show/${subject.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          Lihat Semua Kelas
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Data Induk Mata Pelajaran</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola nama, kode, kategori, unit, dan alokasi kelas mapel. Untuk mengisi CP/ATP dan perangkat ajar, gunakan tab Kurikulum Per Kelas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Mata Pelajaran</th>
                  <th className="px-5 py-4">Kategori</th>
                  <th className="px-5 py-4">Fase / Kelas</th>
                  <th className="px-5 py-4">Semester</th>
                  <th className="px-5 py-4">Unit</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSubjects.map((subject: any) => {
                  const grades = getTargetGrades(subject);
                  const activePhases = SD_PHASES.filter((phase) => phase.grades.some((grade) => grades.includes(grade)));
                  const categoryClass = CATEGORY_STYLE[subject.category] || CATEGORY_STYLE.Lainnya;
                  return (
                    <tr key={subject.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.code || "Tanpa kode"}</p>
                        {subject.quran_program_type && (
                          <span className="mt-1 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                            {subject.quran_program_type === "both" ? "Tahsin & Tahfidz" : subject.quran_program_type}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${categoryClass}`}>{subject.category || "Lainnya"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {activePhases.map((phase) => (
                            <span key={phase.id} className="rounded-md border bg-primary/5 px-2 py-1 text-xs font-semibold text-primary">
                              {phase.label}: {phase.grades.filter((grade) => grades.includes(grade)).join(", ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(subject.semesters || []).length > 0 ? (
                            subject.semesters.map((semester: string) => (
                              <span key={semester} className="rounded-md border bg-muted/40 px-2 py-1 text-xs font-semibold">
                                {semester}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">{subject.units?.name || "-"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${subject.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {subject.is_active !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/curriculum/subjects/show/${subject.id}`)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
                            title="Buka kurikulum"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/curriculum/subjects/edit/${subject.id}`)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                            title="Edit mapel"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) {
                                deleteSubject(
                                  { resource: "subjects", id: subject.id },
                                  {
                                    onSuccess: () => toast.success("Mata pelajaran berhasil dihapus"),
                                    onError: (error) => toast.error("Gagal menghapus mata pelajaran: " + error.message),
                                  }
                                );
                              }
                            }}
                            className="rounded-md p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                      Belum ada mata pelajaran sesuai filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
