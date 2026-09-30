/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useList } from "@/lib/refine-compat";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Laptop,
  School,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { PAUD_LEARNING_MODE_LABELS, PAUD_PHASES } from "./paud-config";
import { usePaudScope } from "./use-paud-scope";
import { PaudScopeBar } from "./components/PaudScopeBar";

const quickLinks = [
  {
    title: "Kurikulum Fase Fondasi",
    description: "ATP, Prota, Prosem, RPPM, dan RPPH per tahun ajaran.",
    href: "/curriculum/paud",
    icon: BookOpen,
  },
  {
    title: "Jurnal Observasi",
    description: "Bukti belajar kelas, live meet, tugas rumah, dan laporan pendamping HBL.",
    href: "/paud-activities",
    icon: Camera,
  },
  {
    title: "Asesmen Awal · Tengah · Akhir",
    description: "Capaian tiga elemen Kurikulum Merdeka per semester dan laporan ke orang tua.",
    href: "/stppa-assessments",
    icon: ClipboardCheck,
  },
  {
    title: "Preschool HBL",
    description: "Program homeschooling: pertemuan, lembar kerja, dan home project.",
    href: "/lms",
    icon: Laptop,
  },
  {
    title: "Pola Kegiatan Unit",
    description: "Atur kegiatan serentak unit dan jadwal khusus setiap kelas.",
    href: "/schedules/patterns",
    icon: CalendarCheck,
  },
];

export const PaudDashboard: React.FC = () => {
  const scope = usePaudScope();
  const { activeYearId, activeSemesterId } = scope;

  const periodFilters: any[] = [];
  if (activeYearId) periodFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) periodFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const activitiesQuery = useList({
    resource: "paud_activities",
    filters: periodFilters,
    pagination: { mode: "off" },
    meta: { select: "id,student_id,class_id,date,status,learning_mode" },
  });
  const assessmentsQuery = useList({
    resource: "paud_stppa_assessments",
    filters: periodFilters,
    pagination: { mode: "off" },
    meta: { select: "id,student_id,class_id,date,status,phase,parent_reflection" },
  });
  const curriculumQuery = useList({
    resource: "paud_curriculums",
    filters: [
      { field: "unit_id", operator: "in", value: scope.unitIds },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: scope.unitIds.length > 0 },
    meta: { select: "id,unit_id,grade_level,atp_text,rppm_data,rpph_data" },
  });

  const classes = scope.classes;
  const classIds = new Set(classes.map((item) => item.id));
  const students = scope.students.filter((item) => classIds.has(item.class_id || ""));
  const studentIds = new Set(students.map((item) => item.id));
  const onlineCount = students.filter((item) => scope.studentMode(item) === "online").length;
  const activities = (activitiesQuery.data?.data || []).filter((item: any) => studentIds.has(item.student_id));
  const assessments = (assessmentsQuery.data?.data || []).filter((item: any) => studentIds.has(item.student_id));
  const curricula = scope.unitIds.length ? curriculumQuery.data?.data || [] : [];
  const observedStudentIds = new Set<string>(activities.map((item: any) => item.student_id));
  const publishedByPhase = (phase: string) => new Set<string>(assessments.filter((item: any) => item.phase === phase && item.status === "published").map((item: any) => item.student_id));
  const phaseSets = Object.fromEntries(PAUD_PHASES.map((phase) => [phase.id, publishedByPhase(phase.id)])) as Record<string, Set<string>>;
  const pct = (count: number) => (students.length ? Math.round((count / students.length) * 100) : 0);
  const observationCoverage = pct(observedStudentIds.size);
  const curriculumReady = classes.length > 0 && classes.every((classItem) =>
    curricula.some((item: any) => item.unit_id === classItem.unit_id && item.grade_level === classItem.grade_level && item.rppm_data && item.rpph_data),
  );
  const reflections = assessments.filter((item: any) => item.parent_reflection).length;
  const hasError = scope.isError || [activitiesQuery, assessmentsQuery, curriculumQuery].some((query) => query.isError);
  const isLoading = scope.isLoading || [activitiesQuery, assessmentsQuery].some((query) => query.isLoading);

  const classCoverage = classes.map((classItem) => {
    const classStudents = students.filter((student) => student.class_id === classItem.id);
    const count = (set: Set<string>) => classStudents.filter((student) => set.has(student.id)).length;
    return {
      ...classItem,
      mode: scope.unitById.get(classItem.unit_id)?.delivery_mode || "reguler",
      studentCount: classStudents.length,
      observed: count(observedStudentIds),
      phases: Object.fromEntries(PAUD_PHASES.map((phase) => [phase.id, count(phaseSets[phase.id])])) as Record<string, number>,
    };
  });
  const attentionItems = [
    !scope.units.length && !scope.isLoading ? "Belum ada unit berjenjang Preschool. Atur jenjang unit pada Master Data." : null,
    !activeYearId || !activeSemesterId ? "Aktifkan tahun ajaran dan semester untuk mengunci periode pencatatan." : null,
    !curriculumReady ? "Kurikulum Fase Fondasi (RPPM/RPPH) belum lengkap untuk semua tingkat kelas aktif." : null,
    observationCoverage < 100 && students.length ? `${students.length - observedStudentIds.size} anak belum memiliki bukti observasi pada semester aktif.` : null,
    ...PAUD_PHASES.map((phase) => {
      const missing = students.length - phaseSets[phase.id].size;
      return missing > 0 ? `${missing} anak belum memiliki ${phase.title.toLowerCase()} yang terbit (${phase.timing.toLowerCase()}).` : null;
    }),
  ].filter(Boolean) as string[];
  const title = scope.units.length === 1 ? scope.units[0].name : scope.units.length ? `${scope.units.length} unit PAUD/TK` : "Unit PAUD/TK";

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Pusat Mutu PAUD/TK"
        description="Perencanaan, observasi autentik, asesmen Kurikulum Merdeka, dan komunikasi keluarga untuk layanan reguler maupun Preschool HBL."
        action={
          <Link to="/paud-activities/create" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Camera className="h-4 w-4" /> Catat Observasi
          </Link>
        }
      />

      <PaudScopeBar mode={scope.mode} onModeChange={scope.setMode} units={scope.units} activeIsPaud={scope.activeIsPaud} activeIsOtherLevel={scope.activeIsOtherLevel} hasOnlineUnit={scope.hasOnlineUnit} />

      {hasError && (
        <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Data PAUD/TK belum dapat dimuat lengkap</p>
            <p className="mt-1 text-sm">Periksa koneksi dan hak akses unit pengguna.</p>
          </div>
        </div>
      )}

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Konteks pengelolaan</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold"><School className="h-5 w-5 text-primary" /> {title}</h2>
          </div>
          <span className="w-fit rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {scope.semester ? `Semester ${scope.semester.name}` : "Semester belum aktif"}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={Users} label="Anak aktif" value={isLoading ? "..." : students.length} note={`${students.length - onlineCount} reguler · ${onlineCount} online`} tone="text-sky-700 bg-sky-50" />
          <Metric icon={Camera} label="Cakupan observasi" value={isLoading ? "..." : `${observationCoverage}%`} note={`${observedStudentIds.size}/${students.length} anak`} tone="text-violet-700 bg-violet-50" />
          <Metric icon={ClipboardCheck} label="Asesmen akhir terbit" value={isLoading ? "..." : `${pct(phaseSets.akhir.size)}%`} note={`Awal ${phaseSets.awal.size} · Tengah ${phaseSets.tengah.size} · Akhir ${phaseSets.akhir.size}`} tone="text-emerald-700 bg-emerald-50" />
          <Metric icon={CheckCircle2} label="Kurikulum" value={isLoading ? "..." : curriculumReady ? "Siap" : "Perlu dilengkapi"} note={`${curricula.length} dokumen · ${reflections} tanggapan orang tua`} tone="text-amber-700 bg-amber-50" />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold">Alur kerja PAUD/TK</h2>
          <p className="text-sm text-muted-foreground">Rencanakan, kumpulkan bukti, lalu laporkan perkembangan di awal, tengah, dan akhir semester.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <p className="mt-1 text-sm text-muted-foreground">Jumlah anak dengan bukti observasi dan asesmen yang sudah terbit pada semester aktif.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-3 py-3 text-center">Anak</th>
                  <th className="px-3 py-3 text-center">Observasi</th>
                  {PAUD_PHASES.map((phase) => <th key={phase.id} className="px-3 py-3 text-center">{phase.shortTitle}</th>)}
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!classCoverage.length ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Belum ada kelas PAUD/TK pada tahun ajaran aktif.</td></tr>
                ) : classCoverage.map((item) => {
                  const complete = item.studentCount > 0 && item.observed === item.studentCount && item.phases.akhir === item.studentCount;
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{PAUD_LEARNING_MODE_LABELS[item.mode]}</p>
                      </td>
                      <td className="px-3 py-3 text-center">{item.studentCount}</td>
                      <td className="px-3 py-3 text-center">{item.observed}/{item.studentCount}</td>
                      {PAUD_PHASES.map((phase) => <td key={phase.id} className="px-3 py-3 text-center">{item.phases[phase.id]}/{item.studentCount}</td>)}
                      <td className="px-5 py-3">
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
