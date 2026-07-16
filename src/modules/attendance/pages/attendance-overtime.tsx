/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Download, Loader2, MapPin, Search, Send, TimerReset, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { exportToCsv } from "../../../lib/csv";

const TASK_TYPES = [["additional_duty", "Tugas Tambahan"], ["meeting", "Rapat"], ["event", "Kegiatan Sekolah"], ["emergency", "Kebutuhan Mendesak"], ["replacement", "Pengganti / Backup"], ["other", "Lainnya"]];
const COMPENSATIONS = [["paid", "Dibayar"], ["time_off", "Pengganti Waktu"], ["included", "Termasuk Honor/Kontrak"], ["none", "Tanpa Kompensasi"]];
const EMPTY_FORM = { unit_id: "", overtime_date: new Date().toISOString().slice(0, 10), planned_start_time: "16:00", planned_end_time: "18:00", check_in_close: "18:00", break_minutes: "0", task_type: "additional_duty", compensation_type: "paid", site_id: "", require_geofence: false, reason: "" };

function shortTime(value?: string) { return String(value || "-").slice(0, 5); }
function formatDate(value?: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
function formatMinutes(value?: number) { const minutes = Number(value || 0); return `${Math.floor(minutes / 60)}j ${minutes % 60}m`; }
function labelFor(options: string[][], value?: string) { return options.find(([key]) => key === value)?.[1] || value || "-"; }

export const AttendanceOvertime: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [overtimeResult, employeeResult, unitResult, siteResult] = await Promise.all([
      supabaseClient.from("employee_overtime").select("*,employees(full_name,nik,position,employment_type,attendance_mode,units(name)),units(name),attendance_sites(name,address,radius_meters)").order("overtime_date", { ascending: false }).order("planned_start_time", { ascending: false }).limit(300),
      supabaseClient.from("employees").select("id,full_name,nik,position,employment_type,attendance_mode,unit_id,units(name)").eq("status", "active").order("full_name"),
      supabaseClient.from("units").select("id,name").order("name"),
      supabaseClient.from("attendance_sites").select("id,name,attendance_site_units(unit_id)").eq("is_active", true).order("name"),
    ]);
    const error = overtimeResult.error || employeeResult.error || unitResult.error || siteResult.error;
    if (error) toast.error("Data lembur belum dapat dimuat", { description: error.message });
    setRows((overtimeResult.data || []) as any[]);
    setEmployees(employeeResult.data || []);
    setUnits(unitResult.data || []);
    setSites(siteResult.data || []);
    setIsLoading(false);
  };
  useEffect(() => { void loadData(); }, []);

  const visibleEmployees = useMemo(() => employees.filter((employee) => {
    if (form.unit_id && employee.unit_id !== form.unit_id) return false;
    const query = search.trim().toLowerCase();
    return !query || [employee.full_name, employee.nik, employee.position, employee.units?.name].some((value) => String(value || "").toLowerCase().includes(query));
  }), [employees, form.unit_id, search]);
  const eligibleSites = useMemo(() => sites.filter((site) => !form.unit_id || site.attendance_site_units?.length === 0 || site.attendance_site_units?.some((mapping: any) => mapping.unit_id === form.unit_id)), [form.unit_id, sites]);
  const filteredRows = rows.filter((row) => statusFilter === "all" || row.status === statusFilter);
  const summary = { pending: rows.filter((row) => row.status === "pending").length, approved: rows.filter((row) => row.status === "approved").length, completed: rows.filter((row) => row.status === "completed").length, minutes: rows.filter((row) => row.status === "completed").reduce((sum, row) => sum + Number(row.actual_minutes || 0), 0) };

  const assignOvertime = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedEmployees.size === 0) return toast.error("Pilih minimal satu pegawai.");
    if (form.require_geofence && !form.site_id) return toast.error("Pilih lokasi GPS lembur.");
    setIsSaving(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const payload = Array.from(selectedEmployees).map((employeeId) => {
        const employee = employees.find((item) => item.id === employeeId);
        return {
          employee_id: employeeId, unit_id: form.unit_id || employee?.unit_id || null,
          overtime_date: form.overtime_date, planned_start_time: form.planned_start_time,
          planned_end_time: form.planned_end_time, check_in_close: form.check_in_close,
          break_minutes: Number(form.break_minutes), task_type: form.task_type,
          reason: form.reason.trim(), request_source: "manager", status: "approved",
          compensation_type: form.compensation_type, site_id: form.site_id || null,
          require_geofence: form.require_geofence, approved_at: new Date().toISOString(),
          approved_by: sessionData.session?.user.id || null,
        };
      });
      const { error } = await supabaseClient.from("employee_overtime").insert(payload);
      if (error) throw error;
      toast.success(`Lembur ditugaskan kepada ${payload.length} pegawai.`);
      setSelectedEmployees(new Set()); setSearch(""); setForm({ ...EMPTY_FORM, overtime_date: new Date().toISOString().slice(0, 10) });
      await loadData();
    } catch (error: any) { const message = String(error?.message || ""); toast.error("Penugasan lembur belum dapat disimpan", { description: message.includes("OVERTIME_OVERLAPS_REGULAR_DUTY") ? "Waktu yang dipilih masih termasuk jam kerja, shift, atau jadwal mengajar normal." : message.includes("OVERTIME_SCHEDULE_CONFLICT") ? "Ada jadwal lembur lain yang bertabrakan." : message }); }
    finally { setIsSaving(false); }
  };

  const review = async (row: any, status: "approved" | "rejected") => {
    setIsSaving(true);
    const { error } = await supabaseClient.rpc("review_employee_overtime", { p_overtime_id: row.id, p_status: status, p_compensation_type: status === "approved" ? (row.compensation_type === "pending" ? "paid" : row.compensation_type) : "pending", p_review_note: reviewNotes[row.id] || null });
    if (error) toast.error("Pengajuan belum dapat ditinjau", { description: error.message });
    else { toast.success(status === "approved" ? "Pengajuan lembur disetujui." : "Pengajuan lembur ditolak."); await loadData(); }
    setIsSaving(false);
  };

  const toggleEmployee = (id: string) => setSelectedEmployees((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const exportRecap = () => {
    const completedRows = rows.filter((row) => row.status === "completed");
    if (completedRows.length === 0) return toast.error("Belum ada lembur selesai untuk diekspor.");
    exportToCsv(completedRows.map((row) => ({
      Tanggal: row.overtime_date,
      NIK: row.employees?.nik || "",
      Nama: row.employees?.full_name || "",
      Jabatan: String(row.employees?.position || "").replace(/_/g, " "),
      Unit: row.employees?.units?.name || row.units?.name || "Lintas unit",
      "Jenis Tugas": labelFor(TASK_TYPES, row.task_type),
      "Sumber Penugasan": row.request_source === "manager" ? "Penugasan pimpinan" : "Pengajuan pegawai",
      "Jam Rencana": `${shortTime(row.planned_start_time)}-${shortTime(row.planned_end_time)}`,
      "Istirahat (menit)": row.break_minutes,
      "Realisasi (menit)": row.actual_minutes,
      Kompensasi: labelFor(COMPENSATIONS, row.compensation_type),
      "Verifikasi Lokasi": row.verification_status,
    })), `Rekap_Lembur_Pegawai_${new Date().toLocaleDateString("en-CA")}`);
    toast.success(`${completedRows.length} rekaman lembur selesai diekspor.`);
  };

  return <div className="space-y-6">
    <PageHeader title="Lembur Pegawai" description="Persetujuan dan realisasi kerja tambahan untuk guru, pengajar part-time, staf, dan petugas shift." action={<div className="flex flex-wrap gap-2"><button onClick={exportRecap} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Ekspor Rekap</button><Link to="/attendance/events" className="rounded-md border bg-card px-3 py-2 text-sm font-semibold">Rapat & Kegiatan</Link><Link to="/attendance/employees" className="rounded-md border bg-card px-3 py-2 text-sm font-semibold">Presensi Harian</Link></div>} />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Menunggu Persetujuan", value: summary.pending, icon: Clock3, tone: "bg-amber-50 text-amber-700" }, { label: "Lembur Disetujui", value: summary.approved, icon: CheckCircle2, tone: "bg-blue-50 text-blue-700" }, { label: "Sudah Selesai", value: summary.completed, icon: Users, tone: "bg-emerald-50 text-emerald-700" }, { label: "Realisasi Jam", value: formatMinutes(summary.minutes), icon: TimerReset, tone: "bg-purple-50 text-purple-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</section>
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={assignOvertime} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm"><div className="border-b pb-4"><h2 className="font-bold">Tugaskan lembur</h2><p className="mt-1 text-xs text-muted-foreground">Untuk kerja tambahan yang sudah diperintahkan pimpinan. Pengajuan pegawai ditinjau pada tabel monitoring.</p></div><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Unit<select value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value, site_id: "" })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal"><option value="">Lintas unit / unit pegawai</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Tanggal<input required type="date" value={form.overtime_date} onChange={(event) => setForm({ ...form, overtime_date: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal" /></label>
        <label className="text-sm font-semibold">Mulai<input required type="time" value={form.planned_start_time} onChange={(event) => setForm({ ...form, planned_start_time: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal" /></label>
        <label className="text-sm font-semibold">Selesai<input required type="time" value={form.planned_end_time} onChange={(event) => setForm({ ...form, planned_end_time: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal" /></label>
        <label className="text-sm font-semibold">Batas akhir mulai lembur<input required type="time" value={form.check_in_close} onChange={(event) => setForm({ ...form, check_in_close: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal" /><span className="mt-1 block text-xs font-normal text-muted-foreground">Mulai lebih awal pada tanggal yang sama tetap diterima.</span></label>
        <label className="text-sm font-semibold">Istirahat (menit)<input type="number" min="0" max="240" value={form.break_minutes} onChange={(event) => setForm({ ...form, break_minutes: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal" /></label>
        <label className="text-sm font-semibold">Jenis tugas<select value={form.task_type} onChange={(event) => setForm({ ...form, task_type: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal">{TASK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold">Kompensasi<select value={form.compensation_type} onChange={(event) => setForm({ ...form, compensation_type: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal">{COMPENSATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Lokasi<select value={form.site_id} onChange={(event) => setForm({ ...form, site_id: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal"><option value="">Tanpa lokasi khusus</option>{eligibleSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label className="flex gap-3 rounded-md border p-3 text-sm sm:col-span-2"><input type="checkbox" checked={form.require_geofence} onChange={(event) => setForm({ ...form, require_geofence: event.target.checked })} className="mt-1" /><span><strong>Wajib GPS saat mulai lembur</strong><span className="block text-xs text-muted-foreground">Aktifkan untuk pekerjaan di lokasi sekolah.</span></span></label>
        <label className="text-sm font-semibold sm:col-span-2">Alasan dan hasil yang diharapkan<textarea required minLength={10} rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Jelaskan tugas lembur dan keluaran yang harus diselesaikan" className="mt-1.5 w-full rounded-md border p-3 font-normal" /></label>
      </div><div className="space-y-3 border-t pt-5"><div className="flex items-end justify-between gap-3"><div><h3 className="font-bold">Pegawai</h3><p className="text-xs text-muted-foreground">Semua peran, termasuk part-time dan pegawai shift.</p></div><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pegawai" className="h-10 w-60 rounded-md border pl-9 pr-3 text-sm" /></label></div><div className="flex gap-2"><button type="button" onClick={() => setSelectedEmployees(new Set([...selectedEmployees, ...visibleEmployees.map((employee) => employee.id)]))} className="rounded-md border px-3 py-1.5 text-xs font-bold">Pilih semua</button><button type="button" onClick={() => setSelectedEmployees(new Set())} className="rounded-md border px-3 py-1.5 text-xs font-bold">Kosongkan</button></div><div className="max-h-60 overflow-y-auto rounded-md border divide-y">{visibleEmployees.map((employee) => <label key={employee.id} className="flex cursor-pointer gap-3 px-3 py-2.5 hover:bg-muted/40"><input type="checkbox" checked={selectedEmployees.has(employee.id)} onChange={() => toggleEmployee(employee.id)} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{employee.full_name}</span><span className="block text-xs text-muted-foreground">{employee.units?.name || "Lintas unit"} | {String(employee.position).replace(/_/g, " ")}{employee.employment_type === "part_time" ? " | Part-time" : ""}</span></span></label>)}</div></div><button disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Tugaskan Lembur ({selectedEmployees.size})</button></form>
      <aside className="space-y-3"><div><h2 className="font-bold">Prinsip perhitungan</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Lembur dihitung dari mulai sampai selesai aktual setelah dikurangi istirahat. Jadwal mengajar part-time dan shift reguler tidak otomatis menjadi lembur.</p></div><div className="rounded-lg border bg-card p-4 text-sm space-y-3"><p><strong>Dibayar:</strong> diteruskan ke proses honor/payroll.</p><p><strong>Pengganti waktu:</strong> ditukar dengan waktu istirahat sesuai kebijakan.</p><p><strong>Termasuk kontrak:</strong> tetap dicatat, tanpa komponen pembayaran terpisah.</p><p><strong>Tanpa kompensasi:</strong> hanya untuk kegiatan yang secara kebijakan tidak menghasilkan hak lembur.</p></div></aside>
    </section>
    <section className="overflow-hidden rounded-lg border bg-card"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Monitoring lembur</h2><p className="text-xs text-muted-foreground">Pengajuan pegawai dan penugasan pimpinan dalam satu daftar.</p></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border px-3 text-sm font-semibold"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="completed">Selesai</option><option value="rejected">Ditolak</option><option value="cancelled">Dibatalkan</option></select></div>{isLoading ? <div className="flex h-56 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Tanggal / jam</th><th className="px-4 py-3">Tugas</th><th className="px-4 py-3">Kompensasi</th><th className="px-4 py-3">Realisasi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tindakan</th></tr></thead><tbody className="divide-y">{filteredRows.map((row) => <tr key={row.id}><td className="px-4 py-3"><p className="font-semibold">{row.employees?.full_name}</p><p className="text-xs text-muted-foreground">{row.employees?.units?.name || "Lintas unit"} | {String(row.employees?.position || "-").replace(/_/g, " ")}{row.employees?.employment_type === "part_time" ? " | Part-time" : ""}</p></td><td className="px-4 py-3"><p>{formatDate(row.overtime_date)}</p><p className="text-xs text-muted-foreground">{shortTime(row.planned_start_time)}-{shortTime(row.planned_end_time)}</p></td><td className="max-w-64 px-4 py-3"><p className="font-semibold">{labelFor(TASK_TYPES, row.task_type)}</p><p className="line-clamp-2 text-xs text-muted-foreground">{row.reason}</p></td><td className="px-4 py-3">{labelFor(COMPENSATIONS, row.compensation_type)}</td><td className="px-4 py-3">{row.status === "completed" ? formatMinutes(row.actual_minutes) : row.check_in_at ? "Sedang berjalan" : "-"}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-bold ${row.status === "completed" ? "bg-emerald-50 text-emerald-700" : row.status === "approved" ? "bg-blue-50 text-blue-700" : row.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{row.status}</span></td><td className="px-4 py-3">{row.status === "pending" ? <div className="space-y-2"><input value={reviewNotes[row.id] || ""} onChange={(event) => setReviewNotes({ ...reviewNotes, [row.id]: event.target.value })} placeholder="Catatan peninjau" className="h-8 w-44 rounded-md border px-2 text-xs" /><div className="flex gap-1"><button disabled={isSaving} onClick={() => void review(row, "rejected")} title="Tolak" className="rounded-md border p-2 text-red-600"><XCircle className="h-4 w-4" /></button><button disabled={isSaving} onClick={() => void review(row, "approved")} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Setujui</button></div></div> : row.require_geofence ? <span className="inline-flex items-center gap-1 text-xs"><MapPin className="h-3.5 w-3.5" />{row.verification_status === "verified" ? "GPS valid" : "Menunggu GPS"}</span> : "-"}</td></tr>)}{filteredRows.length === 0 ? <tr><td colSpan={7} className="h-40 text-center text-muted-foreground">Belum ada data lembur sesuai filter.</td></tr> : null}</tbody></table></div>}</section>
  </div>;
};
