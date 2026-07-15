/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { AlertTriangle, CalendarCheck, ChevronLeft, ChevronRight, Download, Loader2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { exportToCsv } from "../../../lib/csv";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { fetchAllReportRows, formatPercent, monthRange, recordReportExport, type ReportQueryFilter } from "../report-utils";

const currentMonth = new Date().toISOString().slice(0, 7);
const verifiedStatuses = new Set(["verified", "approved_exception", "manual"]);

export const ReportEmployeeAttendance: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [month, setMonth] = useState(currentMonth);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const { start, end } = monthRange(month);
  const filters: any[] = [{ field: "date", operator: "gte", value: start }, { field: "date", operator: "lte", value: end }];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  const select = "id,employee_id,unit_id,date,status,time_in,time_out,is_late,late_minutes,is_early_departure,early_departure_minutes,verification_status,location_status,employees(full_name,nik,position,unit_id,units(name))";
  const { data, isLoading } = useList({ resource: "employee_attendance", filters, pagination: { pageSize: 5000 }, sorters: [{ field: "date", order: "asc" }], meta: { select } });
  const reportRows = useMemo(() => {
    const grouped = new Map<string, any>();
    (data?.data || []).forEach((record: any) => {
      const employee = record.employees;
      const item = grouped.get(record.employee_id) || { employee_id: record.employee_id, employee, total: 0, present: 0, late: 0, sick: 0, leave: 0, absent: 0, verified: 0, early: 0, lateMinutes: 0 };
      item.total += 1;
      if (["present", "late"].includes(record.status)) item.present += 1;
      if (record.status === "late" || record.is_late) item.late += 1;
      if (record.status === "sick") item.sick += 1;
      if (record.status === "leave") item.leave += 1;
      if (record.status === "absent") item.absent += 1;
      if (verifiedStatuses.has(record.verification_status)) item.verified += 1;
      if (record.is_early_departure) item.early += 1;
      item.lateMinutes += Number(record.late_minutes || 0);
      grouped.set(record.employee_id, item);
    });
    return Array.from(grouped.values()).sort((a, b) => String(a.employee?.full_name || "").localeCompare(String(b.employee?.full_name || ""), "id"));
  }, [data?.data]);
  const totalRecords = reportRows.reduce((sum, row) => sum + row.total, 0);
  const totalVerified = reportRows.reduce((sum, row) => sum + row.verified, 0);
  const totalLate = reportRows.reduce((sum, row) => sum + row.late, 0);
  const totalAbsent = reportRows.reduce((sum, row) => sum + row.absent, 0);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(reportRows.length / pageSize));
  const visibleRows = reportRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const records = await fetchAllReportRows<any>("employee_attendance", select, filters as ReportQueryFilter[], "date");
      const grouped = new Map<string, any>();
      records.forEach((record) => { const item = grouped.get(record.employee_id) || { employee: record.employees, input: 0, present: 0, late: 0, sick: 0, leave: 0, absent: 0, verified: 0, early: 0, lateMinutes: 0 }; item.input += 1; if (["present", "late"].includes(record.status)) item.present += 1; if (record.status === "late" || record.is_late) item.late += 1; if (record.status === "sick") item.sick += 1; if (record.status === "leave") item.leave += 1; if (record.status === "absent") item.absent += 1; if (verifiedStatuses.has(record.verification_status)) item.verified += 1; if (record.is_early_departure) item.early += 1; item.lateMinutes += Number(record.late_minutes || 0); grouped.set(record.employee_id, item); });
      const exportRows = Array.from(grouped.values());
      exportToCsv(exportRows.map((row) => ({ NIK: row.employee?.nik || "", Nama: row.employee?.full_name || "", Jabatan: String(row.employee?.position || "").replace(/_/g, " "), Unit: row.employee?.units?.name || "Lintas unit", "Hari Input": row.input, Hadir: row.present, Terlambat: row.late, "Total Menit Terlambat": row.lateMinutes, "Pulang Awal": row.early, Sakit: row.sick, Izin: row.leave, Alpa: row.absent, Terverifikasi: row.verified })), `Kehadiran_Pegawai_${month}`);
      await recordReportExport({ reportKey: "employee_attendance", reportLabel: "Laporan Kehadiran Pegawai", format: "csv", rowCount: exportRows.length, unitId: activeUnitId, academicYearId: activeYearId, semesterId: activeSemesterId, dateFrom: start, dateTo: end, filters: { month } });
      toast.success(`${exportRows.length} pegawai berhasil diekspor.`);
    } catch (error) { toast.error("Ekspor kehadiran pegawai gagal", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
    finally { setIsExporting(false); }
  };

  return <div className="space-y-6"><PageHeader title="Laporan Kehadiran Pegawai" description="Rekap disiplin waktu, validasi lokasi, keterlambatan, pulang awal, dan ketidakhadiran guru serta staf." action={<button onClick={() => void exportReport()} disabled={isExporting || reportRows.length === 0} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Ekspor Semua Hasil</button>} /><ReportsSectionNav />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Pegawai Tercatat", value: reportRows.length, icon: Users, tone: "bg-blue-50 text-blue-700" }, { label: "Rekaman Terverifikasi", value: formatPercent(totalRecords ? (totalVerified / totalRecords) * 100 : 0), icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700" }, { label: "Kejadian Terlambat", value: totalLate, icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" }, { label: "Alpa", value: totalAbsent, icon: CalendarCheck, tone: "bg-red-50 text-red-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</section>
    <section className="rounded-lg border bg-card p-3"><label className="block max-w-60 text-xs font-bold text-muted-foreground">Bulan rekap<input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setCurrentPage(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label></section>
    <section className="overflow-hidden rounded-lg border bg-card">{isLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : visibleRows.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><Users className="h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-bold">Belum ada rekaman pegawai</p><p className="mt-1 text-sm text-muted-foreground">Tidak ada data pada bulan dan unit terpilih.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Unit / jabatan</th><th className="px-4 py-3 text-center">Input</th><th className="px-4 py-3 text-center">Hadir</th><th className="px-4 py-3 text-center">Terlambat</th><th className="px-4 py-3 text-center">Menit</th><th className="px-4 py-3 text-center">Pulang Awal</th><th className="px-4 py-3 text-center">Sakit</th><th className="px-4 py-3 text-center">Izin</th><th className="px-4 py-3 text-center">Alpa</th><th className="px-4 py-3 text-center">Validasi</th></tr></thead><tbody className="divide-y">{visibleRows.map((row) => <tr key={row.employee_id} className="hover:bg-muted/20"><td className="px-4 py-3"><p className="font-semibold">{row.employee?.full_name || "-"}</p><p className="text-xs text-muted-foreground">{row.employee?.nik || ""}</p></td><td className="px-4 py-3"><p>{row.employee?.units?.name || "Lintas unit"}</p><p className="text-xs uppercase text-muted-foreground">{String(row.employee?.position || "-").replace(/_/g, " ")}</p></td><td className="px-4 py-3 text-center">{row.total}</td><td className="px-4 py-3 text-center font-bold text-emerald-700">{row.present}</td><td className="px-4 py-3 text-center font-bold text-amber-700">{row.late}</td><td className="px-4 py-3 text-center">{row.lateMinutes}</td><td className="px-4 py-3 text-center">{row.early}</td><td className="px-4 py-3 text-center">{row.sick}</td><td className="px-4 py-3 text-center">{row.leave}</td><td className="px-4 py-3 text-center font-bold text-red-700">{row.absent}</td><td className="px-4 py-3 text-center">{row.verified}/{row.total}</td></tr>)}</tbody></table></div>}{pageCount > 1 && <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{reportRows.length} pegawai - halaman {currentPage}/{pageCount}</span><div className="flex gap-2"><button title="Sebelumnya" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button title="Berikutnya" disabled={currentPage === pageCount} onClick={() => setCurrentPage(currentPage + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}</section>
  </div>;
};
