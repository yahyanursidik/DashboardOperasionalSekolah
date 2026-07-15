/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardPlus, Clock3, FileWarning, Loader2, MapPin, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { operationalReportCategories, suggestedReportCategory } from "./staff-utils";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

const statuses: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Terkirim", tone: "bg-blue-100 text-blue-700" }, in_review: { label: "Ditinjau", tone: "bg-amber-100 text-amber-800" },
  assigned: { label: "Ditangani", tone: "bg-purple-100 text-purple-700" }, resolved: { label: "Selesai ditangani", tone: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Ditutup", tone: "bg-gray-100 text-gray-700" }, rejected: { label: "Ditolak", tone: "bg-red-100 text-red-700" },
};
const priorities: Record<string, string> = { low: "Rendah", medium: "Normal", high: "Tinggi", urgent: "Darurat" };
const openStatuses = new Set(["submitted", "in_review", "assigned"]);

function localDateTimeValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export const StaffOperationalReports: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [reports, setReports] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ unit_id: employee.unit_id || "", category: suggestedReportCategory(employee.position), priority: "medium", title: "", description: "", location: "", occurred_at: localDateTimeValue() });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    let scheduleQuery = supabaseClient
      .from("employee_schedules")
      .select("unit_id,units(name)")
      .eq("employee_id", employee.id)
      .not("unit_id", "is", null);
    if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
    if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);
    const [{ data: reportRows, error }, { data: scheduleRows }, { data: unitRows }] = await Promise.all([
      supabaseClient.from("staff_operational_reports").select("id,report_number,employee_id,assigned_to,unit_id,category,priority,title,description,location,occurred_at,status,resolution_note,resolved_at,created_at,units(name),reporter:employees!staff_operational_reports_employee_id_fkey(full_name),assigned:employees!staff_operational_reports_assigned_to_fkey(full_name)").or(`employee_id.eq.${employee.id},assigned_to.eq.${employee.id}`).order("created_at", { ascending: false }).limit(100),
      scheduleQuery,
      employee.unit_id ? supabaseClient.from("units").select("id,name").eq("id", employee.unit_id) : Promise.resolve({ data: [] as any[] }),
    ]);
    if (error) toast.error("Laporan operasional belum dapat dimuat", { description: error.message });
    const unitMap = new Map<string, any>();
    (unitRows || []).forEach((unit: any) => unitMap.set(unit.id, unit));
    (scheduleRows || []).forEach((row: any) => row.unit_id && unitMap.set(row.unit_id, { id: row.unit_id, name: row.units?.name || "Unit penugasan" }));
    setUnits(Array.from(unitMap.values()));
    setReports(reportRows || []);
    setIsLoading(false);
  }, [activeSemesterId, activeYearId, employee.id, employee.unit_id]);
  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = useMemo(() => reports.filter((report) => filter === "all" || (filter === "open" ? openStatuses.has(report.status) : !openStatuses.has(report.status))), [filter, reports]);
  const urgentOpen = reports.filter((report) => openStatuses.has(report.status) && report.priority === "urgent").length;

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.description.trim().length < 10) return toast.error("Uraian laporan minimal 10 karakter.");
    setIsSaving(true);
    const { error } = await supabaseClient.from("staff_operational_reports").insert({ employee_id: employee.id, unit_id: form.unit_id || null, category: form.category, priority: form.priority, title: form.title.trim(), description: form.description.trim(), location: form.location.trim() || null, occurred_at: new Date(form.occurred_at).toISOString() });
    setIsSaving(false);
    if (error) return toast.error("Laporan gagal dikirim", { description: error.message });
    toast.success("Laporan operasional berhasil dikirim.");
    setForm({ unit_id: employee.unit_id || "", category: suggestedReportCategory(employee.position), priority: "medium", title: "", description: "", location: "", occurred_at: localDateTimeValue() });
    setIsFormOpen(false);
    await loadData();
  };

  const resolveAssignedReport = async (report: any) => {
    setIsSaving(true);
    const { error } = await supabaseClient.from("staff_operational_reports").update({ status: "resolved", resolution_note: "Pekerjaan diselesaikan oleh PIC melalui Portal Staf.", resolved_at: new Date().toISOString() }).eq("id", report.id);
    setIsSaving(false);
    if (error) return toast.error("Laporan belum dapat diselesaikan", { description: error.message });
    toast.success("Pekerjaan ditandai selesai dan tercatat pada admin.");
    await loadData();
  };

  return <div className="space-y-5 p-4 md:p-0">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><FileWarning className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Laporan Operasional</h1></div><p className="mt-1 max-w-2xl text-sm text-gray-500">Laporkan kejadian, kerusakan, kebutuhan, atau serah terima agar dapat ditindaklanjuti dan dilacak.</p></div><button onClick={() => setIsFormOpen(true)} className="flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Buat Laporan</button></header>
    <section className="grid grid-cols-3 gap-3">{[{ label: "Belum selesai", value: reports.filter((item) => openStatuses.has(item.status)).length, icon: Clock3, tone: "bg-blue-50 text-blue-700" }, { label: "Darurat", value: urgentOpen, icon: AlertTriangle, tone: "bg-red-50 text-red-700" }, { label: "Selesai", value: reports.filter((item) => ["resolved", "closed"].includes(item.status)).length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }].map((item) => <div key={item.label} className="rounded-md border bg-white p-3 md:p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-xl font-bold text-gray-950">{item.value}</p><p className="text-xs font-medium text-gray-500">{item.label}</p></div>)}</section>
    <div className="flex gap-1 rounded-md border bg-white p-1">{[{ value: "open", label: "Aktif" }, { value: "done", label: "Selesai" }, { value: "all", label: "Semua" }].map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`flex-1 rounded px-3 py-2 text-xs font-bold ${filter === item.value ? "bg-gray-900 text-white" : "text-gray-600"}`}>{item.label}</button>)}</div>
    {reports.some((report) => report.assigned_to === employee.id && ["in_review", "assigned"].includes(report.status)) && <section className="rounded-md border border-purple-200 bg-purple-50 p-4"><h2 className="font-bold text-purple-950">Tindak lanjut yang ditugaskan kepada Anda</h2><div className="mt-3 space-y-2">{reports.filter((report) => report.assigned_to === employee.id && ["in_review", "assigned"].includes(report.status)).map((report) => <div key={`assigned-${report.id}`} className="flex flex-col gap-3 rounded-md border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-gray-950">{report.title}</p><p className="text-xs text-gray-500">Pelapor: {report.reporter?.full_name || "Staf"} - {report.location || report.units?.name || "Lokasi belum diisi"}</p></div><button onClick={() => void resolveAssignedReport(report)} disabled={isSaving} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Tandai Selesai</button></div>)}</div></section>}
    {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : filtered.length === 0 ? <div className="rounded-md border border-dashed bg-white p-10 text-center"><ClipboardPlus className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-bold text-gray-700">Belum ada laporan pada daftar ini</p><p className="mt-1 text-sm text-gray-500">Gunakan laporan hanya untuk kejadian atau kebutuhan yang perlu dilacak.</p></div> : <div className="space-y-3">{filtered.map((report) => { const meta = statuses[report.status] || statuses.submitted; return <article key={report.id} className={`rounded-md border bg-white p-4 ${report.priority === "urgent" && openStatuses.has(report.status) ? "border-red-300" : ""}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${meta.tone}`}>{meta.label}</span><span className={`text-[10px] font-bold uppercase ${report.priority === "urgent" ? "text-red-700" : "text-gray-500"}`}>{priorities[report.priority]}</span><span className="text-[10px] font-semibold text-gray-400">{report.report_number}</span></div><h2 className="mt-2 font-bold text-gray-950">{report.title}</h2><p className="mt-1 text-sm leading-6 text-gray-600">{report.description}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500"><span>{operationalReportCategories.find((item) => item.value === report.category)?.label}</span><span>{report.units?.name || "Lintas unit"}</span>{report.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{report.location}</span>}<span>{new Date(report.occurred_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span></div>{report.resolution_note && <div className="mt-3 rounded-md bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">Tindak lanjut</p><p className="mt-1 text-sm text-emerald-950">{report.resolution_note}</p></div>}</div>{report.assigned?.full_name && <p className="shrink-0 text-xs text-gray-500">PIC: <span className="font-semibold text-gray-700">{report.assigned.full_name}</span></p>}</div></article>; })}</div>}
    {isFormOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"><form onSubmit={submitReport} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-bold text-gray-950">Buat Laporan Operasional</h2><p className="text-xs text-gray-500">Tuliskan fakta, lokasi, dan waktu kejadian secara jelas.</p></div><button type="button" onClick={() => setIsFormOpen(false)} title="Tutup" className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-gray-700">Kategori<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal">{operationalReportCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs font-bold text-gray-700">Prioritas<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal"><option value="low">Rendah</option><option value="medium">Normal</option><option value="high">Tinggi</option><option value="urgent">Darurat</option></select></label><label className="text-xs font-bold text-gray-700">Unit<select value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal"><option value="">Lintas unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label className="text-xs font-bold text-gray-700">Waktu kejadian<input type="datetime-local" required value={form.occurred_at} onChange={(event) => setForm({ ...form, occurred_at: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-gray-700 sm:col-span-2">Judul<input required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ringkasan kejadian atau kebutuhan" className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-gray-700 sm:col-span-2">Lokasi<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Contoh: Gerbang utama, toilet lantai 2" className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-gray-700 sm:col-span-2">Uraian<textarea required rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Jelaskan kondisi, dampak, dan tindakan awal yang sudah dilakukan." className="mt-1 w-full rounded-md border p-3 text-sm font-normal" /></label></div><div className="mt-5 flex justify-end"><button disabled={isSaving} className="flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Kirim Laporan</button></div></form></div>}
  </div>;
};
