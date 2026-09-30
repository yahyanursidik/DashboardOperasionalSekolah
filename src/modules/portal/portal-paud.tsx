/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import { Link, useOutletContext } from "react-router";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckCircle2,
  HeartHandshake,
  Laptop,
  Loader2,
  MessageSquareQuote,
  NotebookPen,
  Printer,
  Ruler,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import {
  formatPaudDate,
  HBL_DOMAIN_LABELS,
  HBL_STAGE_LABELS,
  PAUD_ASPECTS,
  PAUD_CP_ELEMENTS,
  PAUD_EVIDENCE_SOURCE_LABELS,
  PAUD_LEARNING_MODE_LABELS,
  PAUD_PHASES,
  PAUD_SCALE_LABELS,
  PAUD_SCALE_RANK,
  PAUD_SCALE_TONES,
  type PaudPhaseId,
  type PaudScale,
} from "../paud/paud-config";
import { printPaudReport } from "../paud/paud-report";
import { StoredImage } from "../../components/common/StoredImage";

const db = supabaseClient as any;

type TimelineItem = { id: string; date: string; kind: "activity" | "observation" | "portfolio"; title: string; body: string; label: string; photo?: string | null; followUp?: string | null; values?: string[] };

export const PortalPaud: React.FC = () => {
  const { student } = useOutletContext<any>();
  const { activeSemesterId } = useAcademicYear();
  const { appName } = useSystemSettings();
  const studentId = student?.id as string | undefined;

  const [assessments, setAssessments] = React.useState<any[]>([]);
  const [semesters, setSemesters] = React.useState<any[]>([]);
  const [profile, setProfile] = React.useState<any>(null);
  const [semesterId, setSemesterId] = React.useState("");
  const [phase, setPhase] = React.useState<PaudPhaseId | "">("");
  const [timeline, setTimeline] = React.useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [reflection, setReflection] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  // Published assessments across all semesters (RLS returns only published, parent-visible rows).
  React.useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setLoadError("");
      const [assessmentResult, profileResult] = await Promise.all([
        db.from("paud_stppa_assessments").select("*, employees(full_name)").eq("student_id", studentId)
          .eq("status", "published").eq("is_parent_visible", true).order("date", { ascending: true }),
        db.from("students").select("nickname,date_of_birth,nis,nisn").eq("id", studentId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (assessmentResult.error) setLoadError(assessmentResult.error.message);
      const rows = assessmentResult.data || [];
      setAssessments(rows);
      setProfile(profileResult.data || null);
      const semesterIds = [...new Set(rows.map((row: any) => row.semester_id).filter(Boolean))];
      const ids = activeSemesterId && !semesterIds.includes(activeSemesterId) ? [...semesterIds, activeSemesterId] : semesterIds;
      const semesterResult = ids.length
        ? await db.from("semesters").select("id,name,start_date,end_date,academic_year_id,academic_years(name)").in("id", ids)
        : { data: [] };
      if (cancelled) return;
      const list = ((semesterResult.data || []) as any[]).sort((a, b) => String(b.start_date || "").localeCompare(String(a.start_date || "")));
      setSemesters(list);
      const preferred = rows.some((row: any) => row.semester_id === activeSemesterId) ? activeSemesterId : rows[rows.length - 1]?.semester_id || activeSemesterId || "";
      setSemesterId(preferred || "");
      setIsLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [activeSemesterId, studentId]);

  const semester = semesters.find((item) => item.id === semesterId) || null;
  const semesterRecords = assessments.filter((row) => row.semester_id === semesterId && row.phase);
  const byPhase = new Map<string, any>(semesterRecords.map((row) => [row.phase, row]));
  const availablePhases = PAUD_PHASES.filter((item) => byPhase.has(item.id));
  const latestPhase = [...availablePhases].reverse()[0]?.id || "";

  React.useEffect(() => { setPhase(latestPhase); }, [latestPhase, semesterId]);
  const current = phase ? byPhase.get(phase) : null;
  React.useEffect(() => { setReflection(current?.parent_reflection || ""); }, [current?.id, current?.parent_reflection]);

  const learningMode = (current?.learning_mode || semesterRecords[0]?.learning_mode
    || (String(student?.classes?.units?.name || "").toLowerCase().includes("hbl") ? "online" : "reguler")) as "reguler" | "online";

  // Evidence timeline for the selected semester.
  React.useEffect(() => {
    if (!studentId || !semesterId) { setTimeline([]); return; }
    let cancelled = false;
    const load = async () => {
      setIsTimelineLoading(true);
      const start = semester?.start_date || "1900-01-01";
      const end = semester?.end_date || "2999-12-31";
      const [activityResult, observationResult, portfolioResult] = await Promise.all([
        db.from("paud_activities").select("id,date,title,description,photo_url,follow_up,islamic_values,evidence_source,employees(full_name)")
          .eq("student_id", studentId).eq("semester_id", semesterId).eq("status", "published").eq("is_parent_visible", true)
          .order("date", { ascending: false }).limit(60),
        db.from("hbl_student_observations").select("id,domain,indicator,observation,development_stage,observed_on")
          .eq("student_id", studentId).eq("is_visible_to_parent", true).gte("observed_on", start).lte("observed_on", end).limit(60),
        db.from("hbl_portfolio_items").select("id,title,story,captured_on,media_url,media_type")
          .eq("student_id", studentId).eq("is_published", true).gte("captured_on", start).lte("captured_on", end).limit(60),
      ]);
      if (cancelled) return;
      const items: TimelineItem[] = [
        ...(activityResult.data || []).map((item: any) => ({
          id: `a-${item.id}`, date: item.date, kind: "activity" as const, title: item.title, body: item.description || "",
          label: PAUD_EVIDENCE_SOURCE_LABELS[item.evidence_source] || "Dokumentasi kelas", photo: item.photo_url, followUp: item.follow_up, values: item.islamic_values || [],
        })),
        ...(observationResult.data || []).map((item: any) => ({
          id: `o-${item.id}`, date: item.observed_on, kind: "observation" as const,
          title: `${HBL_DOMAIN_LABELS[item.domain] || "Observasi"}${item.indicator ? ` · ${item.indicator}` : ""}`,
          body: `${item.observation}${item.development_stage ? ` (${HBL_STAGE_LABELS[item.development_stage] || item.development_stage})` : ""}`,
          label: "Observasi HBL",
        })),
        ...(portfolioResult.data || []).map((item: any) => ({
          id: `p-${item.id}`, date: item.captured_on, kind: "portfolio" as const, title: item.title, body: item.story || "",
          label: "Portofolio HBL", photo: item.media_type === "image" ? item.media_url : null,
        })),
      ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setTimeline(items);
      setIsTimelineLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [semester?.end_date, semester?.start_date, semesterId, studentId]);

  const growth = assessments.filter((row) => row.growth_weight || row.growth_height || row.growth_head);

  const submitReflection = async () => {
    if (!current) return;
    if (reflection.trim().length < 3) {
      toast.error("Tuliskan tanggapan minimal 3 karakter.");
      return;
    }
    setIsSending(true);
    const { data, error } = await db.rpc("paud_submit_parent_reflection", { p_assessment_id: current.id, p_reflection: reflection });
    setIsSending(false);
    if (error) {
      toast.error(`Tanggapan gagal dikirim: ${error.message}`);
      return;
    }
    setAssessments((rows) => rows.map((row) => row.id === current.id ? { ...row, parent_reflection: reflection.trim(), parent_reflected_at: data } : row));
    toast.success("Terima kasih, tanggapan Anda telah diterima guru.");
  };

  const print = () => {
    const opened = printPaudReport({
      schoolName: appName,
      unitName: student?.classes?.units?.name,
      className: student?.classes?.name,
      semesterName: semester?.name,
      student: { full_name: student?.full_name, nickname: profile?.nickname, nis: profile?.nis || student?.nis, nisn: profile?.nisn || student?.nisn, date_of_birth: profile?.date_of_birth },
      assessments: semesterRecords,
      learningMode,
    });
    if (!opened) toast.error("Izinkan jendela pop-up untuk mencetak laporan.");
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="border-b pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-emerald-50 p-2 text-emerald-700"><BookOpen className="h-5 w-5" /></span>
            <div>
              <h1 className="text-2xl font-bold">Perkembangan Anak KB/TK</h1>
              <p className="mt-1 text-sm text-muted-foreground">Asesmen awal, tengah, dan akhir semester Kurikulum Merdeka beserta bukti belajar ananda.</p>
            </div>
          </div>
          <span className={`w-fit rounded-md px-3 py-1.5 text-xs font-semibold ${learningMode === "online" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
            {learningMode === "online" ? <Laptop className="mr-1 inline h-3.5 w-3.5" /> : null}{PAUD_LEARNING_MODE_LABELS[learningMode]}
          </span>
        </div>
      </header>

      {loadError && (
        <div className="flex gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Catatan perkembangan belum dapat dimuat</p><p className="mt-1">Silakan coba lagi atau hubungi sekolah bila kendala berlanjut.</p></div>
        </div>
      )}

      {!studentId ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Pilih anak KB/TK yang terhubung untuk melihat perkembangannya.</div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat laporan perkembangan...</div>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex items-center gap-2 text-sm">
                <span className="font-semibold">Semester</span>
                <select value={semesterId} onChange={(event) => setSemesterId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                  {!semesters.length && <option value="">Semester aktif</option>}
                  {semesters.map((item) => <option key={item.id} value={item.id}>{item.name}{item.academic_years?.name ? ` · ${item.academic_years.name}` : ""}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {PAUD_PHASES.map((item) => {
                  const record = byPhase.get(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!record}
                      onClick={() => setPhase(item.id)}
                      className={`rounded-md border px-3 py-2 text-left text-xs font-semibold disabled:opacity-40 ${phase === item.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
                    >
                      {item.title}
                      <span className="block font-normal text-muted-foreground">{record ? formatPaudDate(record.date) : "Belum terbit"}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={print} disabled={!semesterRecords.length} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40">
                  <Printer className="h-4 w-4" /> Cetak laporan
                </button>
              </div>
            </div>
          </section>

          {!semesterRecords.length ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <NotebookPen className="h-9 w-9 opacity-25" />
              <p className="mt-3 font-semibold text-foreground">Belum ada laporan yang diterbitkan pada semester ini</p>
              <p className="mt-1 max-w-lg text-sm">Guru mengisi asesmen awal di awal semester, asesmen tengah di pertengahan, dan laporan akhir di akhir semester. Anda akan menerima notifikasi setiap laporan terbit.</p>
            </div>
          ) : (
            <>
              <ProgressOverview byPhase={byPhase} />

              {current && (
                <section className="rounded-lg border bg-card p-5 sm:p-6">
                  <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-primary">{PAUD_PHASES.find((item) => item.id === current.phase)?.title}</p>
                      <h2 className="mt-1 text-xl font-bold">{current.period_name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{formatPaudDate(current.date)} · {current.employees?.full_name || "Tim guru"}</p>
                    </div>
                    <span className="w-fit rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Diterbitkan sekolah</span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {PAUD_CP_ELEMENTS.map((element) => {
                      const scale = current[`${element.id}_scale`] as PaudScale | null;
                      return (
                        <article key={element.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold">{element.title}</h3>
                            {scale && <span className={`shrink-0 rounded border px-2 py-1 text-xs font-bold ${PAUD_SCALE_TONES[scale]}`}>{scale} · {PAUD_SCALE_LABELS[scale]}</span>}
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{current[`${element.id}_desc`] || "Belum ada deskripsi."}</p>
                        </article>
                      );
                    })}
                  </div>

                  {PAUD_ASPECTS.some((aspect) => current[`${aspect.id}_scale`]) && (
                    <details className="mt-4 rounded-lg border p-4">
                      <summary className="cursor-pointer text-sm font-bold">Rincian enam aspek perkembangan</summary>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {PAUD_ASPECTS.filter((aspect) => current[`${aspect.id}_scale`]).map((aspect) => {
                          const scale = current[`${aspect.id}_scale`] as PaudScale;
                          return (
                            <div key={aspect.id} className="rounded-md bg-muted/30 p-3 text-sm">
                              <p className="flex items-center justify-between gap-2 font-semibold">{aspect.title}<span className={`rounded border px-1.5 py-0.5 text-[11px] ${PAUD_SCALE_TONES[scale]}`}>{scale}</span></p>
                              {current[`${aspect.id}_desc`] && <p className="mt-1 text-xs leading-5 text-muted-foreground">{current[`${aspect.id}_desc`]}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {(current.p5_theme || current.p5_desc) && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-amber-600" /> Projek Profil Pelajar Pancasila{current.p5_theme ? `: ${current.p5_theme}` : ""}</p>
                      {current.p5_desc && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{current.p5_desc}</p>}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <Note icon={Sparkles} title="Kekuatan dan minat" text={current.strengths} />
                    <Note icon={CheckCircle2} title="Tindak lanjut sekolah" text={current.follow_up} />
                    <Note icon={HeartHandshake} title={learningMode === "online" ? "Panduan pendamping di rumah" : "Dukungan di rumah"} text={current.parent_partnership} />
                    <Note icon={MessageSquareQuote} title="Catatan guru kelas" text={current.teacher_note} />
                  </div>

                  {[current.attendance_present, current.attendance_sick, current.attendance_permit, current.attendance_absent].some((value) => value !== null && value !== undefined) && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 rounded-md bg-muted/30 p-4 text-sm">
                      <span className="flex items-center gap-2 font-semibold"><CalendarCheck className="h-4 w-4 text-primary" /> Kehadiran</span>
                      <span>Hadir <strong>{current.attendance_present ?? 0}</strong></span>
                      <span>Sakit <strong>{current.attendance_sick ?? 0}</strong></span>
                      <span>Izin <strong>{current.attendance_permit ?? 0}</strong></span>
                      <span>Tanpa keterangan <strong>{current.attendance_absent ?? 0}</strong></span>
                    </div>
                  )}

                  <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-sky-900"><MessageSquareQuote className="h-4 w-4" /> Tanggapan orang tua</p>
                    <p className="mt-1 text-xs text-sky-800">Ceritakan perkembangan ananda di rumah atau pertanyaan untuk guru. Tanggapan dikirim ke guru kelas.</p>
                    <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} rows={3} maxLength={3000} className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Contoh: Di rumah ananda mulai berdoa sebelum makan tanpa diingatkan..." />
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs text-sky-800">{current.parent_reflected_at ? `Terakhir dikirim ${formatPaudDate(current.parent_reflected_at)}` : "Belum ada tanggapan"}</span>
                      <button type="button" onClick={() => void submitReflection()} disabled={isSending || reflection.trim() === (current.parent_reflection || "")} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-xs font-semibold text-white disabled:opacity-50">
                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Kirim tanggapan
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {growth.length > 0 && (
            <section className="rounded-lg border bg-card p-5">
              <h2 className="flex items-center gap-2 font-bold"><Ruler className="h-5 w-5 text-primary" /> Catatan pertumbuhan</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Tanggal</th><th className="py-2">Berat (kg)</th><th className="py-2">Tinggi (cm)</th><th className="py-2">Lingkar kepala (cm)</th></tr></thead>
                  <tbody className="divide-y">
                    {growth.map((row) => (
                      <tr key={row.id}><td className="py-2">{formatPaudDate(row.date)}</td><td className="py-2">{row.growth_weight ?? "-"}</td><td className="py-2">{row.growth_height ?? "-"}</td><td className="py-2">{row.growth_head ?? "-"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold"><Camera className="h-5 w-5 text-primary" /> Momen dan bukti belajar</h2>
                <p className="mt-1 text-sm text-muted-foreground">Dokumentasi kelas{learningMode === "online" ? ", sesi live meet, tugas rumah, dan portofolio HBL" : ""} yang dibagikan guru pada semester ini.</p>
              </div>
              {learningMode === "online" && (
                <Link to="/portal/hbl" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">Buka Homebased Learning <ArrowRight className="h-4 w-4" /></Link>
              )}
            </div>
            {isTimelineLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Memuat dokumentasi...</div>
            ) : !timeline.length ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada dokumentasi yang dibagikan pada semester ini.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {timeline.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-lg border bg-card">
                    {item.photo ? (
                      <StoredImage source={item.photo} alt={item.title} className="aspect-[16/9] w-full object-cover" />
                    ) : item.kind === "activity" ? (
                      <div className="flex aspect-[16/9] items-center justify-center bg-muted"><Camera className="h-8 w-8 text-muted-foreground/30" /></div>
                    ) : null}
                    <div className="p-4">
                      <p className="text-xs font-semibold text-primary">{formatPaudDate(item.date)} · {item.label}</p>
                      <h3 className="mt-1 font-bold">{item.title}</h3>
                      {item.body && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{item.body}</p>}
                      {!!item.values?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.values.map((value) => <span key={value} className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{value}</span>)}
                        </div>
                      )}
                      {item.followUp && <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Lanjutan:</strong> {item.followUp}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

/** Element × phase grid so parents see the trend from awal to akhir at a glance. */
function ProgressOverview({ byPhase }: { byPhase: Map<string, any> }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-bold">Perjalanan capaian semester ini</h2>
        <p className="mt-1 text-sm text-muted-foreground">Capaian tiap elemen dari asesmen awal hingga akhir semester.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="px-5 py-3">Elemen</th>{PAUD_PHASES.map((phase) => <th key={phase.id} className="px-3 py-3 text-center">{phase.shortTitle}</th>)}<th className="px-3 py-3 text-center">Arah</th></tr>
          </thead>
          <tbody className="divide-y">
            {PAUD_CP_ELEMENTS.map((element) => {
              const scales = PAUD_PHASES.map((phase) => byPhase.get(phase.id)?.[`${element.id}_scale`] as PaudScale | undefined);
              const known = scales.filter(Boolean) as PaudScale[];
              const trend = known.length >= 2 ? PAUD_SCALE_RANK[known[known.length - 1]] - PAUD_SCALE_RANK[known[0]] : 0;
              return (
                <tr key={element.id}>
                  <td className="px-5 py-3 font-semibold">{element.shortTitle}</td>
                  {scales.map((scale, index) => (
                    <td key={PAUD_PHASES[index].id} className="px-3 py-3 text-center">
                      {scale ? <span title={PAUD_SCALE_LABELS[scale]} className={`inline-block min-w-11 rounded border px-2 py-1 text-xs font-bold ${PAUD_SCALE_TONES[scale]}`}>{scale}</span> : <span className="text-muted-foreground">–</span>}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    {known.length < 2 ? <span className="text-xs text-muted-foreground">–</span>
                      : trend > 0 ? <ArrowUpRight className="mx-auto h-4 w-4 text-emerald-600" />
                      : trend < 0 ? <ArrowDownRight className="mx-auto h-4 w-4 text-amber-600" />
                      : <ArrowRight className="mx-auto h-4 w-4 text-sky-600" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Note({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 text-primary" />{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
