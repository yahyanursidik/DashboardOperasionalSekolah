/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BookOpenCheck, CalendarDays, CheckCircle2, CircleDollarSign, Download, FileCheck2, HeartPulse, Loader2, TrendingUp } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { exportToCsv } from "../../../lib/csv";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { formatPercent, localDateValue, recordReportExport } from "../report-utils";

const currentDate = new Date();
const defaultEnd = localDateValue(currentDate);
const defaultStart = `${defaultEnd.slice(0, 7)}-01`;
const presentStudentStatuses = new Set(["hadir", "terlambat", "pulang_awal"]);
const verifiedEmployeeStatuses = new Set(["verified", "approved_exception", "manual"]);
const completedReportStatuses = new Set(["approved", "published", "archived"]);

export const VisualAnalytics: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [dateFrom, setDateFrom] = useState(defaultStart);
  const [dateTo, setDateTo] = useState(defaultEnd);
  const studentFilters: any[] = [{ field: "status", operator: "eq", value: "active" }];
  const attendanceFilters: any[] = [{ field: "attendance_date", operator: "gte", value: dateFrom }, { field: "attendance_date", operator: "lte", value: dateTo }];
  const employeeAttendanceFilters: any[] = [{ field: "date", operator: "gte", value: dateFrom }, { field: "date", operator: "lte", value: dateTo }];
  const invoiceFilters: any[] = [];
  const quranFilters: any[] = [{ field: "date", operator: "gte", value: dateFrom }, { field: "date", operator: "lte", value: dateTo }];
  if (activeUnitId) { studentFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId }); attendanceFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId }); employeeAttendanceFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId }); invoiceFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId }); }
  if (activeYearId) { attendanceFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId }); invoiceFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId }); quranFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId }); }
  if (activeSemesterId) quranFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const { data: studentsResult, isLoading: loadingStudents } = useList({ resource: "students", filters: studentFilters, pagination: { pageSize: 3000 }, meta: { select: "id,unit_id,units(name)" } });
  const { data: attendanceResult, isLoading: loadingAttendance } = useList({ resource: "attendance_records", filters: attendanceFilters, pagination: { pageSize: 5000 }, sorters: [{ field: "attendance_date", order: "asc" }], meta: { select: "id,student_id,unit_id,attendance_date,status,units(name)" } });
  const { data: employeeAttendanceResult, isLoading: loadingEmployees } = useList({ resource: "employee_attendance", filters: employeeAttendanceFilters, pagination: { pageSize: 5000 }, meta: { select: "id,employee_id,unit_id,date,status,is_late,verification_status,units(name)" } });
  const { data: invoiceResult, isLoading: loadingFinance } = useList({ resource: "student_invoices", filters: invoiceFilters, pagination: { pageSize: 5000 }, meta: { select: "id,unit_id,amount,discount,paid_amount,status,units(name)" } });
  const { data: quranResult, isLoading: loadingQuran } = useList({ resource: "quran_records", filters: quranFilters, pagination: { pageSize: 5000 }, meta: { select: "id,student_id,date,record_type,students(unit_id,classes(unit_id),units(name))" } });
  const { data: reportResult, isLoading: loadingReports } = useList({ resource: "student_reports", pagination: { pageSize: 5000 }, meta: { select: "id,status,report_periods(unit_id,academic_year_id,semester_id)" } });

  const students = useMemo(() => studentsResult?.data || [], [studentsResult?.data]);
  const attendance = useMemo(() => attendanceResult?.data || [], [attendanceResult?.data]);
  const employeeAttendance = useMemo(() => employeeAttendanceResult?.data || [], [employeeAttendanceResult?.data]);
  const invoices = useMemo(() => invoiceResult?.data || [], [invoiceResult?.data]);
  const quranRecords = useMemo(() => (quranResult?.data || []).filter((record: any) => !activeUnitId || record.students?.unit_id === activeUnitId || record.students?.classes?.unit_id === activeUnitId), [activeUnitId, quranResult?.data]);
  const reports = useMemo(() => (reportResult?.data || []).filter((report: any) => {
    const period = report.report_periods;
    return (!activeUnitId || period?.unit_id === activeUnitId) && (!activeYearId || period?.academic_year_id === activeYearId) && (!activeSemesterId || period?.semester_id === activeSemesterId);
  }), [activeSemesterId, activeUnitId, activeYearId, reportResult?.data]);
  const isLoading = loadingStudents || loadingAttendance || loadingEmployees || loadingFinance || loadingQuran || loadingReports;

  const metrics = useMemo(() => {
    const present = attendance.filter((row: any) => presentStudentStatuses.has(row.status)).length;
    const studentAttendanceRate = attendance.length ? (present / attendance.length) * 100 : 0;
    const employeePresent = employeeAttendance.filter((row: any) => ["present", "late"].includes(row.status)).length;
    const employeeAttendanceRate = employeeAttendance.length ? (employeePresent / employeeAttendance.length) * 100 : 0;
    const verified = employeeAttendance.filter((row: any) => verifiedEmployeeStatuses.has(row.verification_status)).length;
    const verificationRate = employeeAttendance.length ? (verified / employeeAttendance.length) * 100 : 0;
    const billed = invoices.filter((invoice: any) => invoice.status !== "cancelled").reduce((sum: number, invoice: any) => sum + Number(invoice.amount || 0) - Number(invoice.discount || 0), 0);
    const paid = invoices.filter((invoice: any) => invoice.status !== "cancelled").reduce((sum: number, invoice: any) => sum + Number(invoice.paid_amount || 0), 0);
    const collectionRate = billed ? (paid / billed) * 100 : 0;
    const quranStudents = new Set(quranRecords.map((record: any) => record.student_id)).size;
    const quranCoverage = students.length ? (quranStudents / students.length) * 100 : 0;
    const completedReports = reports.filter((report: any) => completedReportStatuses.has(report.status)).length;
    const reportCompletion = reports.length ? (completedReports / reports.length) * 100 : 0;
    return { studentAttendanceRate, employeeAttendanceRate, verificationRate, billed, paid, collectionRate, quranStudents, quranCoverage, completedReports, reportCompletion };
  }, [attendance, employeeAttendance, invoices, quranRecords, reports, students.length]);

  const attendanceTrend = useMemo(() => {
    const grouped = new Map<string, { total: number; present: number }>();
    attendance.forEach((row: any) => { const item = grouped.get(row.attendance_date) || { total: 0, present: 0 }; item.total += 1; if (presentStudentStatuses.has(row.status)) item.present += 1; grouped.set(row.attendance_date, item); });
    return Array.from(grouped.entries()).map(([date, value]) => ({ date: new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), kehadiran: Number(((value.present / value.total) * 100).toFixed(1)) }));
  }, [attendance]);

  const attendanceDistribution = useMemo(() => {
    const labels: Record<string, string> = { hadir: "Hadir", terlambat: "Terlambat", sakit: "Sakit", izin: "Izin", alpa: "Alpa", pulang_awal: "Pulang Awal" };
    const counts = attendance.reduce((acc: Record<string, number>, row: any) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
    return Object.entries(labels).map(([key, label]) => ({ status: label, jumlah: counts[key] || 0 }));
  }, [attendance]);

  const reportPipeline = useMemo(() => {
    const groups = [{ label: "Draft/Input", statuses: ["draft", "teacher_input"] }, { label: "Review", statuses: ["homeroom_review", "revision_needed", "wakasek_review"] }, { label: "Persetujuan", statuses: ["principal_approval"] }, { label: "Selesai", statuses: ["approved", "published", "archived"] }];
    return groups.map((group) => ({ tahap: group.label, jumlah: reports.filter((report: any) => group.statuses.includes(report.status)).length }));
  }, [reports]);

  const insights = [
    metrics.studentAttendanceRate > 0 && metrics.studentAttendanceRate < 92 ? { severity: "danger", title: "Kehadiran siswa di bawah ambang mutu", text: `Capaian ${formatPercent(metrics.studentAttendanceRate)}. Periksa kelas dan siswa dengan sakit, izin, atau alpa berulang.`, href: "/reports/attendance" } : null,
    metrics.verificationRate > 0 && metrics.verificationRate < 95 ? { severity: "warning", title: "Verifikasi absensi pegawai belum tuntas", text: `${formatPercent(metrics.verificationRate)} rekaman telah diverifikasi. Selesaikan pengecualian lokasi dan input manual.`, href: "/attendance/reviews" } : null,
    metrics.collectionRate > 0 && metrics.collectionRate < 90 ? { severity: "warning", title: "Realisasi penagihan perlu perhatian", text: `Penerimaan mencapai ${formatPercent(metrics.collectionRate)} dari tagihan bersih pada konteks terpilih.`, href: "/finance/reports" } : null,
    students.length > 0 && metrics.quranCoverage < 80 ? { severity: "warning", title: "Cakupan jurnal Al-Quran belum merata", text: `${metrics.quranStudents} dari ${students.length} siswa memiliki jurnal pada rentang tanggal ini.`, href: "/tahfidz-reports" } : null,
    reports.length > 0 && metrics.reportCompletion < 80 ? { severity: "warning", title: "Alur rapor belum mendekati selesai", text: `${metrics.completedReports} dari ${reports.length} rapor telah disetujui atau dipublikasikan.`, href: "/reports/monitoring" } : null,
  ].filter(Boolean) as Array<{ severity: string; title: string; text: string; href: string }>;

  const exportSnapshot = async () => {
    const rows = [{
      "Periode Mulai": dateFrom, "Periode Selesai": dateTo, "Siswa Aktif": students.length,
      "Kehadiran Siswa (%)": metrics.studentAttendanceRate.toFixed(1), "Kehadiran Pegawai (%)": metrics.employeeAttendanceRate.toFixed(1),
      "Verifikasi Absensi Pegawai (%)": metrics.verificationRate.toFixed(1), "Realisasi Tagihan (%)": metrics.collectionRate.toFixed(1),
      "Siswa Memiliki Jurnal Quran": metrics.quranStudents, "Ketuntasan Alur Rapor (%)": metrics.reportCompletion.toFixed(1),
    }];
    exportToCsv(rows, `Ringkasan_Mutu_${dateFrom}_${dateTo}`);
    await recordReportExport({ reportKey: "management_quality_snapshot", reportLabel: "Ringkasan Analitik Mutu", format: "csv", rowCount: 1, unitId: activeUnitId, academicYearId: activeYearId, semesterId: activeSemesterId, dateFrom, dateTo });
  };

  return <div className="space-y-6 pb-10">
    <PageHeader title="Analitik Mutu Sekolah" description="Indikator lintas akademik, SDM, Al-Quran, keuangan, dan rapor dari data operasional aktual." action={<button onClick={() => void exportSnapshot()} disabled={isLoading} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4" />Ekspor Ringkasan</button>} />
    <ReportsSectionNav />
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-end"><label className="text-xs font-bold text-muted-foreground">Mulai<input type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><label className="text-xs font-bold text-muted-foreground">Sampai<input type="date" value={dateTo} min={dateFrom} onChange={(event) => setDateTo(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><p className="pb-2 text-xs text-muted-foreground">Angka dihitung ulang otomatis dari transaksi pada rentang tanggal ini.</p></section>
    {isLoading ? <div className="flex h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
        { label: "Kehadiran Siswa", value: formatPercent(metrics.studentAttendanceRate), detail: `${attendance.length} rekaman`, icon: CalendarDays, tone: "bg-blue-50 text-blue-700" },
        { label: "Kehadiran Pegawai", value: formatPercent(metrics.employeeAttendanceRate), detail: `${formatPercent(metrics.verificationRate)} terverifikasi`, icon: HeartPulse, tone: "bg-emerald-50 text-emerald-700" },
        { label: "Realisasi Tagihan", value: formatPercent(metrics.collectionRate), detail: `Rp ${metrics.paid.toLocaleString("id-ID")}`, icon: CircleDollarSign, tone: "bg-amber-50 text-amber-700" },
        { label: "Cakupan Jurnal Quran", value: formatPercent(metrics.quranCoverage), detail: `${metrics.quranStudents} siswa`, icon: BookOpenCheck, tone: "bg-cyan-50 text-cyan-700" },
        { label: "Ketuntasan Rapor", value: formatPercent(metrics.reportCompletion), detail: `${metrics.completedReports}/${reports.length} selesai`, icon: FileCheck2, tone: "bg-violet-50 text-violet-700" },
      ].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="mt-1 text-sm font-semibold">{item.label}</p><p className="text-xs text-muted-foreground">{item.detail}</p></div>)}</section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]"><section className="rounded-lg border bg-card p-4"><div className="mb-4"><h2 className="flex items-center gap-2 font-bold"><TrendingUp className="h-5 w-5 text-primary" />Tren Kehadiran Siswa</h2><p className="text-xs text-muted-foreground">Persentase hadir, termasuk terlambat dan pulang awal.</p></div><div className="h-72">{attendanceTrend.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Belum ada data kehadiran.</div> : <ResponsiveContainer width="100%" height="100%"><LineChart data={attendanceTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [`${Number(value || 0)}%`, "Kehadiran"]} /><Line type="monotone" dataKey="kehadiran" stroke="#047857" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>}</div></section><section className="rounded-lg border bg-card p-4"><h2 className="font-bold">Catatan Pimpinan</h2><p className="mt-1 text-xs text-muted-foreground">Indikator di bawah ambang memerlukan tindak lanjut.</p><div className="mt-4 space-y-3">{insights.length === 0 ? <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-5 w-5" /><p className="font-bold">Tidak ada indikator kritis</p><p className="mt-1 text-xs">Tetap tinjau kelengkapan data sebelum rapat mutu.</p></div> : insights.map((insight) => <Link key={insight.title} to={insight.href} className={`block rounded-md border p-3 ${insight.severity === "danger" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}><div className="flex gap-2"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${insight.severity === "danger" ? "text-red-700" : "text-amber-700"}`} /><div><p className="text-sm font-bold">{insight.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{insight.text}</p></div></div></Link>)}</div></section></div>
      <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-lg border bg-card p-4"><h2 className="font-bold">Distribusi Status Kehadiran</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceDistribution}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Bar dataKey="jumlah" name="Rekaman" radius={[4, 4, 0, 0]}>{attendanceDistribution.map((entry, index) => <Cell key={entry.status} fill={["#059669", "#f59e0b", "#eab308", "#3b82f6", "#dc2626", "#8b5cf6"][index]} />)}</Bar></BarChart></ResponsiveContainer></div></section><section className="rounded-lg border bg-card p-4"><h2 className="font-bold">Alur Penyelesaian Rapor</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={reportPipeline} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="tahap" width={90} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="jumlah" name="Rapor" fill="#2563eb" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section></div>
    </>}
  </div>;
};
