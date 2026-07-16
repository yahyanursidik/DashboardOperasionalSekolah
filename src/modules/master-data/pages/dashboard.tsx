/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Archive, BookOpen, Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, Edit3, GraduationCap, Loader2, Plus, RefreshCw, Save, Search, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentRoles } from "../../../hooks/useAuth";
import { hasAnyRole } from "../../../lib/permissions";
import { supabaseClient } from "../../../lib/supabase/client";

type Tab = "overview" | "units" | "years" | "semesters" | "unit_periods";
type Unit = { id: string; name: string; code?: string | null; education_level?: string | null; address?: string | null; phone?: string | null; email?: string | null; principal_employee_id?: string | null; is_active?: boolean; sort_order?: number; employees?: { full_name?: string } | null };
type AcademicYear = { id: string; name: string; start_date?: string | null; end_date?: string | null; is_active?: boolean; status?: "planned" | "active" | "closed"; locked_at?: string | null; notes?: string | null };
type Semester = { id: string; academic_year_id: string; name: string; start_date?: string | null; end_date?: string | null; is_active?: boolean; status?: "planned" | "active" | "closed"; locked_at?: string | null; notes?: string | null; academic_years?: { name?: string } | null };
type UnitPeriod = { id: string; unit_id: string; academic_year_id: string; semester_id: string; learning_start_date?: string | null; learning_end_date?: string | null; student_entry_date?: string | null; report_distribution_date?: string | null; notes?: string | null };
type Employee = { id: string; full_name: string; position?: string | null; unit_id?: string | null };
type Usage = { classes: number; students: number; employees: number };

const PAGE_SIZE = 10;
const levelOptions = [
  { value: "preschool", label: "Preschool / KB-TK" }, { value: "elementary", label: "Elementary / SD" },
  { value: "junior", label: "Junior / SMP" }, { value: "senior", label: "Senior / SMA" },
  { value: "nonformal", label: "Program nonformal" }, { value: "support", label: "Unit pendukung" },
];
const levelLabel = (value?: string | null) => levelOptions.find((item) => item.value === value)?.label || "Belum ditentukan";
const dateLabel = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Belum diatur";
const statusStyle = (status?: string, active?: boolean) => active || status === "active" ? "bg-emerald-50 text-emerald-700" : status === "closed" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700";
const statusLabel = (status?: string, active?: boolean) => active || status === "active" ? "Aktif" : status === "closed" ? "Ditutup" : "Direncanakan";
const isMissingSchema = (message?: string) => Boolean(message && (message.includes("schema cache") || message.includes("does not exist") || message.includes("column")));

const Modal: React.FC<{ open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode }> = ({ open, title, description, onClose, children }) => open ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-card shadow-xl sm:rounded-lg"><header className="flex items-start justify-between gap-4 border-b p-5"><div><h2 className="text-lg font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><button type="button" onClick={onClose} title="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted"><X className="h-5 w-5" /></button></header>{children}</section></div> : null;

const Pagination: React.FC<{ page: number; total: number; onChange: (page: number) => void }> = ({ page, total, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row"><p className="text-xs text-muted-foreground">Menampilkan {total ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, total)} dari {total} data</p><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => onChange(page - 1)} title="Sebelumnya" className="flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-20 text-center text-xs font-bold">{page} / {pages}</span><button disabled={page >= pages} onClick={() => onChange(page + 1)} title="Berikutnya" className="flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>;
};

export const MasterDataDashboard: React.FC = () => {
  const { activeSemesterId, setActiveYearId, setActiveSemesterId } = useAcademicYear();
  const { roles } = useCurrentRoles();
  const canManageGlobal = hasAnyRole(roles, ["super_admin", "ketua_yayasan", "kepsek", "wakasek", "kepala_tu", "admin_tu", "admin_sekolah"]);
  const [tab, setTab] = useState<Tab>("overview");
  const [units, setUnits] = useState<Unit[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [unitPeriods, setUnitPeriods] = useState<UnitPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [usage, setUsage] = useState<Record<string, Usage>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [unitForm, setUnitForm] = useState<Partial<Unit> | null>(null);
  const [yearForm, setYearForm] = useState<Partial<AcademicYear> | null>(null);
  const [semesterForm, setSemesterForm] = useState<Partial<Semester> | null>(null);
  const [periodForm, setPeriodForm] = useState<Partial<UnitPeriod> | null>(null);

  const load = async () => {
    setLoading(true);
    const [unitResult, yearResult, semesterResult, periodResult, employeeResult, classResult, studentResult, employeeUsageResult] = await Promise.all([
      supabaseClient.from("units").select("*,employees!units_principal_employee_id_fkey(full_name)").order("sort_order").order("name"),
      supabaseClient.from("academic_years").select("*").order("start_date", { ascending: false }).order("name", { ascending: false }),
      supabaseClient.from("semesters").select("*,academic_years(name)").order("start_date", { ascending: false }),
      supabaseClient.from("unit_academic_period_settings").select("*").order("unit_id"),
      supabaseClient.from("employees").select("id,full_name,position,unit_id").eq("status", "active").order("full_name"),
      supabaseClient.from("classes").select("unit_id"), supabaseClient.from("students").select("unit_id").eq("status", "active"),
      supabaseClient.from("employees").select("unit_id").eq("status", "active"),
    ]);
    if (unitResult.error) {
      const fallback = await supabaseClient.from("units").select("id,name").order("name");
      setUnits((fallback.data || []) as unknown as Unit[]);
    } else setUnits((unitResult.data || []) as unknown as Unit[]);
    setYears((yearResult.data || []) as unknown as AcademicYear[]);
    setSemesters((semesterResult.data || []) as unknown as Semester[]);
    setUnitPeriods(periodResult.error ? [] : (periodResult.data || []) as unknown as UnitPeriod[]);
    setEmployees((employeeResult.data || []) as unknown as Employee[]);
    const nextUsage: Record<string, Usage> = {};
    const touch = (unitId?: string | null) => unitId ? (nextUsage[unitId] ||= { classes: 0, students: 0, employees: 0 }) : null;
    ((classResult.data || []) as Array<{ unit_id?: string | null }>).forEach((item) => { const row = touch(item.unit_id); if (row) row.classes += 1; });
    ((studentResult.data || []) as Array<{ unit_id?: string | null }>).forEach((item) => { const row = touch(item.unit_id); if (row) row.students += 1; });
    ((employeeUsageResult.data || []) as Array<{ unit_id?: string | null }>).forEach((item) => { const row = touch(item.unit_id); if (row) row.employees += 1; });
    setUsage(nextUsage); setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { setPage(1); setQuery(""); }, [tab]);

  const activeYear = years.find((item) => item.is_active || item.status === "active");
  const activeSemester = semesters.find((item) => item.is_active || item.status === "active");
  const activeUnits = units.filter((item) => item.is_active !== false);
  const readiness = [
    { label: "Tahun ajaran aktif tersedia", done: Boolean(activeYear) },
    { label: "Semester aktif sesuai tahun ajaran", done: Boolean(activeSemester && activeSemester.academic_year_id === activeYear?.id) },
    { label: "Seluruh unit memiliki kode", done: activeUnits.length > 0 && activeUnits.every((item) => item.code) },
    { label: "Tanggal operasional unit terisi", done: Boolean(activeSemester && activeUnits.every((unit) => unitPeriods.some((item) => item.unit_id === unit.id && item.semester_id === activeSemester.id && item.learning_start_date && item.learning_end_date))) },
  ];
  const issues = readiness.filter((item) => !item.done);

  const saveUnit = async () => {
    if (!unitForm?.name?.trim()) return toast.error("Nama unit wajib diisi.");
    setSaving(true);
    const payload = { name: unitForm.name.trim(), code: unitForm.code?.trim().toUpperCase() || null, education_level: unitForm.education_level || null, address: unitForm.address?.trim() || null, phone: unitForm.phone?.trim() || null, email: unitForm.email?.trim() || null, principal_employee_id: unitForm.principal_employee_id || null, is_active: unitForm.is_active ?? true, sort_order: Number(unitForm.sort_order) || 0 };
    let result = unitForm.id ? await supabaseClient.from("units").update(payload).eq("id", unitForm.id) : await supabaseClient.from("units").insert(payload);
    if (result.error && isMissingSchema(result.error.message)) result = unitForm.id ? await supabaseClient.from("units").update({ name: payload.name }).eq("id", unitForm.id) : await supabaseClient.from("units").insert({ name: payload.name });
    setSaving(false); if (result.error) return toast.error(result.error.message);
    toast.success(unitForm.id ? "Unit berhasil diperbarui." : "Unit berhasil ditambahkan."); setUnitForm(null); await load();
  };

  const archiveUnit = async (unit: Unit) => {
    const { error } = await supabaseClient.from("units").update({ is_active: unit.is_active === false }).eq("id", unit.id);
    if (error && isMissingSchema(error.message)) return toast.error("Jalankan migrasi Data Induk sebelum mengarsipkan unit.");
    if (error) return toast.error(error.message); toast.success(unit.is_active === false ? "Unit diaktifkan kembali." : "Unit diarsipkan tanpa menghapus riwayat."); await load();
  };

  const saveYear = async () => {
    if (!yearForm?.name?.trim()) return toast.error("Nama tahun ajaran wajib diisi.");
    if (yearForm.start_date && yearForm.end_date && yearForm.end_date <= yearForm.start_date) return toast.error("Tanggal selesai harus setelah tanggal mulai.");
    setSaving(true);
    const payload = { name: yearForm.name.trim(), start_date: yearForm.start_date || null, end_date: yearForm.end_date || null, notes: yearForm.notes?.trim() || null, status: yearForm.status || "planned", is_active: yearForm.is_active || false };
    let result = yearForm.id ? await supabaseClient.from("academic_years").update(payload).eq("id", yearForm.id) : await supabaseClient.from("academic_years").insert(payload);
    if (result.error && isMissingSchema(result.error.message)) {
      const legacy = { name: payload.name, start_date: payload.start_date, end_date: payload.end_date, is_active: payload.is_active };
      result = yearForm.id ? await supabaseClient.from("academic_years").update(legacy).eq("id", yearForm.id) : await supabaseClient.from("academic_years").insert(legacy);
    }
    setSaving(false); if (result.error) return toast.error(result.error.message);
    toast.success(yearForm.id ? "Tahun ajaran diperbarui." : "Tahun ajaran ditambahkan sebagai rencana."); setYearForm(null); await load();
  };

  const saveSemester = async () => {
    if (!semesterForm?.academic_year_id || !semesterForm.name) return toast.error("Tahun ajaran dan semester wajib dipilih.");
    if (semesterForm.start_date && semesterForm.end_date && semesterForm.end_date <= semesterForm.start_date) return toast.error("Tanggal selesai harus setelah tanggal mulai.");
    const duplicate = semesters.some((item) => item.id !== semesterForm.id && item.academic_year_id === semesterForm.academic_year_id && item.name === semesterForm.name);
    if (duplicate) return toast.error("Semester tersebut sudah tersedia pada tahun ajaran ini.");
    setSaving(true);
    const payload = { academic_year_id: semesterForm.academic_year_id, name: semesterForm.name, start_date: semesterForm.start_date || null, end_date: semesterForm.end_date || null, notes: semesterForm.notes?.trim() || null, status: semesterForm.status || "planned", is_active: semesterForm.is_active || false };
    let result = semesterForm.id ? await supabaseClient.from("semesters").update(payload).eq("id", semesterForm.id) : await supabaseClient.from("semesters").insert(payload);
    if (result.error && isMissingSchema(result.error.message)) {
      const legacy = { academic_year_id: payload.academic_year_id, name: payload.name, start_date: payload.start_date, end_date: payload.end_date, is_active: payload.is_active };
      result = semesterForm.id ? await supabaseClient.from("semesters").update(legacy).eq("id", semesterForm.id) : await supabaseClient.from("semesters").insert(legacy);
    }
    setSaving(false); if (result.error) return toast.error(result.error.message);
    toast.success(semesterForm.id ? "Semester diperbarui." : "Semester ditambahkan sebagai rencana."); setSemesterForm(null); await load();
  };

  const activatePeriod = async (semester: Semester) => {
    setSaving(true);
    const client = supabaseClient as unknown as { rpc: (name: string, params: Record<string, string>) => Promise<{ error: { message: string } | null }> };
    let result = await client.rpc("master_data_activate_period", { p_academic_year_id: semester.academic_year_id, p_semester_id: semester.id });
    if (result.error && isMissingSchema(result.error.message)) {
      const [yearsOff, semestersOff] = await Promise.all([supabaseClient.from("academic_years").update({ is_active: false }).neq("id", semester.academic_year_id), supabaseClient.from("semesters").update({ is_active: false }).neq("id", semester.id)]);
      const yearOn = await supabaseClient.from("academic_years").update({ is_active: true }).eq("id", semester.academic_year_id);
      const semesterOn = await supabaseClient.from("semesters").update({ is_active: true }).eq("id", semester.id);
      result = { error: yearsOff.error || semestersOff.error || yearOn.error || semesterOn.error };
    }
    setSaving(false); if (result.error) return toast.error(result.error.message);
    setActiveYearId(semester.academic_year_id); setActiveSemesterId?.(semester.id); toast.success("Konteks tahun ajaran dan semester aktif telah diselaraskan."); await load();
  };

  const closePeriod = async (semester: Semester) => {
    setSaving(true);
    const client = supabaseClient as unknown as { rpc: (name: string, params: Record<string, string>) => Promise<{ error: { message: string } | null }> };
    let result = await client.rpc("master_data_close_period", { p_academic_year_id: semester.academic_year_id, p_semester_id: semester.id });
    if (result.error && isMissingSchema(result.error.message)) result = await supabaseClient.from("semesters").update({ is_active: false }).eq("id", semester.id);
    setSaving(false); if (result.error) return toast.error(result.error.message);
    if (activeSemesterId === semester.id) setActiveSemesterId?.(null); toast.success("Semester ditutup dan tidak lagi menjadi konteks aktif."); await load();
  };

  const saveUnitPeriod = async () => {
    if (!periodForm?.unit_id || !periodForm.semester_id) return toast.error("Unit dan semester wajib dipilih.");
    const semester = semesters.find((item) => item.id === periodForm.semester_id);
    if (!semester) return;
    if (periodForm.learning_start_date && periodForm.learning_end_date && periodForm.learning_end_date < periodForm.learning_start_date) return toast.error("Akhir pembelajaran tidak boleh sebelum tanggal mulai.");
    setSaving(true);
    const payload = { unit_id: periodForm.unit_id, academic_year_id: semester.academic_year_id, semester_id: semester.id, learning_start_date: periodForm.learning_start_date || null, learning_end_date: periodForm.learning_end_date || null, student_entry_date: periodForm.student_entry_date || null, report_distribution_date: periodForm.report_distribution_date || null, notes: periodForm.notes?.trim() || null };
    const { error } = await supabaseClient.from("unit_academic_period_settings").upsert(payload, { onConflict: "unit_id,semester_id" });
    setSaving(false); if (error) return toast.error(isMissingSchema(error.message) ? "Jalankan migrasi Data Induk untuk mengaktifkan kalender per unit." : error.message);
    toast.success("Tanggal operasional unit berhasil disimpan."); setPeriodForm(null); await load();
  };

  const filteredUnits = useMemo(() => units.filter((item) => [item.name, item.code, item.education_level, item.email].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())), [query, units]);
  const filteredYears = useMemo(() => years.filter((item) => [item.name, item.status, item.notes].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())), [query, years]);
  const filteredSemesters = useMemo(() => semesters.filter((item) => [item.name, item.academic_years?.name, item.status].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())), [query, semesters]);
  const slice = <T,>(items: T[]) => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const inputClass = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memeriksa data induk...</div>;

  const tabs = [
    { id: "overview" as const, label: "Ringkasan", icon: ShieldCheck }, { id: "units" as const, label: "Unit Pendidikan", icon: Building2 },
    { id: "years" as const, label: "Tahun Ajaran", icon: CalendarDays }, { id: "semesters" as const, label: "Semester", icon: BookOpen },
    { id: "unit_periods" as const, label: "Kalender per Unit", icon: Settings2 },
  ];

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><PageHeader title="Data Induk Sekolah" description="Kelola identitas unit dan periode akademik yang menjadi acuan seluruh fitur sekolah." /><button onClick={() => void load()} className="flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" />Perbarui Data</button></div>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { label: "Unit aktif", value: activeUnits.length, detail: `${units.length - activeUnits.length} diarsipkan`, icon: Building2, tone: "bg-blue-50 text-blue-700" },
      { label: "Tahun ajaran aktif", value: activeYear?.name || "Belum ada", detail: activeYear ? `${dateLabel(activeYear.start_date)} - ${dateLabel(activeYear.end_date)}` : "Wajib ditentukan", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Semester aktif", value: activeSemester?.name || "Belum ada", detail: activeSemester?.academic_years?.name || activeYear?.name || "Belum selaras", icon: BookOpen, tone: "bg-amber-50 text-amber-700" },
      { label: "Kesiapan data", value: `${readiness.length - issues.length}/${readiness.length}`, detail: issues.length ? `${issues.length} hal perlu dilengkapi` : "Siap digunakan", icon: ShieldCheck, tone: issues.length ? "bg-red-50 text-red-700" : "bg-violet-50 text-violet-700" },
    ].map((item) => <article key={item.label} className="rounded-lg border bg-card p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-4 w-4" /></div><p className="mt-4 truncate text-xl font-bold">{item.value}</p><p className="mt-0.5 text-xs font-semibold text-muted-foreground">{item.label}</p><p className="mt-2 truncate text-[11px] text-muted-foreground">{item.detail}</p></article>)}</section>

    <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" aria-label="Bagian data induk">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-semibold ${tab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav>

      {tab === "overview" && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="rounded-lg border bg-card p-5">{!canManageGlobal && <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">Sebagai admin unit, Anda dapat memperbarui identitas dan kalender unit sendiri. Aktivasi tahun ajaran dan semester dikelola pimpinan atau admin sekolah agar konteks seluruh unit tetap konsisten.</div>}<h2 className="font-bold">Urutan kerja yang direkomendasikan</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[
      { title: "1. Lengkapi unit", text: "Kode, jenjang, kontak, pimpinan, dan status unit.", action: () => setTab("units"), icon: Building2 },
      { title: "2. Siapkan tahun ajaran", text: "Tetapkan rentang tahun sebelum membuat semester.", action: () => setTab("years"), icon: CalendarDays },
      { title: "3. Aktifkan semester", text: "Aktivasi otomatis menyelaraskan konteks seluruh aplikasi.", action: () => setTab("semesters"), icon: BookOpen },
      { title: "4. Atur tanggal per unit", text: "Sesuaikan awal belajar, masuk siswa, dan pembagian rapor.", action: () => setTab("unit_periods"), icon: Settings2 },
    ].map((item) => <button key={item.title} onClick={item.action} className="flex gap-3 rounded-md border p-4 text-left hover:border-primary/40 hover:bg-muted/30"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><item.icon className="h-4 w-4" /></div><span><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.text}</span></span></button>)}</div><h2 className="mt-7 font-bold">Dampak ke fitur lain</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{[{ to: "/classes", label: "Kelas & siswa", icon: Users }, { to: "/curriculum", label: "Kurikulum", icon: GraduationCap }, { to: "/schedules", label: "Jadwal", icon: Clock3 }].map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-2 rounded-md border px-3 py-3 text-sm font-semibold hover:bg-muted"><item.icon className="h-4 w-4 text-primary" />{item.label}</Link>)}</div></section><aside className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><CircleAlert className={`h-5 w-5 ${issues.length ? "text-amber-600" : "text-emerald-600"}`} /><h2 className="font-bold">Pemeriksaan kesiapan</h2></div><div className="mt-4 space-y-3">{readiness.map((item) => <div key={item.label} className="flex items-start gap-2 text-sm"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} /><span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span></div>)}</div>{issues.length > 0 && <div className="mt-5 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">Lengkapi item di atas sebelum membuka input nilai, jadwal, tagihan, dan rapor untuk periode baru.</div>}</aside></div>}

      {tab !== "overview" && <section className="overflow-hidden rounded-lg border bg-card"><div className="flex flex-col justify-between gap-3 border-b p-4 sm:flex-row"><label className="relative block w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Cari ${tabs.find((item) => item.id === tab)?.label.toLowerCase()}...`} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></label>{tab === "units" && canManageGlobal && <button onClick={() => setUnitForm({ name: "", is_active: true, sort_order: units.length })} className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />Tambah Unit</button>}{tab === "years" && canManageGlobal && <button onClick={() => setYearForm({ name: "", status: "planned", is_active: false })} className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />Tambah Tahun</button>}{tab === "semesters" && canManageGlobal && <button onClick={() => setSemesterForm({ name: "Ganjil", academic_year_id: activeYear?.id || years[0]?.id || "", status: "planned", is_active: false })} className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />Tambah Semester</button>}</div>

      {tab === "units" && <>{slice(filteredUnits).map((unit) => { const stats = usage[unit.id] || { classes: 0, students: 0, employees: 0 }; return <article key={unit.id} className={`flex flex-col gap-4 border-b p-4 last:border-b-0 sm:flex-row sm:items-center ${unit.is_active === false ? "bg-muted/30" : ""}`}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{unit.name}</h2>{unit.code && <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold">{unit.code}</span>}<span className={`rounded px-2 py-0.5 text-[10px] font-bold ${unit.is_active === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{unit.is_active === false ? "Diarsipkan" : "Aktif"}</span></div><p className="mt-1 text-xs text-muted-foreground">{levelLabel(unit.education_level)} · Pimpinan: {unit.employees?.full_name || "Belum ditentukan"}</p><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>{stats.classes} kelas</span><span>{stats.students} siswa aktif</span><span>{stats.employees} pegawai</span></div></div><div className="flex justify-end gap-1"><button onClick={() => setUnitForm(unit)} title="Ubah unit" className="flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"><Edit3 className="h-4 w-4" /></button><button onClick={() => void archiveUnit(unit)} title={unit.is_active === false ? "Aktifkan unit" : "Arsipkan unit"} className="flex h-9 w-9 items-center justify-center rounded-md text-amber-700 hover:bg-amber-50"><Archive className="h-4 w-4" /></button></div></article>; })}<Pagination page={page} total={filteredUnits.length} onChange={setPage} /></>}

      {tab === "years" && <>{slice(filteredYears).map((year) => <article key={year.id} className={`flex flex-col gap-4 border-b p-4 last:border-b-0 sm:flex-row sm:items-center ${year.is_active ? "bg-emerald-50/30" : ""}`}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><CalendarDays className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{year.name}</h2><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusStyle(year.status, year.is_active)}`}>{statusLabel(year.status, year.is_active)}</span></div><p className="mt-1 text-xs text-muted-foreground">{dateLabel(year.start_date)} - {dateLabel(year.end_date)} · {semesters.filter((item) => item.academic_year_id === year.id).length} semester</p></div>{canManageGlobal && year.status !== "closed" && <button onClick={() => setYearForm(year)} title="Ubah tahun ajaran" className="flex h-9 w-9 items-center justify-center self-end rounded-md text-blue-600 hover:bg-blue-50 sm:self-auto"><Edit3 className="h-4 w-4" /></button>}</article>)}<Pagination page={page} total={filteredYears.length} onChange={setPage} /></>}

      {tab === "semesters" && <>{slice(filteredSemesters).map((semester) => <article key={semester.id} className={`flex flex-col gap-4 border-b p-4 last:border-b-0 lg:flex-row lg:items-center ${semester.is_active ? "bg-emerald-50/30" : ""}`}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700"><BookOpen className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Semester {semester.name}</h2><span className="text-sm text-muted-foreground">{semester.academic_years?.name}</span><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusStyle(semester.status, semester.is_active)}`}>{statusLabel(semester.status, semester.is_active)}</span></div><p className="mt-1 text-xs text-muted-foreground">{dateLabel(semester.start_date)} - {dateLabel(semester.end_date)}</p></div>{canManageGlobal && semester.status !== "closed" && <div className="flex flex-wrap justify-end gap-2"><button onClick={() => setSemesterForm(semester)} className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold"><Edit3 className="h-4 w-4" />Ubah</button>{!semester.is_active && <button disabled={saving} onClick={() => void activatePeriod(semester)} className="flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />Aktifkan Periode</button>}{semester.is_active && <button disabled={saving} onClick={() => void closePeriod(semester)} className="flex h-9 items-center gap-2 rounded-md border border-amber-300 px-3 text-xs font-bold text-amber-800"><Archive className="h-4 w-4" />Tutup Semester</button>}</div>}</article>)}<Pagination page={page} total={filteredSemesters.length} onChange={setPage} /></>}

      {tab === "unit_periods" && <div className="p-4"><div className="mb-4 rounded-md border bg-muted/20 p-4 text-sm"><strong>Periode acuan: </strong>{activeYear?.name || "Belum aktif"} · Semester {activeSemester?.name || "belum aktif"}<p className="mt-1 text-xs text-muted-foreground">Tanggal di bawah dapat berbeda antarunit tanpa mengubah tahun ajaran dan semester global.</p></div><div className="grid gap-3 md:grid-cols-2">{activeUnits.filter((unit) => unit.name.toLowerCase().includes(query.toLowerCase())).map((unit) => { const setting = unitPeriods.find((item) => item.unit_id === unit.id && item.semester_id === activeSemester?.id); return <article key={unit.id} className="rounded-md border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{unit.name}</h2><p className="text-xs text-muted-foreground">{levelLabel(unit.education_level)}</p></div><span className={`rounded px-2 py-1 text-[10px] font-bold ${setting?.learning_start_date && setting?.learning_end_date ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{setting ? "Dikonfigurasi" : "Belum diatur"}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Mulai belajar</dt><dd className="mt-1 font-semibold">{dateLabel(setting?.learning_start_date)}</dd></div><div><dt className="text-muted-foreground">Akhir belajar</dt><dd className="mt-1 font-semibold">{dateLabel(setting?.learning_end_date)}</dd></div><div><dt className="text-muted-foreground">Siswa masuk</dt><dd className="mt-1 font-semibold">{dateLabel(setting?.student_entry_date)}</dd></div><div><dt className="text-muted-foreground">Pembagian rapor</dt><dd className="mt-1 font-semibold">{dateLabel(setting?.report_distribution_date)}</dd></div></dl><button disabled={!activeSemester} onClick={() => setPeriodForm(setting || { unit_id: unit.id, academic_year_id: activeYear?.id, semester_id: activeSemester?.id })} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md border text-xs font-bold disabled:opacity-40"><Settings2 className="h-4 w-4" />Atur Tanggal Unit</button></article>; })}</div></div>}
    </section>}

    <Modal open={Boolean(unitForm)} onClose={() => setUnitForm(null)} title={unitForm?.id ? "Ubah Unit Pendidikan" : "Tambah Unit Pendidikan"} description="Identitas ini digunakan pada kelas, dokumen, portal, laporan, dan keuangan."><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Nama resmi unit *<input value={unitForm?.name || ""} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Kode unit<input maxLength={20} value={unitForm?.code || ""} onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value })} placeholder="TSLS-EL" className={inputClass} /></label><label className="text-sm font-medium">Jenjang<select value={unitForm?.education_level || ""} onChange={(e) => setUnitForm({ ...unitForm, education_level: e.target.value })} className={inputClass}><option value="">Pilih jenjang</option>{levelOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Pimpinan unit<select value={unitForm?.principal_employee_id || ""} onChange={(e) => setUnitForm({ ...unitForm, principal_employee_id: e.target.value })} className={inputClass}><option value="">Belum ditentukan</option>{employees.filter((employee) => !unitForm?.id || !employee.unit_id || employee.unit_id === unitForm.id).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.position || "Pegawai"}</option>)}</select></label><label className="text-sm font-medium">Telepon<input value={unitForm?.phone || ""} onChange={(e) => setUnitForm({ ...unitForm, phone: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Email<input type="email" value={unitForm?.email || ""} onChange={(e) => setUnitForm({ ...unitForm, email: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Alamat<textarea rows={3} value={unitForm?.address || ""} onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label><label className="text-sm font-medium">Urutan<input type="number" min={0} value={unitForm?.sort_order ?? 0} onChange={(e) => setUnitForm({ ...unitForm, sort_order: Number(e.target.value) })} className={inputClass} /></label><label className="flex items-center gap-3 self-end rounded-md border p-3 text-sm"><input type="checkbox" checked={unitForm?.is_active ?? true} onChange={(e) => setUnitForm({ ...unitForm, is_active: e.target.checked })} />Unit aktif</label></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={() => setUnitForm(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button disabled={saving || !unitForm?.name?.trim()} onClick={() => void saveUnit()} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Unit</button></div></Modal>

    <Modal open={Boolean(yearForm)} onClose={() => setYearForm(null)} title={yearForm?.id ? "Ubah Tahun Ajaran" : "Tambah Tahun Ajaran"} description="Tahun baru disimpan sebagai rencana dan diaktifkan melalui semester."><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Nama tahun ajaran *<input value={yearForm?.name || ""} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="2026/2027" className={inputClass} /></label><label className="text-sm font-medium">Tanggal mulai<input type="date" value={yearForm?.start_date || ""} onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Tanggal selesai<input type="date" value={yearForm?.end_date || ""} onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Catatan<textarea rows={3} value={yearForm?.notes || ""} onChange={(e) => setYearForm({ ...yearForm, notes: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={() => setYearForm(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button disabled={saving || !yearForm?.name?.trim()} onClick={() => void saveYear()} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Tahun</button></div></Modal>

    <Modal open={Boolean(semesterForm)} onClose={() => setSemesterForm(null)} title={semesterForm?.id ? "Ubah Semester" : "Tambah Semester"} description="Semester selalu terikat ke satu tahun ajaran."><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Tahun ajaran *<select value={semesterForm?.academic_year_id || ""} onChange={(e) => setSemesterForm({ ...semesterForm, academic_year_id: e.target.value })} className={inputClass}><option value="">Pilih tahun</option>{years.filter((year) => year.status !== "closed" || year.id === semesterForm?.academic_year_id).map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Semester *<select value={semesterForm?.name || "Ganjil"} onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })} className={inputClass}><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></label><label className="text-sm font-medium">Tanggal mulai<input type="date" value={semesterForm?.start_date || ""} onChange={(e) => setSemesterForm({ ...semesterForm, start_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Tanggal selesai<input type="date" value={semesterForm?.end_date || ""} onChange={(e) => setSemesterForm({ ...semesterForm, end_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Catatan<textarea rows={3} value={semesterForm?.notes || ""} onChange={(e) => setSemesterForm({ ...semesterForm, notes: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={() => setSemesterForm(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button disabled={saving || !semesterForm?.academic_year_id} onClick={() => void saveSemester()} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Semester</button></div></Modal>

    <Modal open={Boolean(periodForm)} onClose={() => setPeriodForm(null)} title="Tanggal Operasional Unit" description={units.find((item) => item.id === periodForm?.unit_id)?.name}><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-medium">Mulai pembelajaran<input type="date" value={periodForm?.learning_start_date || ""} onChange={(e) => setPeriodForm({ ...periodForm, learning_start_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Akhir pembelajaran<input type="date" value={periodForm?.learning_end_date || ""} onChange={(e) => setPeriodForm({ ...periodForm, learning_end_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Hari pertama siswa<input type="date" value={periodForm?.student_entry_date || ""} onChange={(e) => setPeriodForm({ ...periodForm, student_entry_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Pembagian rapor<input type="date" value={periodForm?.report_distribution_date || ""} onChange={(e) => setPeriodForm({ ...periodForm, report_distribution_date: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Catatan unit<textarea rows={3} value={periodForm?.notes || ""} onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={() => setPeriodForm(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button disabled={saving} onClick={() => void saveUnitPeriod()} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Tanggal</button></div></Modal>
  </div>;
};
