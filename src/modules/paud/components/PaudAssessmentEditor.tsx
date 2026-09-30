/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import {
  CalendarCheck,
  Camera,
  ChevronDown,
  HeartHandshake,
  Loader2,
  MessageSquareQuote,
  Printer,
  RefreshCw,
  Ruler,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import {
  formatPaudDate,
  HBL_DOMAIN_LABELS,
  HBL_DOMAIN_TO_ELEMENT,
  HBL_STAGE_LABELS,
  PAUD_ASPECTS,
  PAUD_CP_ELEMENTS,
  PAUD_EVIDENCE_SOURCE_LABELS,
  PAUD_LEARNING_MODE_LABELS,
  PAUD_P5_THEMES,
  PAUD_PHASES,
  PAUD_SCALES,
  PAUD_SCALE_LABELS,
  PAUD_SCALE_TONES,
  paudPeriodName,
  type PaudCpElementId,
  type PaudLearningMode,
  type PaudPhaseId,
  type PaudScale,
} from "../paud-config";
import { printPaudReport } from "../paud-report";

const db = supabaseClient as any;

/** Legacy STPPA aspects evidence the Kurikulum Merdeka elements as follows. */
const ASPECT_TO_ELEMENT: Record<string, PaudCpElementId> = {
  agama_moral: "nab",
  fisik_motorik: "jati_diri",
  sosial_emosional: "jati_diri",
  kognitif: "steam",
  bahasa: "steam",
  seni: "steam",
};

const TEXT_FIELDS = [
  "period_name", "date", "p5_theme", "p5_desc", "strengths", "follow_up", "parent_partnership", "teacher_note",
  ...PAUD_CP_ELEMENTS.flatMap((element) => [`${element.id}_scale`, `${element.id}_desc`]),
  ...PAUD_ASPECTS.flatMap((aspect) => [`${aspect.id}_scale`, `${aspect.id}_desc`]),
];
const NUMBER_FIELDS = ["attendance_present", "attendance_sick", "attendance_permit", "attendance_absent", "growth_weight", "growth_height", "growth_head"];

export type PaudEditorStudent = { id: string; full_name: string; nickname?: string | null; nis?: string | null; nisn?: string | null; date_of_birth?: string | null; class_id?: string | null; unit_id?: string | null };

type Props = {
  student: PaudEditorStudent;
  classId: string;
  className?: string | null;
  unitName?: string | null;
  phase: PaudPhaseId;
  learningMode: PaudLearningMode;
  academicYearId: string;
  semester: { id: string; name?: string | null; start_date?: string | null; end_date?: string | null };
  /** Employee recorded as the assessor for new records; resolved from the signed-in user when omitted. */
  employeeId?: string | null;
  onSaved?: (record: any) => void;
};

type Evidence = { id: string; element: PaudCpElementId[]; date: string; title: string; body: string; source: string };

export const PaudAssessmentEditor: React.FC<Props> = ({ student, classId, className, unitName, phase, learningMode, academicYearId, semester, employeeId, onSaved }) => {
  const { appName } = useSystemSettings();
  const [records, setRecords] = React.useState<any[]>([]);
  const [evidence, setEvidence] = React.useState<Evidence[]>([]);
  const [form, setForm] = React.useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCounting, setIsCounting] = React.useState(false);
  const [assessorId, setAssessorId] = React.useState<string | null>(employeeId || null);

  const phaseInfo = PAUD_PHASES.find((item) => item.id === phase)!;
  const existing = records.find((record) => record.phase === phase) || null;
  const otherPhases = PAUD_PHASES.filter((item) => item.id !== phase).map((item) => ({ ...item, record: records.find((record) => record.phase === item.id) }));

  const load = React.useCallback(async () => {
    setIsLoading(true);
    const start = semester.start_date || "1900-01-01";
    const end = semester.end_date || "2999-12-31";
    const [assessmentResult, activityResult, observationResult, portfolioResult] = await Promise.all([
      db.from("paud_stppa_assessments").select("*, employees(full_name)").eq("student_id", student.id).eq("semester_id", semester.id),
      db.from("paud_activities").select("id,date,title,description,development_aspects,cp_elements,evidence_source,learning_mode")
        .eq("student_id", student.id).eq("semester_id", semester.id).order("date", { ascending: false }).limit(200),
      db.from("hbl_student_observations").select("id,domain,indicator,observation,development_stage,source,observed_on")
        .eq("student_id", student.id).gte("observed_on", start).lte("observed_on", end).order("observed_on", { ascending: false }).limit(200),
      db.from("hbl_portfolio_items").select("id,title,story,captured_on,media_type")
        .eq("student_id", student.id).gte("captured_on", start).lte("captured_on", end).order("captured_on", { ascending: false }).limit(100),
    ]);
    if (assessmentResult.error) toast.error(`Asesmen gagal dimuat: ${assessmentResult.error.message}`);
    const loaded = assessmentResult.data || [];
    setRecords(loaded);
    const items: Evidence[] = [
      ...(activityResult.data || []).map((item: any) => {
        const elements = new Set<PaudCpElementId>(item.cp_elements || []);
        (item.development_aspects || []).forEach((aspect: string) => ASPECT_TO_ELEMENT[aspect] && elements.add(ASPECT_TO_ELEMENT[aspect]));
        return {
          id: `a-${item.id}`,
          element: [...elements],
          date: item.date,
          title: item.title,
          body: item.description || "",
          source: PAUD_EVIDENCE_SOURCE_LABELS[item.evidence_source] || "Jurnal observasi",
        };
      }),
      ...(observationResult.data || []).map((item: any) => ({
        id: `o-${item.id}`,
        element: [HBL_DOMAIN_TO_ELEMENT[item.domain] || "steam"],
        date: item.observed_on,
        title: `${HBL_DOMAIN_LABELS[item.domain] || "Observasi HBL"}${item.indicator ? ` · ${item.indicator}` : ""}`,
        body: `${item.observation}${item.development_stage ? ` (${HBL_STAGE_LABELS[item.development_stage] || item.development_stage})` : ""}`,
        source: "Observasi HBL",
      })),
      ...(portfolioResult.data || []).map((item: any) => ({
        id: `p-${item.id}`,
        element: ["steam" as PaudCpElementId],
        date: item.captured_on,
        title: item.title,
        body: item.story || "",
        source: "Portofolio HBL",
      })),
    ];
    setEvidence(items);
    const current = loaded.find((record: any) => record.phase === phase);
    setForm(current ? { ...current } : {
      period_name: paudPeriodName(phase, semester.name),
      date: new Date().toLocaleDateString("en-CA"),
      status: "draft",
      is_parent_visible: true,
    });
    setIsLoading(false);
  }, [phase, semester.end_date, semester.id, semester.name, semester.start_date, student.id]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (employeeId) { setAssessorId(employeeId); return; }
    void db.rpc("current_employee_id").then(({ data }: any) => setAssessorId(data || null));
  }, [employeeId]);

  const set = (field: string, value: unknown) => setForm((current) => ({ ...current, [field]: value }));

  const fillAttendance = async () => {
    if (!semester.start_date) {
      toast.error("Tanggal mulai semester belum diatur.");
      return;
    }
    setIsCounting(true);
    const today = new Date().toLocaleDateString("en-CA");
    const end = semester.end_date && semester.end_date < today ? semester.end_date : today;
    const { data, error } = await db.from("attendance_records").select("status")
      .eq("student_id", student.id).gte("attendance_date", semester.start_date).lte("attendance_date", end);
    setIsCounting(false);
    if (error) {
      toast.error(`Rekap kehadiran gagal dimuat: ${error.message}`);
      return;
    }
    const rows = (data || []) as { status: string }[];
    const count = (...statuses: string[]) => rows.filter((row) => statuses.includes(row.status)).length;
    setForm((current) => ({
      ...current,
      attendance_present: count("hadir", "terlambat", "pulang_awal"),
      attendance_sick: count("sakit"),
      attendance_permit: count("izin"),
      attendance_absent: count("alpa"),
    }));
    toast.success(`Rekap ${rows.length} catatan kehadiran diterapkan.`);
  };

  const save = async (status: "draft" | "published") => {
    if (status === "published") {
      const missing = PAUD_CP_ELEMENTS.filter((element) => !String(form[`${element.id}_desc`] || "").trim());
      if (missing.length) {
        toast.error(`Lengkapi deskripsi: ${missing.map((element) => element.shortTitle).join(", ")}.`);
        return;
      }
      if (phase !== "awal") {
        const noScale = PAUD_CP_ELEMENTS.filter((element) => !form[`${element.id}_scale`]);
        if (noScale.length) {
          toast.error(`Pilih capaian untuk: ${noScale.map((element) => element.shortTitle).join(", ")}.`);
          return;
        }
      }
    }
    if (!String(form.period_name || "").trim() || !form.date) {
      toast.error("Nama periode dan tanggal asesmen wajib diisi.");
      return;
    }
    const payload: Record<string, unknown> = {
      student_id: student.id,
      class_id: classId,
      academic_year_id: academicYearId,
      semester_id: semester.id,
      phase,
      learning_mode: learningMode,
      status,
      is_parent_visible: form.is_parent_visible !== false,
      employee_id: existing?.employee_id || assessorId || null,
    };
    TEXT_FIELDS.forEach((field) => { payload[field] = String(form[field] ?? "").trim() || null; });
    NUMBER_FIELDS.forEach((field) => {
      const value = form[field];
      payload[field] = value === "" || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
    });
    setIsSaving(true);
    const query = existing
      ? db.from("paud_stppa_assessments").update(payload).eq("id", existing.id)
      : db.from("paud_stppa_assessments").insert(payload);
    const { data, error } = await query.select("*, employees(full_name)").single();
    setIsSaving(false);
    if (error) {
      toast.error(error.code === "23505"
        ? `${phaseInfo.title} untuk anak ini sudah ada pada semester aktif. Muat ulang halaman.`
        : `Asesmen gagal disimpan: ${error.message}`);
      return;
    }
    toast.success(status === "published"
      ? (form.is_parent_visible !== false ? `${phaseInfo.title} diterbitkan ke portal orang tua.` : `${phaseInfo.title} diterbitkan (internal).`)
      : `${phaseInfo.title} disimpan sebagai draf.`);
    setRecords((current) => [...current.filter((record) => record.id !== data.id), data]);
    setForm({ ...data });
    onSaved?.(data);
  };

  const print = () => {
    const opened = printPaudReport({
      schoolName: appName,
      unitName,
      className,
      semesterName: semester.name,
      student,
      assessments: records,
      learningMode,
    });
    if (!opened) toast.error("Jendela cetak diblokir browser atau belum ada asesmen tersimpan.");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat asesmen dan bukti belajar...</div>;
  }

  const evidenceFor = (element: PaudCpElementId) => evidence.filter((item) => item.element.includes(element));
  const isPublished = existing?.status === "published";

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-primary">{phaseInfo.title} · {phaseInfo.timing}</p>
            <h2 className="mt-1 text-xl font-bold">{student.full_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{className || "Tanpa kelas"} · {PAUD_LEARNING_MODE_LABELS[learningMode]} · Semester {semester.name || "-"}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{phaseInfo.purpose}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded px-2 py-1 text-xs font-semibold ${!existing ? "bg-slate-100 text-slate-700" : isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {!existing ? "Belum diisi" : isPublished ? (existing.is_parent_visible ? "Terbit di portal" : "Terbit internal") : "Draf"}
            </span>
            <span className="rounded bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">{evidence.length} bukti belajar</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
          <Field label="Nama periode"><input value={form.period_name || ""} onChange={(event) => set("period_name", event.target.value)} className={inputClass} /></Field>
          <Field label="Tanggal asesmen"><input type="date" value={form.date || ""} onChange={(event) => set("date", event.target.value)} className={inputClass} /></Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-5">
          <h3 className="font-bold">Capaian Pembelajaran Fase Fondasi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {phase === "awal"
              ? "Gambarkan kondisi awal anak. Capaian boleh dikosongkan bila bukti belum cukup."
              : "Tentukan capaian dari kumpulan bukti, lalu tulis deskripsi yang menunjukkan kemampuan, proses, dan dukungan berikutnya."}
          </p>
        </div>
        <div className="divide-y">
          {PAUD_CP_ELEMENTS.map((element) => {
            const items = evidenceFor(element.id);
            return (
              <div key={element.id} className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[320px_1fr]">
                <div>
                  <h4 className="font-bold">{element.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{element.description}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {element.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
                  </ul>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {PAUD_SCALES.map((scale) => {
                      const active = form[`${element.id}_scale`] === scale;
                      return (
                        <button
                          key={scale}
                          type="button"
                          onClick={() => set(`${element.id}_scale`, active ? null : scale)}
                          className={`rounded-md border px-2 py-1.5 text-left text-xs font-semibold ${active ? `${PAUD_SCALE_TONES[scale]} ring-2 ring-primary` : "hover:bg-muted"}`}
                        >
                          {scale} · {PAUD_SCALE_LABELS[scale]}
                        </button>
                      );
                    })}
                  </div>
                  {otherPhases.some((item) => item.record?.[`${element.id}_scale`]) && (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      {otherPhases.filter((item) => item.record?.[`${element.id}_scale`]).map((item) => (
                        <span key={item.id} className={`rounded border px-1.5 py-0.5 font-semibold ${PAUD_SCALE_TONES[item.record[`${element.id}_scale`] as PaudScale]}`}>
                          {item.shortTitle}: {item.record[`${element.id}_scale`]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={form[`${element.id}_desc`] || ""}
                    onChange={(event) => set(`${element.id}_desc`, event.target.value)}
                    placeholder={phase === "awal"
                      ? "Kondisi awal: kemampuan yang sudah tampak, minat, dan dukungan yang dibutuhkan."
                      : "Ananda sudah mampu ... terlihat saat ... Ananda masih perlu dukungan untuk ..."}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-6"
                  />
                  {otherPhases.filter((item) => item.record?.[`${element.id}_desc`]).map((item) => (
                    <details key={item.id} className="rounded-md bg-muted/30 px-3 py-2 text-xs">
                      <summary className="cursor-pointer font-semibold text-muted-foreground">Deskripsi {item.title.toLowerCase()}</summary>
                      <p className="mt-1 whitespace-pre-line leading-5">{item.record[`${element.id}_desc`]}</p>
                    </details>
                  ))}
                  <details className="rounded-md border px-3 py-2 text-xs">
                    <summary className="flex cursor-pointer items-center gap-1.5 font-semibold"><Camera className="h-3.5 w-3.5 text-primary" /> Bukti belajar terkait ({items.length})</summary>
                    {!items.length ? (
                      <p className="mt-2 text-muted-foreground">Belum ada jurnal observasi atau catatan HBL untuk elemen ini pada semester aktif.</p>
                    ) : (
                      <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                        {items.map((item) => (
                          <li key={item.id} className="rounded bg-muted/30 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{item.title}</span>
                              <span className="shrink-0 text-muted-foreground">{formatPaudDate(item.date)}</span>
                            </div>
                            <p className="mt-0.5 text-muted-foreground">{item.source}</p>
                            {item.body && <p className="mt-1 line-clamp-3 leading-5">{item.body}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer items-center justify-between p-5">
          <span><span className="font-bold">Rincian enam aspek perkembangan (STPPA)</span><span className="mt-1 block text-sm text-muted-foreground">Opsional, untuk sekolah yang tetap melaporkan aspek perkembangan secara rinci.</span></span>
          <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="divide-y border-t">
          {PAUD_ASPECTS.map((aspect) => (
            <div key={aspect.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[240px_1fr]">
              <div>
                <p className="text-sm font-semibold">{aspect.title}</p>
                <select value={form[`${aspect.id}_scale`] || ""} onChange={(event) => set(`${aspect.id}_scale`, event.target.value || null)} className={`${inputClass} mt-2`}>
                  <option value="">Tidak dinilai</option>
                  {PAUD_SCALES.map((scale) => <option key={scale} value={scale}>{scale} · {PAUD_SCALE_LABELS[scale]}</option>)}
                </select>
              </div>
              <textarea rows={3} value={form[`${aspect.id}_desc`] || ""} onChange={(event) => set(`${aspect.id}_desc`, event.target.value)} placeholder={aspect.description} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
      </details>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" /> Projek Penguatan Profil Pelajar Pancasila</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
          <Field label="Tema projek">
            <input list="paud-p5-themes" value={form.p5_theme || ""} onChange={(event) => set("p5_theme", event.target.value)} placeholder="Pilih atau ketik tema" className={inputClass} />
            <datalist id="paud-p5-themes">{PAUD_P5_THEMES.map((theme) => <option key={theme} value={theme} />)}</datalist>
          </Field>
          <Field label="Perkembangan anak dalam projek">
            <textarea rows={3} value={form.p5_desc || ""} onChange={(event) => set("p5_desc", event.target.value)} placeholder="Peran, sikap, dan kemampuan yang tampak selama projek." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 font-bold"><CalendarCheck className="h-5 w-5 text-primary" /> Kehadiran dan pertumbuhan</h3>
          <button type="button" onClick={() => void fillAttendance()} disabled={isCounting} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50">
            {isCounting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Isi dari presensi
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Hadir (hari)" value={form.attendance_present} onChange={(value) => set("attendance_present", value)} />
          <NumberField label="Sakit" value={form.attendance_sick} onChange={(value) => set("attendance_sick", value)} />
          <NumberField label="Izin" value={form.attendance_permit} onChange={(value) => set("attendance_permit", value)} />
          <NumberField label="Tanpa keterangan" value={form.attendance_absent} onChange={(value) => set("attendance_absent", value)} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField icon label="Berat badan (kg)" step="0.1" value={form.growth_weight} onChange={(value) => set("growth_weight", value)} />
          <NumberField icon label="Tinggi badan (cm)" step="0.1" value={form.growth_height} onChange={(value) => set("growth_height", value)} />
          <NumberField icon label="Lingkar kepala (cm)" step="0.1" value={form.growth_head} onChange={(value) => set("growth_head", value)} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="flex items-center gap-2 font-bold"><HeartHandshake className="h-5 w-5 text-primary" /> Rangkuman dan kemitraan keluarga</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field label={phase === "awal" ? "Minat dan kekuatan awal" : "Kekuatan dan minat anak"}>
            <textarea rows={3} value={form.strengths || ""} onChange={(event) => set("strengths", event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label={phase === "awal" ? "Rencana stimulasi di sekolah" : "Tindak lanjut di sekolah"}>
            <textarea rows={3} value={form.follow_up || ""} onChange={(event) => set("follow_up", event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label={learningMode === "online" ? "Panduan pendamping belajar di rumah" : "Saran kegiatan di rumah"}>
            <textarea rows={3} value={form.parent_partnership || ""} onChange={(event) => set("parent_partnership", event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Catatan guru kelas">
            <textarea rows={3} value={form.teacher_note || ""} onChange={(event) => set("teacher_note", event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
        {existing?.parent_reflection && (
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <p className="flex items-center gap-2 font-semibold"><MessageSquareQuote className="h-4 w-4" /> Tanggapan orang tua · {formatPaudDate(existing.parent_reflected_at)}</p>
            <p className="mt-2 whitespace-pre-line leading-6">{existing.parent_reflection}</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_parent_visible !== false} onChange={(event) => set("is_parent_visible", event.target.checked)} className="accent-primary" />
          Tampilkan di portal orang tua saat terbit
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          {existing && (
            <button type="button" onClick={print} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-muted">
              <Printer className="h-4 w-4" /> Cetak laporan
            </button>
          )}
          {isPublished ? (
            <>
              <button type="button" disabled={isSaving} onClick={() => { if (window.confirm("Tarik laporan ini dari portal orang tua dan jadikan draf?")) void save("draft"); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                Tarik ke draf
              </button>
              <button type="button" disabled={isSaving} onClick={() => void save("published")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan perubahan
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={isSaving} onClick={() => void save("draft")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                <Save className="h-4 w-4" /> Simpan draf
              </button>
              <button type="button" disabled={isSaving} onClick={() => void save("published")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Terbitkan
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}

function NumberField({ label, value, onChange, step = "1", icon }: { label: string; value: unknown; onChange: (value: string) => void; step?: string; icon?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{icon && <Ruler className="h-3.5 w-3.5" />}{label}</span>
      <input type="number" min="0" step={step} value={value === null || value === undefined ? "" : String(value)} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}
