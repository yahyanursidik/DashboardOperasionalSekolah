/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useList, useTable } from "@refinedev/core";
import { CalendarCheck, ChevronLeft, ChevronRight, Download, FilterX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { exportToCsv } from "../../../lib/csv";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { fetchAllReportRows, formatPercent, localDateValue, recordReportExport, type ReportQueryFilter } from "../report-utils";

const endDefault = localDateValue();
const startDefault = `${endDefault.slice(0, 7)}-01`;
const statusLabels: Record<string, string> = { hadir: "Hadir", terlambat: "Terlambat", sakit: "Sakit", izin: "Izin", alpa: "Alpa", pulang_awal: "Pulang Awal" };

export const AttendanceReport: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState(startDefault);
  const [dateTo, setDateTo] = useState(endDefault);
  const [isExporting, setIsExporting] = useState(false);
  const { data: classData } = useList({ resource: "classes", filters: [...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []), ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : [])], pagination: { mode: "off" }, sorters: [{ field: "grade_level", order: "asc" }] });
  const filters: any[] = [{ field: "attendance_date", operator: "gte", value: dateFrom }, { field: "attendance_date", operator: "lte", value: dateTo }];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (classId) filters.push({ field: "class_id", operator: "eq", value: classId });
  if (status) filters.push({ field: "status", operator: "eq", value: status });
  const meta = { select: "id,attendance_date,status,arrival_time,note,student_id,class_id,unit_id,students(full_name,nis),classes(name),units(name)" };
  const { tableQueryResult, current, setCurrent, pageCount } = useTable({ resource: "attendance_records", filters: { permanent: filters }, pagination: { current: 1, pageSize: 25 }, sorters: { initial: [{ field: "attendance_date", order: "desc" }] }, meta });
  const { data: summaryData } = useList({ resource: "attendance_records", filters, pagination: { pageSize: 5000 }, meta: { select: "id,status" } });
  const rows = tableQueryResult.data?.data || [];
  const summary = useMemo(() => (summaryData?.data || []).reduce((acc: Record<string, number>, row: any) => { acc.total = (acc.total || 0) + 1; acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {}), [summaryData?.data]);
  const present = (summary.hadir || 0) + (summary.terlambat || 0) + (summary.pulang_awal || 0);
  const attendanceRate = summary.total ? (present / summary.total) * 100 : 0;

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllReportRows<any>("attendance_records", meta.select, filters as ReportQueryFilter[], "attendance_date");
      exportToCsv(data.map((row) => ({ Tanggal: row.attendance_date, NIS: row.students?.nis || "", "Nama Siswa": row.students?.full_name || "", Kelas: row.classes?.name || "", Unit: row.units?.name || "", Status: statusLabels[row.status] || row.status, "Jam Datang": row.arrival_time || "", Catatan: row.note || "" })), `Kehadiran_Siswa_${dateFrom}_${dateTo}`);
      await recordReportExport({ reportKey: "student_attendance", reportLabel: "Laporan Kehadiran Siswa", format: "csv", rowCount: data.length, unitId: activeUnitId, academicYearId: activeYearId, semesterId: activeSemesterId, dateFrom, dateTo, filters: { classId, status } });
      toast.success(`${data.length} rekaman kehadiran berhasil diekspor.`);
    } catch (error) { toast.error("Ekspor kehadiran gagal", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
    finally { setIsExporting(false); }
  };

  return <div className="space-y-6"><PageHeader title="Laporan Kehadiran Siswa" description="Rekap kehadiran aktual untuk analisis disiplin, komunikasi wali kelas, dan intervensi siswa." action={<button onClick={() => void exportReport()} disabled={isExporting} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Ekspor Semua Hasil</button>} /><ReportsSectionNav />
    <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">{[{ label: "Tingkat Kehadiran", value: formatPercent(attendanceRate), tone: "text-emerald-700" }, { label: "Hadir", value: summary.hadir || 0, tone: "text-emerald-700" }, { label: "Terlambat", value: summary.terlambat || 0, tone: "text-amber-700" }, { label: "Sakit", value: summary.sakit || 0, tone: "text-yellow-700" }, { label: "Izin", value: summary.izin || 0, tone: "text-blue-700" }, { label: "Alpa", value: summary.alpa || 0, tone: "text-red-700" }, { label: "Pulang Awal", value: summary.pulang_awal || 0, tone: "text-violet-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-3"><p className={`text-xl font-bold ${item.tone}`}>{item.value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</section>
    <section className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-[200px_200px_220px_180px_auto] xl:items-end"><label className="text-xs font-bold text-muted-foreground">Mulai<input type="date" value={dateFrom} max={dateTo} onChange={(event) => { setDateFrom(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><label className="text-xs font-bold text-muted-foreground">Sampai<input type="date" value={dateTo} min={dateFrom} onChange={(event) => { setDateTo(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><label className="text-xs font-bold text-muted-foreground">Kelas<select value={classId} onChange={(event) => { setClassId(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Semua kelas</option>{classData?.data?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-bold text-muted-foreground">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Semua status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={() => { setDateFrom(startDefault); setDateTo(endDefault); setClassId(""); setStatus(""); setCurrent(1); }} className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold text-muted-foreground"><FilterX className="h-4 w-4" />Reset</button></section>
    <section className="overflow-hidden rounded-lg border bg-card">{tableQueryResult.isLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><CalendarCheck className="h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-bold">Tidak ada rekaman kehadiran</p><p className="mt-1 text-sm text-muted-foreground">Ubah rentang tanggal atau filter kelas.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">Unit / kelas</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Jam datang</th><th className="px-4 py-3">Catatan</th></tr></thead><tbody className="divide-y">{rows.map((row: any) => <tr key={row.id} className="hover:bg-muted/20"><td className="px-4 py-3">{new Date(`${row.attendance_date}T00:00:00`).toLocaleDateString("id-ID")}</td><td className="px-4 py-3"><p className="font-semibold">{row.students?.full_name || "-"}</p><p className="text-xs text-muted-foreground">{row.students?.nis || ""}</p></td><td className="px-4 py-3"><p>{row.units?.name || "-"}</p><p className="text-xs text-muted-foreground">{row.classes?.name || "-"}</p></td><td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 text-xs font-bold">{statusLabels[row.status] || row.status}</span></td><td className="px-4 py-3">{row.arrival_time || "-"}</td><td className="max-w-72 truncate px-4 py-3 text-muted-foreground">{row.note || "-"}</td></tr>)}</tbody></table></div>}{pageCount > 1 && <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{tableQueryResult.data?.total || 0} rekaman - halaman {current}/{pageCount}</span><div className="flex gap-2"><button title="Sebelumnya" disabled={current === 1} onClick={() => setCurrent(current - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button title="Berikutnya" disabled={current === pageCount} onClick={() => setCurrent(current + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}</section>
  </div>;
};
