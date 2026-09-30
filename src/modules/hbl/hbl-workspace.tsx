/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Laptop, Loader2, Plus, RefreshCw, School, Users } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { isPaudUnit } from "../paud/paud-config";
import { HBL_LEVEL_LABELS, HBL_STATUS_LABELS, normalizePreschoolLevel } from "./hbl-config";
import { HblThemePlanner } from "./hbl-theme-planner";

const db = supabaseClient as any;

/**
 * Preschool HBL workspace: one program per HBL class and semester, organised as
 * Tema/Subtema -> Pertemuan. `canManagePrograms` enables creating and linking programs (admin);
 * teachers of the linked class plan themes and meetings.
 */
export const HblWorkspace: React.FC<{ canManagePrograms: boolean }> = ({ canManagePrograms }) => {
  const { activeSemesterId } = useAcademicYear();
  const [programs, setPrograms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [programId, setProgramId] = useState("");
  const [semesterFilter, setSemesterFilter] = useState(activeSemesterId || "");
  const [showCreate, setShowCreate] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [form, setForm] = useState({ class_id: "", semester_id: activeSemesterId || "", name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [programResult, classResult, semesterResult] = await Promise.all([
      db.from("hbl_programs").select("*, units(name,delivery_mode), classes(id,name,level), semesters(name,academic_years(name))").order("created_at", { ascending: false }),
      canManagePrograms
        ? db.from("classes").select("id,name,level,unit_id,academic_year_id,units(id,name,education_level,delivery_mode)").order("name")
        : Promise.resolve({ data: [], error: null }),
      db.from("semesters").select("id,name,academic_year_id,is_active,start_date,academic_years(name)").order("start_date", { ascending: false }),
    ]);
    const error = programResult.error || classResult.error || semesterResult.error;
    if (error) toast.error("Program HBL belum dapat dimuat", { description: error.message });
    const rows = programResult.data || [];
    setPrograms(rows);
    setClasses((classResult.data || []).filter((item: any) => isPaudUnit(item.units)));
    setSemesters(semesterResult.data || []);
    setProgramId((current) => (current && rows.some((row: any) => row.id === current) ? current : rows.find((row: any) => !activeSemesterId || row.semester_id === activeSemesterId)?.id || rows[0]?.id || ""));
    setLoading(false);
  }, [activeSemesterId, canManagePrograms]);

  useEffect(() => { void load(); }, [load]);

  const program = programs.find((item) => item.id === programId) || null;
  const visiblePrograms = programs.filter((item) => !semesterFilter || item.semester_id === semesterFilter);

  const loadRoster = useCallback(async () => {
    if (!programId) { setRoster([]); return; }
    const { data, error } = await db.from("hbl_program_students").select("id,student_id,students(id,full_name,nickname,class_id,unit_id)").eq("program_id", programId);
    if (error) toast.error("Peserta belum dapat dimuat", { description: error.message });
    setRoster((data || []).map((row: any) => row.students).filter(Boolean).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)));
  }, [programId]);
  useEffect(() => { void loadRoster(); }, [loadRoster]);

  // Prefer online (HBL) classes of the chosen semester's year.
  const classOptions = useMemo(() => {
    const semester = semesters.find((item) => item.id === form.semester_id);
    return classes
      .filter((item) => !semester || !item.academic_year_id || item.academic_year_id === semester.academic_year_id)
      .sort((a, b) => Number(b.units?.delivery_mode === "online") - Number(a.units?.delivery_mode === "online") || a.name.localeCompare(b.name));
  }, [classes, form.semester_id, semesters]);

  const createProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    const classItem = classes.find((item) => item.id === form.class_id);
    const semester = semesters.find((item) => item.id === form.semester_id);
    if (!classItem || !semester) return toast.error("Pilih kelas dan semester.");
    setSaving(true);
    const { data, error } = await db.from("hbl_programs").insert({
      name: form.name.trim() || `HBL ${classItem.name} · Semester ${semester.name}`,
      description: form.description.trim() || null,
      unit_id: classItem.unit_id,
      class_id: classItem.id,
      academic_year_id: semester.academic_year_id,
      semester_id: semester.id,
      preschool_level: normalizePreschoolLevel(classItem.level, classItem.name) || null,
      journey_mode: "preschool_hbl",
      status: "draft",
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error("Program belum tersimpan", { description: error.message });
    toast.success("Program dibuat dan siswa kelas otomatis terdaftar.");
    setForm({ class_id: "", semester_id: semester.id, name: "", description: "" });
    setShowCreate(false);
    setSemesterFilter(semester.id);
    await load();
    setProgramId(data.id);
  };

  const linkClass = async (classId: string) => {
    if (!program) return;
    const classItem = classes.find((item) => item.id === classId);
    const { error } = await db.from("hbl_programs").update({
      class_id: classId || null,
      ...(classItem ? { unit_id: classItem.unit_id, preschool_level: normalizePreschoolLevel(classItem.level, classItem.name) || program.preschool_level } : {}),
    }).eq("id", program.id);
    if (error) return toast.error(error.message);
    toast.success(classId ? "Kelas ditautkan; peserta mengikuti daftar kelas." : "Tautan kelas dilepas.");
    await load();
    await loadRoster();
  };

  const setStatus = async (status: string) => {
    if (!program) return;
    const { error } = await db.from("hbl_programs").update({ status }).eq("id", program.id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Program terbit di portal orang tua." : `Program menjadi ${HBL_STATUS_LABELS[status]?.toLowerCase()}.`);
    await load();
  };

  const syncRoster = async () => {
    if (!program) return;
    const { data, error } = await db.rpc("hbl_sync_program_students", { p_program_id: program.id });
    if (error) return toast.error(error.message);
    toast.success(`Peserta disinkronkan: +${data?.added ?? 0} / -${data?.removed ?? 0}.`);
    await loadRoster();
  };

  if (loading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="text-xs font-bold text-muted-foreground lg:w-56">Semester
            <select value={semesterFilter} onChange={(event) => { setSemesterFilter(event.target.value); setProgramId(programs.find((item) => !event.target.value || item.semester_id === event.target.value)?.id || ""); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground">
              <option value="">Semua semester</option>
              {semesters.map((item) => <option key={item.id} value={item.id}>{item.academic_years?.name} · {item.name}{item.is_active ? " (aktif)" : ""}</option>)}
            </select>
          </label>
          <label className="flex-1 text-xs font-bold text-muted-foreground">Program kelas HBL
            <select value={programId} onChange={(event) => setProgramId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground">
              {!visiblePrograms.length && <option value="">Belum ada program</option>}
              {visiblePrograms.map((item) => (
                <option key={item.id} value={item.id}>{item.classes?.name || "Kelas belum ditautkan"} · {item.name} · {HBL_STATUS_LABELS[item.status] || item.status}</option>
              ))}
            </select>
          </label>
          {canManagePrograms && (
            <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-muted">
              <Plus className="h-4 w-4" /> Program kelas baru
            </button>
          )}
        </div>

        {showCreate && canManagePrograms && (
          <form onSubmit={createProgram} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground">Semester
              <select required value={form.semester_id} onChange={(event) => setForm({ ...form, semester_id: event.target.value, class_id: "" })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground">
                <option value="">Pilih semester</option>
                {semesters.map((item) => <option key={item.id} value={item.id}>{item.academic_years?.name} · {item.name}{item.is_active ? " (aktif)" : ""}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">Kelas
              <select required value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground">
                <option value="">Pilih kelas KB/TK</option>
                {classOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.units?.name}{item.units?.delivery_mode === "online" ? " (online)" : ""}</option>)}
              </select>
            </label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nama program (opsional, otomatis dari kelas)" className="h-10 rounded-md border bg-background px-3 text-sm" />
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Deskripsi singkat untuk orang tua (opsional)" className="h-10 rounded-md border bg-background px-3 text-sm" />
            <button disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50 md:col-span-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Buat Program
            </button>
          </form>
        )}
      </section>

      {!program ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Laptop className="mx-auto mb-2 h-8 w-8 opacity-30" />
          {canManagePrograms ? "Buat program untuk kelas HBL agar guru dapat menyusun tema dan pertemuan." : "Belum ada program HBL untuk kelas yang Anda ampu. Minta admin menautkan program ke kelas Anda."}
        </div>
      ) : (
        <>
          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{program.name}</h2>
                  {program.preschool_level && <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">{HBL_LEVEL_LABELS[program.preschool_level]}</span>}
                  <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${program.status === "published" ? "bg-emerald-50 text-emerald-700" : program.status === "archived" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{HBL_STATUS_LABELS[program.status]}</span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><School className="h-3.5 w-3.5" />{program.units?.name} · {program.semesters?.academic_years?.name} · Semester {program.semesters?.name}</p>
                {program.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{program.description}</p>}
              </div>
              {canManagePrograms && (
                <div className="flex flex-wrap gap-2">
                  {program.status !== "published" && <button onClick={() => void setStatus("published")} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Terbitkan ke orang tua</button>}
                  {program.status === "published" && <button onClick={() => void setStatus("draft")} className="rounded-md border px-3 py-2 text-xs font-bold">Jadikan draf</button>}
                  {program.status !== "archived" && <button onClick={() => void setStatus("archived")} className="rounded-md border px-3 py-2 text-xs font-bold text-muted-foreground">Arsipkan</button>}
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[1fr_auto] md:items-end">
              {canManagePrograms ? (
                <label className="text-xs font-bold text-muted-foreground">Kelas peserta (daftar siswa mengikuti kelas ini secara otomatis)
                  <select value={program.class_id || ""} onChange={(event) => void linkClass(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground md:max-w-md">
                    <option value="">Belum ditautkan</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.units?.name}</option>)}
                  </select>
                </label>
              ) : (
                <p className="text-sm"><span className="font-semibold">Kelas:</span> {program.classes?.name || "Belum ditautkan"}</p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRoster((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-muted">
                  <Users className="h-4 w-4" /> {roster.length} anak <ChevronDown className={`h-4 w-4 transition-transform ${showRoster ? "rotate-180" : ""}`} />
                </button>
                {program.class_id && (
                  <button type="button" title="Sinkronkan dengan daftar kelas" onClick={() => void syncRoster()} className="inline-flex h-10 items-center rounded-md border px-3 hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
                )}
              </div>
            </div>
            {!program.class_id && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Program belum ditautkan ke kelas, sehingga belum ada anak yang terdaftar dan orang tua belum dapat melihatnya.</p>
            )}
            {showRoster && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {roster.map((student) => <span key={student.id} className="rounded bg-muted px-2 py-1 text-xs">{student.full_name}</span>)}
                {!roster.length && <span className="text-xs text-muted-foreground">Belum ada peserta.</span>}
              </div>
            )}
          </section>

          <HblThemePlanner program={program} roster={roster} />
        </>
      )}
    </div>
  );
};
