import React, { useMemo, useState } from "react";
import { useList, useOne } from "@refinedev/core";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Filter,
  GraduationCap,
  School,
  Search,
  Loader2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { CurriculumSectionNav } from "./components/CurriculumSectionNav";
import {
  CURRICULUM_GRADES,
  getCurriculumCompletion,
  getCurriculumRecord,
  getPhaseReferenceRecord,
  getSemesterPlan,
  getSubjectTargetGrades,
  getTeacherCoverage,
} from "./curriculum-utils";
import { supabaseClient } from "../../lib/supabase/client";
import { toast } from "sonner";

type IssueFilter = "all" | "missing_curriculum" | "incomplete" | "missing_teacher";

type QualityRow = {
  key: string;
  subject: any;
  grade: number;
  record?: any;
  completion: ReturnType<typeof getCurriculumCompletion>;
  teacherCoverage: ReturnType<typeof getTeacherCoverage>;
  semesterPlan?: any;
};

const issueLabels: Record<IssueFilter, string> = {
  all: "Semua tindak lanjut",
  missing_curriculum: "Belum dibuat",
  incomplete: "Perangkat belum lengkap",
  missing_teacher: "Belum ada pengampu",
};

export const CurriculumQualityControl: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [search, setSearch] = useState("");
  const [reviewTarget, setReviewTarget] = useState<QualityRow | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const subjectFilters: any[] = [];
  if (activeUnitId) subjectFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });

  const curriculumFilters: any[] = [];
  if (activeYearId) curriculumFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const scheduleFilters: any[] = [{ field: "schedule_type", operator: "eq", value: "mengajar" }];
  if (activeYearId) scheduleFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) scheduleFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const { data: subjectsData, isLoading: subjectsLoading } = useList({
    resource: "subjects",
    filters: subjectFilters,
    pagination: { pageSize: 500 },
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "*, units(id, name)" },
  });
  const { data: curriculumsData, isLoading: curriculumsLoading, refetch: refetchCurriculums } = useList({
    resource: "subject_curriculums",
    filters: curriculumFilters,
    pagination: { pageSize: 3000 },
    meta: { select: "*, subject_curriculum_semesters(*)" },
  });
  const { data: schedulesData, isLoading: schedulesLoading } = useList({
    resource: "employee_schedules",
    filters: scheduleFilters,
    pagination: { pageSize: 3000 },
    meta: { select: "id, subject_id, unit_id, class_id, classes(id, name, grade_level), employees(id, full_name)" },
  });
  const { data: classesData, isLoading: classesLoading } = useList({
    resource: "classes",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : []),
    ] as any,
    pagination: { pageSize: 1000 },
  });
  const { data: paudData } = useList({
    resource: "paud_curriculums",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : []),
    ] as any,
    pagination: { pageSize: 500 },
  });
  const { data: yearData } = useOne({
    resource: "academic_years",
    id: activeYearId || "",
    queryOptions: { enabled: Boolean(activeYearId) },
  });
  const { data: unitData } = useOne({
    resource: "units",
    id: activeUnitId || "",
    queryOptions: { enabled: Boolean(activeUnitId) },
  });
  const { data: semesterData } = useOne({
    resource: "semesters",
    id: activeSemesterId || "",
    queryOptions: { enabled: Boolean(activeSemesterId) },
  });

  const subjects = useMemo(
    () => (subjectsData?.data || []).filter((subject: any) => subject.is_active !== false),
    [subjectsData?.data],
  );
  const curriculums = useMemo(() => curriculumsData?.data || [], [curriculumsData?.data]);
  const schedules = useMemo(() => schedulesData?.data || [], [schedulesData?.data]);
  const classes = useMemo(() => classesData?.data || [], [classesData?.data]);

  const rows = useMemo<QualityRow[]>(() => {
    return subjects.flatMap((subject: any) =>
      getSubjectTargetGrades(subject).map((grade) => {
        const record = getCurriculumRecord(curriculums, String(subject.id), grade);
        const phaseRecord = getPhaseReferenceRecord(curriculums, String(subject.id), grade);
        return {
          key: `${subject.id}-${grade}`,
          subject,
          grade,
          record,
          completion: getCurriculumCompletion(record, phaseRecord, activeSemesterId),
          teacherCoverage: getTeacherCoverage(schedules, classes, subject, grade),
          semesterPlan: getSemesterPlan(record, activeSemesterId),
        };
      }),
    );
  }, [activeSemesterId, classes, curriculums, schedules, subjects]);

  const stats = useMemo(() => {
    const created = rows.filter((row) => row.record).length;
    const ready = rows.filter((row) => row.completion.ready).length;
    const coveredByTeacher = rows.filter((row) => row.teacherCoverage.complete).length;
    const khasRows = rows.filter((row) => row.subject.category === "Khas Sekolah");
    const khasReady = khasRows.filter((row) => row.completion.ready).length;
    const reviewed = rows.filter((row) => row.semesterPlan?.status === "reviewed").length;
    return { created, ready, reviewed, coveredByTeacher, khasRows: khasRows.length, khasReady };
  }, [rows]);

  const reviewQueue = useMemo(
    () => rows.filter((row) => row.record && row.completion.ready && row.teacherCoverage.complete && row.semesterPlan?.status !== "reviewed"),
    [rows],
  );

  const approveReview = async () => {
    if (!reviewTarget?.semesterPlan?.id) return toast.error("Rencana semester belum tersedia untuk ditelaah.");
    setIsReviewing(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      const { error } = await supabaseClient
        .from("subject_curriculum_semesters")
        .update({
          status: "reviewed",
          review_notes: reviewNotes.trim() || null,
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reviewTarget.semesterPlan.id);
      if (error) throw error;
      toast.success("Perangkat semester telah ditelaah", { description: `${reviewTarget.subject.name} kelas ${reviewTarget.grade}.` });
      setReviewTarget(null);
      setReviewNotes("");
      await refetchCurriculums();
    } catch (error: any) {
      toast.error("Telaah belum dapat disimpan", { description: error.message });
    } finally {
      setIsReviewing(false);
    }
  };

  const gradeSummaries = useMemo(
    () => CURRICULUM_GRADES.map((grade) => {
      const gradeRows = rows.filter((row) => row.grade === grade);
      const ready = gradeRows.filter((row) => row.completion.ready).length;
      return {
        grade,
        total: gradeRows.length,
        ready,
        percent: gradeRows.length ? Math.round((ready / gradeRows.length) * 100) : 0,
      };
    }),
    [rows],
  );

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
    const isIssue = !row.record || !row.completion.ready || !row.teacherCoverage.complete;
      const matchesType =
        issueFilter === "all" ||
        (issueFilter === "missing_curriculum" && !row.record) ||
        (issueFilter === "incomplete" && Boolean(row.record) && !row.completion.ready) ||
        (issueFilter === "missing_teacher" && !row.teacherCoverage.complete);
      const matchesSearch =
        !term ||
        row.subject.name?.toLowerCase().includes(term) ||
        row.subject.code?.toLowerCase().includes(term) ||
        row.subject.units?.name?.toLowerCase().includes(term);
      return isIssue && matchesType && matchesSearch;
    });
  }, [issueFilter, rows, search]);

  const isLoading = subjectsLoading || curriculumsLoading || schedulesLoading || classesLoading;
  const curriculumPercent = rows.length ? Math.round((stats.ready / rows.length) * 100) : 0;
  const teacherPercent = rows.length ? Math.round((stats.coveredByTeacher / rows.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Kendali Mutu Kurikulum"
        description="Pantau kesiapan dokumen dan guru pengampu per unit, tahun ajaran, mata pelajaran, dan tingkat kelas."
        action={
          <Link to="/curriculum/subjects" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <BookOpen className="h-4 w-4" /> Buka Kurikulum SD
          </Link>
        }
      />
      <CurriculumSectionNav />

      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold"><School className="h-4 w-4 text-primary" />{unitData?.data?.name || (activeUnitId ? "Unit aktif" : "Semua unit")}</span>
          <span className="inline-flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4 text-primary" />{yearData?.data?.name || "Tahun ajaran aktif"}</span>
          <span className="inline-flex items-center gap-2 font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" />Semester {semesterData?.data?.name || "aktif"}</span>
          {!activeYearId ? <span className="text-amber-700">Pilih tahun ajaran agar hasil tidak tercampur.</span> : null}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Target mapel-kelas", value: rows.length, detail: `${subjects.length} mapel aktif`, icon: BookOpen, tone: "text-blue-700 bg-blue-50" },
          { label: "Dokumen dibuat", value: stats.created, detail: `${rows.length - stats.created} belum dibuat`, icon: ClipboardCheck, tone: "text-cyan-700 bg-cyan-50" },
          { label: "Siap digunakan", value: stats.ready, detail: `${curriculumPercent}% dari target`, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" },
          { label: "Sudah ditelaah", value: stats.reviewed, detail: `${reviewQueue.length} menunggu telaah`, icon: ShieldCheck, tone: "text-teal-700 bg-teal-50" },
          { label: "Ada pengampu", value: stats.coveredByTeacher, detail: `${teacherPercent}% terpetakan`, icon: Users, tone: "text-violet-700 bg-violet-50" },
          { label: "Khas sekolah siap", value: stats.khasReady, detail: `${stats.khasRows} target kekhasan`, icon: School, tone: "text-amber-700 bg-amber-50" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></div>
            <p className="text-2xl font-bold">{isLoading ? "-" : value}</p>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border bg-card">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Kesiapan per tingkat</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lengkap berarti CP, ATP, Prota, Promes, RPPM, dan RPPH/Modul Ajar tersedia.</p>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {gradeSummaries.map((item) => (
            <Link key={item.grade} to={`/curriculum/subjects?grade_level=${item.grade}`} className="bg-card p-4 hover:bg-muted/40">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">Kelas {item.grade}</p>
                <span className="text-sm font-bold text-primary">{item.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${item.percent}%` }} /></div>
              <p className="mt-2 text-xs text-muted-foreground">{item.ready}/{item.total} mapel siap</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-teal-700" />Antrean telaah semester</h2>
            <p className="mt-1 text-sm text-muted-foreground">Hanya perangkat lengkap dengan pengampu seluruh rombel yang dapat dinyatakan telah ditelaah.</p>
          </div>
          <span className="w-fit rounded-md bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">{reviewQueue.length} menunggu</span>
        </div>
        {reviewQueue.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Belum ada perangkat baru yang siap ditelaah.</div>
        ) : (
          <div className="divide-y">
            {reviewQueue.slice(0, 20).map((row) => (
              <div key={`review-${row.key}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{row.subject.name} - Kelas {row.grade}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Perangkat 100% lengkap | Pengampu {row.teacherCoverage.covered}/{row.teacherCoverage.total} rombel</p>
                </div>
                <button onClick={() => { setReviewTarget(row); setReviewNotes(""); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100">
                  <ClipboardCheck className="h-4 w-4" /> Telaah
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-amber-600" />Antrean tindak lanjut</h2>
              <p className="mt-1 text-sm text-muted-foreground">Prioritaskan data yang belum dibuat, belum lengkap, atau belum memiliki guru pengampu.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari mapel atau unit..." className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm sm:w-64" />
              </div>
              <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value as IssueFilter)} className="rounded-md border bg-background px-3 py-2 text-sm">
                {Object.entries(issueLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" />{filteredIssues.length} item memerlukan tindak lanjut</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="px-5 py-3">Mata Pelajaran</th><th className="px-5 py-3">Kelas</th><th className="px-5 py-3">Kelengkapan</th><th className="px-5 py-3">Pengampu</th><th className="px-5 py-3">Kekurangan</th><th className="px-5 py-3 text-right">Tindakan</th></tr>
            </thead>
            <tbody className="divide-y">
              {filteredIssues.slice(0, 100).map((row) => {
                const params = new URLSearchParams({ subject_id: String(row.subject.id), grade_level: String(row.grade) });
                if (activeYearId) params.set("academic_year_id", activeYearId);
                const target = row.record ? `/curriculum/subject-curriculums/edit/${row.record.id}` : `/curriculum/subject-curriculums/create?${params}`;
                const missing = [!row.record ? "Dokumen belum dibuat" : row.completion.missing.join(", "), !row.teacherCoverage.complete ? "Guru pengampu belum mencakup semua rombel" : ""].filter(Boolean).join("; ");
                return (
                  <tr key={row.key} className="hover:bg-muted/30">
                    <td className="px-5 py-4"><p className="font-semibold">{row.subject.name}</p><p className="text-xs text-muted-foreground">{row.subject.units?.name || "Unit belum dipilih"} | {row.subject.category || "-"}</p></td>
                    <td className="px-5 py-4 font-semibold">Kelas {row.grade}</td>
                    <td className="px-5 py-4"><div className="flex min-w-36 items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full ${row.completion.ready ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${row.completion.percent}%` }} /></div><span className="text-xs font-bold">{row.completion.percent}%</span></div></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${row.teacherCoverage.complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.teacherCoverage.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{row.teacherCoverage.covered}/{row.teacherCoverage.total} rombel</span></td>
                    <td className="max-w-xs px-5 py-4 text-xs text-muted-foreground">{missing}</td>
                    <td className="px-5 py-4 text-right"><Link to={target} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{row.record ? "Lengkapi" : "Buat"}<ChevronRight className="h-4 w-4" /></Link></td>
                  </tr>
                );
              })}
              {!isLoading && filteredIssues.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-emerald-600" /><p className="font-semibold">Tidak ada tindak lanjut pada filter ini</p></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 lg:col-span-2">
          <h2 className="text-lg font-bold">Standar mutu yang dipantau</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["CP dan ATP konsisten dalam satu fase", "Perangkat ajar tersedia per tingkat kelas", "Setiap mapel-kelas memiliki guru pengampu", "Mapel khas sekolah tercakup dan siap digunakan"].map((label) => <div key={label} className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{label}</span></div>)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Dokumen PAUD pada konteks aktif</p>
          <p className="mt-2 text-3xl font-bold">{paudData?.data?.length || 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">Fase Fondasi dan modul tingkat tersimpan.</p>
          <Link to="/curriculum/paud" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Periksa Kurikulum PAUD <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {reviewTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <section className="w-full max-w-lg rounded-t-lg bg-card p-5 shadow-xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-bold">Telaah Perangkat Semester</h2><p className="mt-1 text-sm text-muted-foreground">{reviewTarget.subject.name} - Kelas {reviewTarget.grade} - Semester {semesterData?.data?.name || "aktif"}</p></div>
              <button onClick={() => setReviewTarget(null)} title="Tutup" className="flex h-9 w-9 items-center justify-center rounded-md bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">Pemeriksaan sistem lulus</p>
              <p className="mt-1 text-xs text-muted-foreground">CP, ATP, Prota, Promes, RPPM, modul ajar, dan penugasan seluruh rombel telah tersedia.</p>
            </div>
            <label className="mt-4 block text-sm font-semibold">Catatan telaah<textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={4} maxLength={1000} placeholder="Catatan perbaikan, kesesuaian, atau keputusan telaah (opsional)" className="mt-2 w-full rounded-md border bg-background p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" /></label>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setReviewTarget(null)} className="rounded-md border px-4 py-2 text-sm font-semibold">Batal</button><button onClick={() => void approveReview()} disabled={isReviewing} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Nyatakan Ditelaah</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
};
