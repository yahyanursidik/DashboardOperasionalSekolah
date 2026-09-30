/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useList } from "@/lib/refine-compat";
import { Link } from "react-router";
import { CheckCircle2, ClipboardCheck, MessageSquareQuote, Printer, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import {
  PAUD_CP_ELEMENTS,
  PAUD_LEARNING_MODE_LABELS,
  PAUD_PHASES,
  PAUD_SCALE_TONES,
  type PaudPhaseId,
  type PaudScale,
} from "./paud-config";
import { printPaudReport } from "./paud-report";
import { usePaudScope } from "./use-paud-scope";
import { PaudScopeBar } from "./components/PaudScopeBar";

const db = supabaseClient as any;

export const StppaAssessmentsList: React.FC = () => {
  const scope = usePaudScope();
  const { appName } = useSystemSettings();
  const [classId, setClassId] = React.useState("");
  const [search, setSearch] = React.useState("");

  const { data, isLoading, isError } = useList({
    resource: "paud_stppa_assessments",
    filters: [
      ...(scope.activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: scope.activeYearId }] : []),
      ...(scope.activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: scope.activeSemesterId }] : []),
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(scope.activeSemesterId) },
    meta: { select: "id,student_id,phase,status,is_parent_visible,date,nab_scale,jati_diri_scale,steam_scale,parent_reflection" },
  });

  const byStudent = React.useMemo(() => {
    const map = new Map<string, Partial<Record<PaudPhaseId, any>>>();
    (data?.data || []).forEach((record: any) => {
      if (!record.phase) return;
      const entry = map.get(record.student_id) || {};
      entry[record.phase as PaudPhaseId] = record;
      map.set(record.student_id, entry);
    });
    return map;
  }, [data]);

  const keyword = search.trim().toLowerCase();
  const students = scope.students
    .filter((student) => scope.classById.has(student.class_id || ""))
    .filter((student) => !classId || student.class_id === classId)
    .filter((student) => !keyword || [student.full_name, student.nickname, student.nis].some((value) => String(value || "").toLowerCase().includes(keyword)))
    .sort((a, b) => String(scope.classById.get(a.class_id || "")?.name).localeCompare(String(scope.classById.get(b.class_id || "")?.name)) || a.full_name.localeCompare(b.full_name));

  const phaseStats = PAUD_PHASES.map((phase) => {
    const records = students.map((student) => byStudent.get(student.id)?.[phase.id]).filter(Boolean);
    return {
      ...phase,
      filled: records.length,
      published: records.filter((record: any) => record.status === "published").length,
    };
  });
  const reflections = students.filter((student) => Object.values(byStudent.get(student.id) || {}).some((record: any) => record?.parent_reflection)).length;

  const printStudent = async (student: any) => {
    const { data: records, error } = await db.from("paud_stppa_assessments").select("*, employees(full_name)")
      .eq("student_id", student.id).eq("semester_id", scope.activeSemesterId);
    if (error || !records?.length) {
      toast.error(error ? `Laporan gagal dimuat: ${error.message}` : "Belum ada asesmen untuk dicetak.");
      return;
    }
    const classItem = scope.classById.get(student.class_id || "");
    printPaudReport({
      schoolName: appName,
      unitName: scope.unitById.get(student.unit_id || "")?.name,
      className: classItem?.name,
      semesterName: scope.semester?.name,
      student,
      assessments: records,
      learningMode: scope.studentMode(student),
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Asesmen Kurikulum Merdeka"
        description="Asesmen awal, tengah, dan akhir semester untuk setiap anak KB/TK reguler maupun Preschool HBL, lengkap dengan laporan ke portal orang tua."
      />

      <PaudScopeBar mode={scope.mode} onModeChange={(mode) => { scope.setMode(mode); setClassId(""); }} units={scope.units} activeIsPaud={scope.activeIsPaud} activeIsOtherLevel={scope.activeIsOtherLevel} hasOnlineUnit={scope.hasOnlineUnit} />

      {!scope.activeSemesterId && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Semester aktif belum dipilih. Asesmen dicatat per semester.</div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {phaseStats.map((phase) => (
          <div key={phase.id} className="rounded-lg border bg-card p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">{phase.title}</p>
            <p className="mt-1 text-2xl font-bold">{phase.filled}<span className="text-base font-semibold text-muted-foreground">/{students.length}</span></p>
            <p className="text-xs text-muted-foreground"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />{phase.published} terbit · {phase.timing}</p>
          </div>
        ))}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Tanggapan orang tua</p>
          <p className="mt-1 text-2xl font-bold">{reflections}</p>
          <p className="text-xs text-muted-foreground"><MessageSquareQuote className="mr-1 inline h-3.5 w-3.5 text-sky-600" />anak dengan tanggapan keluarga</p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_260px]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama anak atau NIS..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
          </label>
          <select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Semua kelas PAUD/TK</option>
            {scope.classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {PAUD_LEARNING_MODE_LABELS[scope.unitById.get(item.unit_id)?.delivery_mode || "reguler"]}</option>
            ))}
          </select>
        </div>
      </section>

      {(isError || scope.isError) && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Asesmen belum dapat dimuat. Periksa koneksi atau hak akses unit Anda.</div>
      )}

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Anak</th>
                {PAUD_PHASES.map((phase) => <th key={phase.id} className="px-3 py-3">{phase.title}</th>)}
                <th className="px-4 py-3 text-right">Laporan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading || scope.isLoading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Memuat data asesmen...</td></tr>
              ) : !students.length ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8 opacity-30" />Belum ada anak aktif pada kelas PAUD/TK tahun ajaran ini.</td></tr>
              ) : students.map((student) => {
                const entry = byStudent.get(student.id) || {};
                const mode = scope.studentMode(student);
                const hasAny = Object.keys(entry).length > 0;
                return (
                  <tr key={student.id} className="align-top hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-bold">{student.full_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{scope.classById.get(student.class_id || "")?.name || "-"}</p>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${mode === "online" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>{PAUD_LEARNING_MODE_LABELS[mode]}</span>
                    </td>
                    {PAUD_PHASES.map((phase) => {
                      const record = entry[phase.id];
                      return (
                        <td key={phase.id} className="px-3 py-3">
                          <Link
                            to={`/stppa-assessments/create?student=${student.id}&phase=${phase.id}`}
                            className={`block rounded-md border p-2 transition-colors hover:border-primary/50 ${!record ? "border-dashed text-muted-foreground" : ""}`}
                          >
                            {!record ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold"><ClipboardCheck className="h-3.5 w-3.5" /> Isi asesmen</span>
                            ) : (
                              <>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${record.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  {record.status === "published" ? (record.is_parent_visible ? "Terbit" : "Internal") : "Draf"}
                                </span>
                                <div className="mt-1.5 flex gap-1">
                                  {PAUD_CP_ELEMENTS.map((element) => {
                                    const scale = record[`${element.id}_scale`] as PaudScale | null;
                                    return (
                                      <span key={element.id} title={element.title} className={`min-w-9 rounded border px-1 py-0.5 text-center text-[10px] font-bold ${scale ? PAUD_SCALE_TONES[scale] : "text-muted-foreground"}`}>
                                        {scale || "–"}
                                      </span>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </Link>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <button type="button" title="Cetak laporan perkembangan" disabled={!hasAny} onClick={() => void printStudent(student)} className="rounded-md p-2 text-primary hover:bg-primary/10 disabled:opacity-30">
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">Urutan kotak capaian: {PAUD_CP_ELEMENTS.map((element) => element.shortTitle).join(" · ")}.</p>
      </section>
    </div>
  );
};

