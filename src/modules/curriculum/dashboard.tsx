import React, { useMemo } from "react";
import { useList, useOne } from "@refinedev/core";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Palette,
  Plus,
  School,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { CurriculumSectionNav } from "./components/CurriculumSectionNav";
import {
  getCurriculumCompletion,
  getCurriculumRecord,
  getPhaseReferenceRecord,
  getSubjectTargetGrades,
} from "./curriculum-utils";

export const CurriculumDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { data: subjectsData, isLoading: subjectsLoading } = useList({
    resource: "subjects",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { pageSize: 500 },
    meta: { select: "*, units(id, name)" },
  });
  const { data: subjectCurriculumsData, isLoading: curriculumLoading } = useList({
    resource: "subject_curriculums",
    filters: activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : [],
    pagination: { pageSize: 3000 },
    meta: { select: "*, subject_curriculum_semesters(*)" },
  });
  const { data: paudCurriculumsData } = useList({
    resource: "paud_curriculums",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : []),
    ] as any,
    pagination: { pageSize: 500 },
  });
  const { data: documentsData } = useList({
    resource: "curriculum_documents",
    filters: activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : [],
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
  const curriculums = subjectCurriculumsData?.data || [];
  const readiness = useMemo(() => {
    const rows = subjects.flatMap((subject: any) =>
      getSubjectTargetGrades(subject).map((grade) => {
        const record = getCurriculumRecord(curriculums, String(subject.id), grade);
        const phaseRecord = getPhaseReferenceRecord(curriculums, String(subject.id), grade);
        return { subject, grade, record, completion: getCurriculumCompletion(record, phaseRecord, activeSemesterId) };
      }),
    );
    return {
      rows,
      created: rows.filter((row) => row.record).length,
      ready: rows.filter((row) => row.completion.ready).length,
      missing: rows.filter((row) => !row.record).length,
      incomplete: rows.filter((row) => row.record && !row.completion.ready).length,
    };
  }, [activeSemesterId, curriculums, subjects]);

  const isLoading = subjectsLoading || curriculumLoading;
  const readyPercent = readiness.rows.length ? Math.round((readiness.ready / readiness.rows.length) * 100) : 0;
  const primaryIssue = readiness.missing > 0
    ? `${readiness.missing} kurikulum mapel-kelas belum dibuat`
    : readiness.incomplete > 0
      ? `${readiness.incomplete} kurikulum perlu dilengkapi`
      : "Kurikulum SD pada konteks aktif sudah lengkap";

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Kurikulum & Pembelajaran"
        description="Kelola kurikulum per unit dan tahun ajaran, pantau kesiapan perangkat ajar, serta tindak lanjuti kekurangan."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/curriculum/quality" className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
              <ClipboardCheck className="h-4 w-4" /> Periksa Mutu
            </Link>
            <Link to="/curriculum/subjects/create" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Tambah Mata Pelajaran
            </Link>
          </div>
        }
      />
      <CurriculumSectionNav />

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Konteks kerja</p>
            <h2 className="mt-1 text-xl font-bold">{unitData?.data?.name || (activeUnitId ? "Unit aktif" : "Seluruh unit")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tahun ajaran {yearData?.data?.name || "aktif"}, Semester {semesterData?.data?.name || "aktif"}. Semua indikator mengikuti pilihan global ini.</p>
          </div>
          <div className={`flex max-w-xl items-start gap-3 rounded-md border p-4 ${readiness.missing || readiness.incomplete ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            {readiness.missing || readiness.incomplete ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
            <div><p className="text-sm font-semibold">Prioritas saat ini</p><p className="mt-0.5 text-sm">{isLoading ? "Menghitung kesiapan kurikulum..." : primaryIssue}</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Mata pelajaran aktif", value: subjects.length, detail: "Data induk pada unit aktif", icon: BookOpen, tone: "bg-blue-50 text-blue-700" },
          { label: "Target mapel-kelas", value: readiness.rows.length, detail: `${readiness.created} dokumen sudah dibuat`, icon: School, tone: "bg-cyan-50 text-cyan-700" },
          { label: "Siap digunakan", value: readiness.ready, detail: `${readyPercent}% lengkap`, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Kurikulum PAUD", value: paudCurriculumsData?.data?.length || 0, detail: "Dokumen pada konteks aktif", icon: Palette, tone: "bg-violet-50 text-violet-700" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></div>
            <p className="text-2xl font-bold">{isLoading ? "-" : value}</p>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-4 border-b p-5">
            <div><h2 className="text-lg font-bold">Alur kerja kurikulum</h2><p className="mt-1 text-sm text-muted-foreground">Gunakan urutan ini agar data induk dan perangkat ajar tidak tertukar.</p></div>
            <Link to="/curriculum/quality" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Lihat semua <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="divide-y">
            {[
              { title: "1. Tetapkan mata pelajaran dan tingkat", detail: "Satu mapel disimpan sekali per unit, lalu dialokasikan ke kelas yang membutuhkan.", href: "/curriculum/subjects", icon: BookOpen },
              { title: "2. Susun kurikulum per kelas", detail: "CP dan ATP mengikuti fase; Prota, Promes, RPPM, dan modul ajar mengikuti tingkat kelas.", href: "/curriculum/subjects", icon: ClipboardCheck },
              { title: "3. Pastikan guru pengampu tersedia", detail: "Periksa jadwal mengajar agar setiap mapel-kelas memiliki guru yang bertanggung jawab.", href: "/curriculum/subjects/directory", icon: Users },
              { title: "4. Tinjau kesiapan sebelum pembelajaran", detail: "Gunakan Kendali Mutu untuk menemukan dokumen atau penugasan yang masih kurang.", href: "/curriculum/quality", icon: CheckCircle2 },
            ].map(({ title, detail, href, icon: Icon }) => (
              <Link key={title} to={href} className="flex items-start gap-4 p-5 hover:bg-muted/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>
                <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-lg font-bold">Kelengkapan SD</h2>
            <div className="mt-4 flex items-end justify-between gap-3"><span className="text-3xl font-bold">{readyPercent}%</span><span className="text-sm text-muted-foreground">{readiness.ready}/{readiness.rows.length} target siap</span></div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${readyPercent}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-md border bg-muted/20 p-3"><p className="text-xl font-bold text-amber-700">{readiness.missing}</p><p className="text-xs text-muted-foreground">Belum dibuat</p></div><div className="rounded-md border bg-muted/20 p-3"><p className="text-xl font-bold text-blue-700">{readiness.incomplete}</p><p className="text-xs text-muted-foreground">Belum lengkap</p></div></div>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Lampiran kebijakan</h2><p className="mt-1 text-sm text-muted-foreground">{documentsData?.data?.length || 0} SK, panduan, template, atau referensi.</p></div><FileText className="h-5 w-5 text-primary" /></div>
            <Link to="/curriculum/documents" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Kelola lampiran <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Integrasi program khas sekolah Islam</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kurikulum menetapkan arah dan target; pelaksanaan harian, asesmen, dan laporan tetap dicatat pada modul program terkait.</p>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          {[
            { title: "Tahfidz & Mutaba'ah", detail: "Kelola halaqoh, target hafalan, ziyadah harian, munaqosyah, dan laporan.", href: "/tahfidz-halaqohs", icon: BookOpen },
            { title: "Tahsin", detail: "Kelola halaqoh, target tilawah atau jilid, jurnal harian, dan ujian kenaikan.", href: "/tahsin-halaqohs", icon: Users },
            { title: "Target Quran Klasikal", detail: "Selaraskan target per kelas dengan kurikulum mapel khas dan periode aktif.", href: "/quran-targets", icon: ClipboardCheck },
          ].map(({ title, detail, href, icon: Icon }) => (
            <Link key={title} to={href} className="flex items-start gap-4 bg-card p-5 hover:bg-muted/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
