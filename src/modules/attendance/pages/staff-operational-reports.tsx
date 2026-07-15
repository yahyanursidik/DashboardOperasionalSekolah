/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileWarning, Loader2, MapPin, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { operationalReportCategories } from "../../staff-portal/staff-utils";

const statusLabels: Record<string, string> = { submitted: "Terkirim", in_review: "Ditinjau", assigned: "Ditangani", resolved: "Selesai", closed: "Ditutup", rejected: "Ditolak" };

export const StaffOperationalReportsAdmin: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState<any>(null);
  const [status, setStatus] = useState("in_review");
  const [assignedTo, setAssignedTo] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadRows = async () => {
    setIsLoading(true);
    let query = supabaseClient.from("staff_operational_reports").select("*,employees!staff_operational_reports_employee_id_fkey(full_name,nik,position),units(name),assigned:employees!staff_operational_reports_assigned_to_fkey(full_name)").order("created_at", { ascending: false }).limit(200);
    if (filter === "open") query = query.in("status", ["submitted", "in_review", "assigned"]);
    if (filter === "done") query = query.in("status", ["resolved", "closed", "rejected"]);
    const [{ data, error }, { data: employeeRows }] = await Promise.all([query, supabaseClient.from("employees").select("id,full_name,position,unit_id").eq("status", "active").order("full_name")]);
    if (error) toast.error("Laporan operasional belum dapat dimuat", { description: error.message });
    setRows(data || []);
    setEmployees(employeeRows || []);
    setIsLoading(false);
  };
  useEffect(() => { void loadRows(); }, [filter]);

  const choose = (row: any) => { setSelected(row); setStatus(row.status === "submitted" ? "in_review" : row.status); setAssignedTo(row.assigned_to || ""); setResolutionNote(row.resolution_note || ""); };
  const stats = useMemo(() => ({ urgent: rows.filter((row) => row.priority === "urgent" && !["resolved", "closed", "rejected"].includes(row.status)).length, submitted: rows.filter((row) => row.status === "submitted").length, active: rows.filter((row) => ["in_review", "assigned"].includes(row.status)).length }), [rows]);

  const save = async () => {
    if (!selected) return;
    if (["resolved", "closed", "rejected"].includes(status) && resolutionNote.trim().length < 5) return toast.error("Catatan penyelesaian/keputusan minimal 5 karakter.");
    const { data: { user } } = await supabaseClient.auth.getUser();
    setIsSaving(true);
    const isResolved = ["resolved", "closed"].includes(status);
    const { error } = await supabaseClient.from("staff_operational_reports").update({ status, assigned_to: assignedTo || null, resolution_note: resolutionNote.trim() || null, resolved_at: isResolved ? new Date().toISOString() : null, reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null }).eq("id", selected.id);
    setIsSaving(false);
    if (error) return toast.error("Tindak lanjut gagal disimpan", { description: error.message });
    toast.success("Tindak lanjut laporan berhasil disimpan.");
    setSelected(null);
    await loadRows();
  };

  return <div className="space-y-6">
    <PageHeader title="Laporan Operasional Staf" description="Tinjau insiden, kerusakan, kebutuhan, dan kendala layanan dari staf seluruh unit." />
    <section className="grid gap-3 sm:grid-cols-3">{[{ label: "Baru", value: stats.submitted, icon: FileWarning, tone: "bg-blue-50 text-blue-700" }, { label: "Darurat", value: stats.urgent, icon: Clock3, tone: "bg-red-50 text-red-700" }, { label: "Ditangani", value: stats.active, icon: UserRoundCheck, tone: "bg-amber-50 text-amber-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</section>
    <div className="flex gap-1 rounded-lg border bg-card p-1">{[{ value: "open", label: "Perlu Ditangani" }, { value: "done", label: "Selesai" }, { value: "all", label: "Semua" }].map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${filter === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{item.label}</button>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><section className="overflow-hidden rounded-lg border bg-card">{isLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" /><p className="font-semibold">Tidak ada laporan pada status ini.</p></div> : <div className="divide-y">{rows.map((row) => <button key={row.id} onClick={() => choose(row)} className={`w-full p-4 text-left hover:bg-muted/30 ${selected?.id === row.id ? "bg-primary/5" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{row.title}</p>{row.priority === "urgent" && <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">DARURAT</span>}</div><p className="mt-1 text-xs text-muted-foreground">{row.report_number} - {row.employees?.full_name} - {row.units?.name || "Lintas unit"}</p><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{row.description}</p></div><span className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-semibold">{statusLabels[row.status]}</span></div></button>)}</div>}</section>
      <aside className="self-start rounded-lg border bg-card p-5 xl:sticky xl:top-20">{!selected ? <div className="py-16 text-center"><FileWarning className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" /><p className="font-semibold">Pilih laporan</p><p className="mt-1 text-xs text-muted-foreground">Detail dan tindakan akan tampil di sini.</p></div> : <div><div className="border-b pb-4"><p className="text-xs font-semibold text-muted-foreground">{selected.report_number}</p><h2 className="mt-1 font-bold">{selected.title}</h2><p className="mt-1 text-xs text-muted-foreground">{selected.employees?.full_name} - {selected.units?.name || "Lintas unit"}</p></div><dl className="space-y-3 py-4 text-sm"><div><dt className="text-xs font-semibold text-muted-foreground">Kategori</dt><dd>{operationalReportCategories.find((item) => item.value === selected.category)?.label || selected.category}</dd></div>{selected.location && <div><dt className="text-xs font-semibold text-muted-foreground">Lokasi</dt><dd className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selected.location}</dd></div>}<div><dt className="text-xs font-semibold text-muted-foreground">Uraian</dt><dd className="mt-1 rounded-md bg-muted/50 p-3 leading-6">{selected.description}</dd></div></dl><div className="space-y-3"><label className="block text-sm font-semibold">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal"><option value="in_review">Ditinjau</option><option value="assigned">Ditangani</option><option value="resolved">Selesai ditangani</option><option value="closed">Ditutup</option><option value="rejected">Ditolak</option></select></label><label className="block text-sm font-semibold">PIC<select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal"><option value="">Belum ditentukan</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></label><label className="block text-sm font-semibold">Catatan tindak lanjut<textarea rows={4} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} className="mt-1.5 w-full rounded-md border bg-background p-3 font-normal" /></label><button onClick={() => void save()} disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Simpan Tindak Lanjut</button></div></div>}</aside>
    </div>
  </div>;
};
