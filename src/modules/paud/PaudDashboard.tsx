/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  School,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";

const quickLinks = [
  {
    title: "Kurikulum Fase Fondasi",
    description: "ATP, Prota, Prosem, RPPM, dan RPPH per tahun ajaran.",
    href: "/curriculum/paud",
    icon: BookOpen,
  },
  {
    title: "Jurnal Observasi",
    description: "Bukti belajar, aspek perkembangan, nilai Islam, dan tindak lanjut.",
    href: "/paud-activities",
    icon: Camera,
  },
  {
    title: "Asesmen STPPA",
    description: "Capaian enam aspek, pertumbuhan, dan kemitraan dengan orang tua.",
    href: "/stppa-assessments",
    icon: ClipboardCheck,
  },
  {
    title: "Pola Kegiatan Unit",
    description: "Atur kegiatan serentak unit dan jadwal khusus setiap kelas.",
    href: "/schedules/patterns",
    icon: CalendarCheck,
  },
];

export const PaudDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const classFilters: any[] = [];
  if (activeUnitId) classFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) classFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const studentFilters: any[] = [{ field: "status", operator: "eq", value: "active" }];
  if (activeUnitId) studentFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });

  const periodFilters: any[] = [];
  if (activeYearId) periodFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) periodFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const classesQuery = useList({
    resource: "classes",
    filters: classFilters,
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "id,name,unit_id,grade_level" },
  });
  const studentsQuery = useList({
    resource: "students",
    filters: studentFilters,
    pagination: { mode: "off" },
    meta: { select: "id,full_name,class_id,unit_id" },
  });
  const activitiesQuery = useList({
    resource: "paud_activities",
    filters: periodFilters,
    pagination: { mode: "off" },
    meta: { select: "id,student_id,class_id,date,status" },
  });
  const assessmentsQuery = useList({
    resource: "paud_stppa_assessments",
    filters: periodFilters,
    pagination: { mode: "off" },
    meta: { select: "id,student_id,class_id,date,status" },
  });
  const curriculumQuery = useList({
    resource: "paud_curriculums",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    pagination: { mode: "off" },
    meta: { select: "id,grade_level,atp_text,prota_data,prosem_data,rppm_data,rpph_data" },
  });
  const unitQuery = useList({
    resource: "units",
    filters: activeUnitId ? [{ field: "id", operator: "eq", value: activeUnitId }] : [],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: Boolean(activeUnitId) },
    meta: { select: "id,name,education_level" },
  });

  const classes = classesQuery.data?.data || [];
  const classIds = new Set(classes.map((item: any) => item.id));
  const students = (studentsQuery.data?.data || []).filter((item: any) => !classes.length || classIds.has(item.class_id));
  const studentIds = new Set(students.map((item: any) => item.id));
  const activities = (activitiesQuery.data?.data || []).filter((item: any) => studentIds.has(item.student_id));
  const assessments = (assessmentsQuery.data?.data || []).filter((item: any) => studentIds.has(item.student_id));
  const curricula = curriculumQuery.data?.data || [];
  const observedStudentIds = new Set(activities.map((item: any) => item.student_id));
  const assessedStudentIds = new Set(assessments.map((item: any) => item.student_id));
  const assessmentCoverage = students.length ? Math.round((assessedStudentIds.size / students.length) * 100) : 0;
  const observationCoverage = students.length ? Math.round((observedStudentIds.size / students.length) * 100) : 0;
  const curriculumReady = curricula.some((item: any) => item.grade_level === 0)
    && [...new Set(classes.map((item: any) => item.grade_level))].every((level) =>
      curricula.some((item: any) => item.grade_level === level && item.rppm_data && item.rpph_data),
    );
  const hasError = [
    classesQuery,
    studentsQuery,
    activitiesQuery,
    assessmentsQuery,
    curriculumQuery,
  ].some((query) => query.isError);
  const isLoading = [
    classesQuery,
    studentsQuery,
    activitiesQuery,
    assessmentsQuery,
    curriculumQuery,
  ].some((query) => query.isLoading);

  const classCoverage = classes.map((classItem: any) => {
    const classStudents = students.filter((student: any) => student.class_id === classItem.id);
    const observed = classStudents.filter((student: any) => observedStudentIds.has(student.id)).length;
    const assessed = classStudents.filter((student: any) => assessedStudentIds.has(student.id)).length;
    return { ...classItem, studentCount: classStudents.length, observed, assessed };
  });
  const attentionItems = [
    !activeUnitId ? "Pilih unit PAUD/TK agar indikator mutu tidak bercampur dengan unit lain." : null,
    !activeYearId || !activeSemesterId ? "Aktifkan tahun ajaran dan semester untuk mengunci periode pencatatan." : null,
    !curriculumReady ? "Kurikulum Fase Fondasi atau modul tingkat belum lengkap untuk kelas aktif." : null,
    observationCoverage < 100 ? `${students.length - observedStudentIds.size} anak belum memiliki bukti observasi pada semester aktif.` : null,
    assessmentCoverage < 100 ? `${students.length - assessedStudentIds.size} anak belum memiliki asesmen STPPA pada semester aktif.` : null,
  ].filter(Boolean) as string[];
  const unitName = (unitQuery.data?.data?.[0] as any)?.name || (activeUnitId ? "Unit aktif" : "Lintas unit");

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Pusat Mutu PAUD/TK"
        description="Kendalikan perencanaan, observasi autentik, asesmen perkembangan, dan komunikasi keluarga dalam satu alur."
        action={
          <Link to="/paud-activities/create" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Camera className="h-4 w-4" /> Catat Observasi
          </Link>
        }
      />

      {hasError && (
        <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Data PAUD/TK belum dapat dimuat lengkap</p>
            <p className="mt-1 text-sm">Pastikan migrasi modul PAUD/TK terbaru telah dijalankan dan akses unit pengguna sudah sesuai.</p>
          </div>
        </div>
      )}

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Konteks pengelolaan</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold"><School className="h-5 w-5 text-primary" /> {unitName}</h2>
          </div>
          <span className="w-fit rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            Tahun ajaran dan semester aktif
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={Users} label="Anak aktif" value={isLoading ? "..." : students.length} note={`${classes.length} rombel`} tone="text-sky-700 bg-sky-50" />
          <Metric icon={Camera} label="Cakupan observasi" value={isLoading ? "..." : `${observationCoverage}%`} note={`${observedStudentIds.size}/${students.length} anak`} tone="text-violet-700 bg-violet-50" />
          <Metric icon={ClipboardCheck} label="Cakupan STPPA" value={isLoading ? "..." : `${assessmentCoverage}%`} note={`${assessedStudentIds.size}/${students.length} anak`} tone="text-emerald-700 bg-emerald-50" />
          <Metric icon={CheckCircle2} label="Kurikulum" value={isLoading ? "..." : curriculumReady ? "Siap" : "Perlu dilengkapi"} note={`${curricula.length} dokumen`} tone="text-amber-700 bg-amber-50" />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold">Alur kerja PAUD/TK</h2>
          <p className="text-sm text-muted-foreground">Masuk ke pekerjaan sesuai tahap, tanpa berpindah-pindah menu yang rancu.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.href} to={item.href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]">
              <div className="flex items-start justify-between">
                <span className="rounded-md bg-muted p-2 text-primary"><item.icon className="h-5 w-5" /></span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">Cakupan per kelas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Setiap anak perlu memiliki bukti observasi dan asesmen pada periode aktif.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-5 py-3 text-center">Anak</th>
                  <th className="px-5 py-3">Observasi</th>
                  <th className="px-5 py-3">STPPA</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!classCoverage.length ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Belum ada kelas aktif pada konteks ini.</td></tr>
                ) : classCoverage.map((item: any) => {
                  const complete = item.studentCount > 0 && item.observed === item.studentCount && item.assessed === item.studentCount;
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-semibold">{item.name}</td>
                      <td className="px-5 py-4 text-center">{item.studentCount}</td>
                      <td className="px-5 py-4">{item.observed}/{item.studentCount}</td>
                      <td className="px-5 py-4">{item.assessed}/{item.studentCount}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {complete ? "Lengkap" : "Tindak lanjut"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold">Prioritas mutu</h2>
          </div>
          <div className="mt-4 space-y-3">
            {!attentionItems.length ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Seluruh komponen dasar periode aktif telah lengkap. Lanjutkan refleksi dan penguatan kegiatan.
              </div>
            ) : attentionItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-md border bg-muted/20 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span className="leading-5">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

function Metric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  note: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <span className={`inline-flex rounded-md p-2 ${tone}`}><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
