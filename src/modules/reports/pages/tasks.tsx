/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useList, useTable } from "@refinedev/core";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Download, FilterX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { exportToCsv } from "../../../lib/csv";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { fetchAllReportRows, localDateValue, recordReportExport, type ReportQueryFilter } from "../report-utils";

const today = localDateValue();
const statusLabels: Record<string, string> = { belum_mulai: "Belum Mulai", diproses: "Diproses", menunggu_pihak_lain: "Menunggu Pihak Lain", selesai: "Selesai", ditunda: "Ditunda" };
const priorityLabels: Record<string, string> = { low: "Rendah", medium: "Normal", high: "Tinggi", urgent: "Mendesak" };
const openStatuses = ["belum_mulai", "diproses", "menunggu_pihak_lain", "ditunda"];

export const TaskReport: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [priority, setPriority] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const baseFilters: any[] = activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [];
  const filters: any[] = [...baseFilters];
  if (status === "open") filters.push({ field: "status", operator: "in", value: openStatuses }); else if (status) filters.push({ field: "status", operator: "eq", value: status });
  if (priority) filters.push({ field: "priority", operator: "eq", value: priority });
  const select = "id,title,description,status,priority,due_date,completed_at,unit_id,assigned_to,units(name),profiles!admin_tasks_assigned_to_fkey(full_name)";
  const { tableQueryResult, current, setCurrent, pageCount } = useTable({ resource: "admin_tasks", filters: { permanent: filters }, pagination: { current: 1, pageSize: 20 }, sorters: { initial: [{ field: "due_date", order: "asc" }] }, meta: { select } });
  const { data: summaryData } = useList({ resource: "admin_tasks", filters: baseFilters, pagination: { pageSize: 5000 }, meta: { select: "id,status,priority,due_date" } });
  const rows = tableQueryResult.data?.data || [];
  const stats = useMemo(() => { const data = summaryData?.data || []; const open = data.filter((task: any) => openStatuses.includes(task.status)); return { open: open.length, overdue: open.filter((task: any) => task.due_date && task.due_date < today).length, urgent: open.filter((task: any) => task.priority === "urgent").length, done: data.filter((task: any) => task.status === "selesai").length }; }, [summaryData?.data]);

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllReportRows<any>("admin_tasks", select, filters as ReportQueryFilter[], "due_date");
      exportToCsv(data.map((task) => ({ Tugas: task.title, Unit: task.units?.name || "Lintas unit", Penanggung_Jawab: task.profiles?.full_name || "Belum ditugaskan", Prioritas: priorityLabels[task.priority] || task.priority, Status: statusLabels[task.status] || task.status, Tenggat: task.due_date || "", Terlambat: task.due_date && task.due_date < today && task.status !== "selesai" ? "Ya" : "Tidak", Selesai_Pada: task.completed_at || "" })), "Laporan_Tugas_Manajemen");
      await recordReportExport({ reportKey: "management_tasks", reportLabel: "Laporan Tugas Manajemen", format: "csv", rowCount: data.length, unitId: activeUnitId, academicYearId: activeYearId, semesterId: activeSemesterId, filters: { status, priority } });
      toast.success(`${data.length} tugas berhasil diekspor.`);
    } catch (error) { toast.error("Ekspor laporan tugas gagal", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
    finally { setIsExporting(false); }
  };

  return <div className="space-y-6"><PageHeader title="Laporan Tugas Manajemen" description="Pantau beban tugas, PIC, prioritas, ketepatan waktu, dan penyelesaian pekerjaan lintas unit." action={<button onClick={() => void exportReport()} disabled={isExporting} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Ekspor Semua Hasil</button>} /><ReportsSectionNav />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Tugas Terbuka", value: stats.open, icon: ClipboardList, tone: "bg-blue-50 text-blue-700" }, { label: "Melewati Tenggat", value: stats.overdue, icon: AlertTriangle, tone: "bg-red-50 text-red-700" }, { label: "Prioritas Mendesak", value: stats.urgent, icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" }, { label: "Selesai", value: stats.done, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</section>
    <section className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[220px_220px_auto] sm:items-end"><label className="text-xs font-bold text-muted-foreground">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Semua status</option><option value="open">Semua tugas terbuka</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold text-muted-foreground">Prioritas<select value={priority} onChange={(event) => { setPriority(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Semua prioritas</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={() => { setStatus(""); setPriority(""); setCurrent(1); }} className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold text-muted-foreground"><FilterX className="h-4 w-4" />Reset</button></section>
    <section className="overflow-hidden rounded-lg border bg-card">{tableQueryResult.isLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><ClipboardList className="h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-bold">Tugas tidak ditemukan</p><p className="mt-1 text-sm text-muted-foreground">Tidak ada tugas yang sesuai dengan filter.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Tugas</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Penanggung jawab</th><th className="px-4 py-3">Prioritas</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tenggat</th></tr></thead><tbody className="divide-y">{rows.map((task: any) => { const overdue = task.due_date && task.due_date < today && task.status !== "selesai"; return <tr key={task.id} className={overdue ? "bg-red-50/40" : "hover:bg-muted/20"}><td className="px-4 py-3"><p className="max-w-72 truncate font-semibold">{task.title}</p><p className="max-w-72 truncate text-xs text-muted-foreground">{task.description || "Tanpa deskripsi"}</p></td><td className="px-4 py-3">{task.units?.name || "Lintas unit"}</td><td className="px-4 py-3">{task.profiles?.full_name || "Belum ditugaskan"}</td><td className="px-4 py-3">{priorityLabels[task.priority] || task.priority}</td><td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 text-xs font-bold">{statusLabels[task.status] || task.status}</span></td><td className={`px-4 py-3 ${overdue ? "font-bold text-red-700" : ""}`}>{task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString("id-ID") : "Tanpa tenggat"}{overdue && <p className="text-[10px] uppercase">Terlambat</p>}</td></tr>; })}</tbody></table></div>}{pageCount > 1 && <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{tableQueryResult.data?.total || 0} tugas - halaman {current}/{pageCount}</span><div className="flex gap-2"><button title="Sebelumnya" disabled={current === 1} onClick={() => setCurrent(current - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button title="Berikutnya" disabled={current === pageCount} onClick={() => setCurrent(current + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}</section>
  </div>;
};
