/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowRight, BookOpen, CalendarClock, ChevronDown, GraduationCap, Info, Loader2, MessageSquareText, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { formatMeetingDate, HBL_LEVEL_LABELS, HBL_STATUS_LABELS, normalizePreschoolLevel } from "./hbl-config";
import { HBL_PATTERNS, patternForProgram, patternForUnit } from "./hbl-patterns";
import { HblDrawer } from "./components/HblDrawer";
import { HblProgramView } from "./hbl-program-view";

const db = supabaseClient as any;
const inputClass = "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground";

/**
 * /lms and the teacher "Pertemuan HBL" page. Step 1 shows one card per class program; opening a
 * card shows the program workspace. `canManagePrograms` lets admins create and configure programs;
 * teachers of the linked class plan and run meetings.
 */
export const HblWorkspace: React.FC<{ canManagePrograms: boolean }> = ({ canManagePrograms }) => {
  const { activeSemesterId } = useAcademicYear();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("program") || "";
  const [semesterId, setSemesterId] = useState(activeSemesterId || "");
  const [programs, setPrograms] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [semesters, setSemesters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => { if (activeSemesterId) setSemesterId((current) => current || activeSemesterId); }, [activeSemesterId]);

  const load = useCallback(async () => {
    setLoading(true);
    const [programResult, overviewResult, semesterResult, classResult] = await Promise.all([
      db.from("hbl_programs").select("*, units(id,name,education_level,delivery_mode), classes(id,name,level,grade_level), semesters(id,name,academic_years(name))").order("name"),
      db.rpc("hbl_program_overview", { p_semester_id: null }),
      db.from("semesters").select("id,name,academic_year_id,is_active,start_date,academic_years(name)").order("start_date", { ascending: false }),
      canManagePrograms
        ? db.from("classes").select("id,name,level,grade_level,unit_id,academic_year_id,units(id,name,education_level,delivery_mode)").order("name")
        : Promise.resolve({ data: [] }),
    ]);
    const error = programResult.error || semesterResult.error || classResult.error;
    if (error) toast.error("Program HBL belum dapat dimuat", { description: error.message });
    setPrograms(programResult.data || []);
    setStats(Object.fromEntries((overviewResult.data || []).map((row: any) => [row.program_id, row])));
    setSemesters(semesterResult.data || []);
    setClasses(classResult.data || []);
    setLoading(false);
  }, [canManagePrograms]);
  useEffect(() => { void load(); }, [load]);

  const visible = programs.filter((program) => !semesterId || program.semester_id === semesterId);
  const byUnit = useMemo(() => {
    const map = new Map<string, { unit: any; items: any[] }>();
    visible.forEach((program) => {
      const key = program.unit_id || "none";
      const entry = map.get(key) || { unit: program.units, items: [] };
      entry.items.push(program);
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => Number(b.unit?.education_level === "preschool") - Number(a.unit?.education_level === "preschool") || String(a.unit?.name).localeCompare(String(b.unit?.name)));
  }, [visible]);
  const selected = programs.find((program) => program.id === selectedId) || null;

  const openProgram = (id: string) => setParams(id ? { program: id } : {});

  if (loading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (selected) {
    return (
      <HblProgramView
        key={selected.id}
        program={selected}
        classes={classes}
        canManagePrograms={canManagePrograms}
        onBack={() => { openProgram(""); void load(); }}
        onProgramChanged={load}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-end md:justify-between">
        <label className="text-xs font-bold text-muted-foreground md:w-72">Semester
          <select value={semesterId} onChange={(event) => setSemesterId(event.target.value)} className={inputClass}>
            <option value="">Semua semester</option>
            {semesters.map((item) => <option key={item.id} value={item.id}>{item.academic_years?.name} · {item.name}{item.is_active ? " (aktif)" : ""}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowGuide((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-muted">
            <Info className="h-4 w-4" /> Cara kerja <ChevronDown className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
          </button>
          {canManagePrograms && (
            <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
              <Plus className="h-4 w-4" /> Program kelas baru
            </button>
          )}
        </div>
      </section>

      {(showGuide || !programs.length) && <PatternGuide />}

      {!visible.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <GraduationCap className="mx-auto mb-2 h-9 w-9 opacity-30" />
          {canManagePrograms ? "Belum ada program pada semester ini. Buat satu program untuk setiap kelas yang belajar dari rumah." : "Belum ada program HBL untuk kelas yang Anda ampu pada semester ini."}
        </div>
      ) : byUnit.map(({ unit, items }) => (
        <section key={unit?.id || "none"} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{unit?.name || "Tanpa unit"}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((program) => <ProgramCard key={program.id} program={program} stats={stats[program.id]} onOpen={() => openProgram(program.id)} />)}
          </div>
        </section>
      ))}

      {canManagePrograms && (
        <CreateProgramDrawer
          open={creating}
          onClose={() => setCreating(false)}
          semesters={semesters}
          classes={classes}
          programs={programs}
          defaultSemesterId={semesterId || activeSemesterId || ""}
          onCreated={async (id) => { setCreating(false); await load(); openProgram(id); }}
        />
      )}
    </div>
  );
};

function PatternGuide() {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {Object.values(HBL_PATTERNS).map((pattern) => (
        <article key={pattern.id} className={`rounded-xl border p-4 ${pattern.tone}`}>
          <p className="text-xs font-bold uppercase">{pattern.audience} · Pola {pattern.label}</p>
          <p className="mt-1 text-sm text-foreground">{pattern.summary}</p>
          <p className="mt-2 text-xs text-foreground/80">Struktur: Program kelas → {pattern.group.plural} → {pattern.meeting.singular} → {pattern.activity.plural}. Contoh: {pattern.group.example}.</p>
          <ol className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-foreground">
            {pattern.steps.map((step, index) => <li key={step} className="rounded bg-white/70 px-2 py-1">{index + 1}. {step}</li>)}
          </ol>
        </article>
      ))}
    </section>
  );
}

function ProgramCard({ program, stats, onOpen }: { program: any; stats?: any; onOpen: () => void }) {
  const pattern = patternForProgram(program);
  const level = program.preschool_level ? HBL_LEVEL_LABELS[program.preschool_level] : null;
  return (
    <button type="button" onClick={onOpen} className="group flex flex-col rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.02]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{program.classes?.name || "Kelas belum ditautkan"}</p>
          <p className="text-xs text-muted-foreground">{program.name}</p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${program.status === "published" ? "bg-emerald-50 text-emerald-700" : program.status === "archived" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{HBL_STATUS_LABELS[program.status]}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${pattern.tone}`}>{pattern.label}</span>
        {level && <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold">{level}</span>}
        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">Semester {program.semesters?.name}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat icon={Users} value={stats?.participants ?? 0} label="anak" />
        <Stat icon={BookOpen} value={stats?.groups ?? 0} label={pattern.group.singular.toLowerCase()} />
        <Stat icon={CalendarClock} value={`${stats?.published_meetings ?? 0}/${stats?.meetings ?? 0}`} label="pertemuan terbit" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2 border-t pt-3 text-xs">
        <div>
          {stats?.next_meeting_date ? (
            <><p className="font-semibold text-muted-foreground">Berikutnya</p><p className="font-bold">{stats.next_meeting_title}</p><p className="text-muted-foreground">{formatMeetingDate(stats.next_meeting_date)}</p></>
          ) : !program.class_id ? (
            <p className="font-semibold text-amber-700">Tautkan kelas di Pengaturan</p>
          ) : (
            <p className="text-muted-foreground">Belum ada pertemuan terjadwal</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats?.pending_reports > 0 && <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 font-bold text-rose-700"><MessageSquareText className="h-3.5 w-3.5" />{stats.pending_reports}</span>}
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </button>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="flex items-center justify-center gap-1 text-base font-bold"><Icon className="h-3.5 w-3.5 text-primary" />{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CreateProgramDrawer({ open, onClose, semesters, classes, programs, defaultSemesterId, onCreated }: {
  open: boolean; onClose: () => void; semesters: any[]; classes: any[]; programs: any[]; defaultSemesterId: string; onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({ semester_id: defaultSemesterId, class_id: "", name: "", parent_welcome: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ semester_id: defaultSemesterId, class_id: "", name: "", parent_welcome: "" }); }, [defaultSemesterId, open]);

  const semester = semesters.find((item) => item.id === form.semester_id);
  const classItem = classes.find((item) => item.id === form.class_id);
  const pattern = patternForUnit(classItem?.units);
  const taken = new Set(programs.filter((program) => program.semester_id === form.semester_id).map((program) => program.class_id));
  const options = classes
    .filter((item) => !semester || item.academic_year_id === semester.academic_year_id)
    .sort((a, b) => Number(b.units?.delivery_mode === "online") - Number(a.units?.delivery_mode === "online") || String(a.units?.name).localeCompare(String(b.units?.name)) || a.name.localeCompare(b.name));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!semester || !classItem) return toast.error("Pilih semester dan kelas.");
    setSaving(true);
    const { data, error } = await db.from("hbl_programs").insert({
      name: form.name.trim() || `HBL ${classItem.name} · Semester ${semester.name}`,
      parent_welcome: form.parent_welcome.trim() || null,
      unit_id: classItem.unit_id,
      class_id: classItem.id,
      academic_year_id: semester.academic_year_id,
      semester_id: semester.id,
      journey_mode: pattern.journeyMode,
      preschool_level: pattern.id === "preschool_thematic" ? normalizePreschoolLevel(classItem.level, classItem.name) || null : null,
      status: "draft",
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error("Program belum tersimpan", { description: error.message });
    toast.success("Program dibuat. Siswa kelas otomatis terdaftar.");
    onCreated(data.id);
  };

  return (
    <HblDrawer open={open} onClose={onClose} title="Program kelas baru" subtitle="Satu program untuk satu kelas per semester. Pola belajar mengikuti jenjang unit kelas.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-bold text-muted-foreground">Semester
          <select required value={form.semester_id} onChange={(event) => setForm({ ...form, semester_id: event.target.value, class_id: "" })} className={inputClass}>
            <option value="">Pilih semester</option>
            {semesters.map((item) => <option key={item.id} value={item.id}>{item.academic_years?.name} · {item.name}{item.is_active ? " (aktif)" : ""}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-muted-foreground">Kelas
          <select required value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value })} className={inputClass}>
            <option value="">Pilih kelas</option>
            {options.map((item) => (
              <option key={item.id} value={item.id} disabled={taken.has(item.id)}>
                {item.name} · {item.units?.name}{item.units?.delivery_mode === "online" ? " (online)" : ""}{taken.has(item.id) ? " — sudah ada program" : ""}
              </option>
            ))}
          </select>
        </label>
        {classItem && (
          <div className={`rounded-lg border p-3 text-sm ${pattern.tone}`}>
            <p className="font-bold">Pola belajar: {pattern.label}</p>
            <p className="mt-1 text-foreground/80">{pattern.summary}</p>
          </div>
        )}
        <label className="block text-xs font-bold text-muted-foreground">Nama program (opsional)
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={classItem && semester ? `HBL ${classItem.name} · Semester ${semester.name}` : "Otomatis dari kelas"} className={inputClass} />
        </label>
        <label className="block text-xs font-bold text-muted-foreground">Sambutan untuk orang tua (opsional)
          <textarea value={form.parent_welcome} onChange={(event) => setForm({ ...form, parent_welcome: event.target.value })} rows={3} placeholder="Tampil di bagian atas halaman Homebased Learning di portal orang tua." className="mt-1.5 w-full rounded-md border bg-background p-3 text-sm font-normal text-foreground" />
        </label>
        <p className="text-xs text-muted-foreground">Program dibuat sebagai draf. Terbitkan dari tab Pengaturan setelah tema dan pertemuan pertama siap.</p>
        <button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Buat Program
        </button>
      </form>
    </HblDrawer>
  );
}
