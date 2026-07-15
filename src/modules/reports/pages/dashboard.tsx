/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BarChart3, BookOpenCheck, CalendarCheck, CheckCircle2, CircleDollarSign, ClipboardCheck, FileClock, GraduationCap, HeartPulse, Loader2, PackageSearch, Users } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { formatPercent, localDateValue } from "../report-utils";

const now = new Date();
const today = localDateValue(now);
const monthStart = `${today.slice(0, 7)}-01`;
const nextSixtyDays = localDateValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60));
const openTaskStatuses = ["pending", "in_progress", "belum_mulai", "diproses", "menunggu_pihak_lain", "ditunda"];

const reportCatalog = [
  { title: "Rapor & Hasil Belajar", description: "Kelengkapan nilai, alur review, persetujuan, publikasi, dan tanda terima rapor.", href: "/reports/monitoring", icon: GraduationCap, domain: "Akademik" },
  { title: "Tahfidz", description: "Capaian target hafalan, jurnal ziyadah, asesmen, dan siswa yang memerlukan intervensi.", href: "/tahfidz-reports", icon: BookOpenCheck, domain: "Al-Quran" },
  { title: "Tahsin", description: "Perkembangan jilid, kualitas bacaan, hasil asesmen, dan ketuntasan target.", href: "/tahsin-reports", icon: BookOpenCheck, domain: "Al-Quran" },
  { title: "Keuangan", description: "Realisasi pemasukan dan pengeluaran, piutang, arus kas, RKAS, serta laporan per unit.", href: "/finance/reports", icon: CircleDollarSign, domain: "Keuangan" },
  { title: "SPMB", description: "Funnel pendaftar, hasil seleksi, daftar ulang, asal sekolah, dan daya tampung.", href: "/admissions/reports", icon: Users, domain: "Penerimaan" },
  { title: "Sarana Prasarana", description: "Kondisi aset, pemeliharaan, peminjaman, stok opname, dan pengadaan.", href: "/sarpras", icon: PackageSearch, domain: "Operasional" },
  { title: "Operasional Staf", description: "Penyelesaian pekerjaan rutin, temuan lapangan, SLA, dan tindak lanjut unit.", href: "/operations/reports", icon: ClipboardCheck, domain: "Operasional" },
];

export const ReportsDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const attendanceFilters: any[] = [{ field: "attendance_date", operator: "gte", value: monthStart }, { field: "attendance_date", operator: "lte", value: today }];
  if (activeUnitId) attendanceFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) attendanceFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  const { data: attendanceData, isLoading: attendanceLoading } = useList({ resource: "attendance_records", filters: attendanceFilters, pagination: { pageSize: 2500 }, meta: { select: "id,status,attendance_date" } });
  const { data: studentData } = useList({ resource: "students", filters: [{ field: "status", operator: "eq", value: "active" }, ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [])], pagination: { current: 1, pageSize: 1 } });
  const { data: employeeData } = useList({ resource: "employees", filters: [{ field: "status", operator: "eq", value: "active" }, ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [])], pagination: { current: 1, pageSize: 1 } });
  const { data: documentData } = useList({ resource: "documents", filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [], pagination: { pageSize: 1000 }, meta: { select: "id,status,archive_status,expiry_date,retention_until,physical_location" } });
  const { data: taskData } = useList({ resource: "admin_tasks", filters: [{ field: "status", operator: "in", value: openTaskStatuses }, ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [])], pagination: { pageSize: 1000 }, meta: { select: "id,title,status,due_date,priority" } });
  const { data: periodData } = useList({ resource: "report_periods", filters: [{ field: "status", operator: "eq", value: "active" }, ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []), ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : [])], pagination: { current: 1, pageSize: 1 } });
  const { data: exportData, isLoading: exportsLoading, isError: exportsError } = useList({ resource: "report_export_logs", filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [], pagination: { current: 1, pageSize: 5 }, sorters: [{ field: "created_at", order: "desc" }], meta: { select: "id,report_label,export_format,row_count,created_at,units(name)" } });

  const attendance = attendanceData?.data || [];
  const present = attendance.filter((row: any) => ["hadir", "terlambat", "pulang_awal"].includes(row.status)).length;
  const attendanceRate = attendance.length ? (present / attendance.length) * 100 : 0;
  const documents = useMemo(() => documentData?.data || [], [documentData?.data]);
  const tasks = useMemo(() => taskData?.data || [], [taskData?.data]);
  const qualityQueue = useMemo(() => {
    const waitingDocuments = documents.filter((doc: any) => doc.status === "menunggu_verifikasi").length;
    const expiringDocuments = documents.filter((doc: any) => doc.expiry_date && doc.expiry_date <= nextSixtyDays && doc.archive_status !== "destroyed").length;
    const missingLocations = documents.filter((doc: any) => doc.archive_status !== "destroyed" && !doc.physical_location).length;
    const overdueTasks = tasks.filter((task: any) => task.due_date && task.due_date < today).length;
    return [
      { label: "Dokumen menunggu verifikasi", value: waitingDocuments, href: "/reports/documents?status=menunggu_verifikasi", severity: waitingDocuments ? "warning" : "ok" },
      { label: "Dokumen berlaku <= 60 hari", value: expiringDocuments, href: "/documents/governance", severity: expiringDocuments ? "warning" : "ok" },
      { label: "Arsip tanpa lokasi fisik", value: missingLocations, href: "/documents", severity: missingLocations ? "warning" : "ok" },
      { label: "Tugas melewati tenggat", value: overdueTasks, href: "/reports/tasks?status=open", severity: overdueTasks ? "danger" : "ok" },
    ];
  }, [documents, tasks]);

  return <div className="space-y-6">
    <PageHeader title="Pusat Laporan Manajemen" description="Satu pintu untuk indikator mutu, laporan lintas unit, kepatuhan data, dan tindak lanjut pimpinan sekolah." action={<Link to="/reports/analytics" className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><BarChart3 className="h-4 w-4" />Buka Analitik Mutu</Link>} />
    <ReportsSectionNav />

    <section aria-label="Indikator utama" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Siswa aktif", value: studentData?.total ?? 0, detail: "sesuai unit", icon: Users, tone: "bg-blue-50 text-blue-700" }, { label: "Kehadiran siswa", value: attendanceLoading ? "..." : formatPercent(attendanceRate), detail: "bulan berjalan", icon: CalendarCheck, tone: attendanceRate && attendanceRate < 90 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700" }, { label: "Pegawai aktif", value: employeeData?.total ?? 0, detail: "guru dan staf", icon: HeartPulse, tone: "bg-cyan-50 text-cyan-700" }, { label: "Periode rapor aktif", value: periodData?.total ?? 0, detail: "tahun ajaran terpilih", icon: GraduationCap, tone: "bg-amber-50 text-amber-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="mt-1 text-sm font-semibold">{item.label}</p><p className="text-xs text-muted-foreground">{item.detail}</p></div>)}
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <section><div className="mb-3"><h2 className="font-bold">Kendali Mutu Data</h2><p className="text-xs text-muted-foreground">Antrean yang perlu diperiksa sebelum laporan digunakan dalam keputusan.</p></div><div className="overflow-hidden rounded-lg border bg-card">{qualityQueue.map((item) => <Link key={item.label} to={item.href} className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0 hover:bg-muted/30"><div className="flex min-w-0 items-center gap-3">{item.severity === "ok" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className={`h-5 w-5 shrink-0 ${item.severity === "danger" ? "text-red-600" : "text-amber-600"}`} />}<span className="truncate text-sm font-semibold">{item.label}</span></div><div className="flex items-center gap-2"><strong>{item.value}</strong><ArrowRight className="h-4 w-4 text-muted-foreground" /></div></Link>)}</div></section>
      <section><div className="mb-3 flex items-end justify-between"><div><h2 className="font-bold">Aktivitas Ekspor</h2><p className="text-xs text-muted-foreground">Jejak penggunaan data sensitif.</p></div><Link to="/reports/history" className="text-xs font-bold text-primary">Lihat semua</Link></div><div className="min-h-64 overflow-hidden rounded-lg border bg-card">{exportsLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : exportsError ? <div className="flex h-64 flex-col items-center justify-center p-6 text-center"><AlertTriangle className="h-9 w-9 text-amber-500" /><p className="mt-3 text-sm font-semibold">Audit ekspor belum aktif</p><p className="mt-1 text-xs text-muted-foreground">Terapkan migrasi laporan untuk mengaktifkan jejak ekspor.</p></div> : !exportData?.data.length ? <div className="flex h-64 flex-col items-center justify-center p-6 text-center"><FileClock className="h-9 w-9 text-muted-foreground/30" /><p className="mt-3 text-sm font-semibold">Belum ada ekspor tercatat</p><p className="mt-1 text-xs text-muted-foreground">Ekspor laporan akan terekam otomatis.</p></div> : <div className="divide-y">{exportData.data.map((log: any) => <div key={log.id} className="p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold">{log.report_label}</p><span className="rounded bg-muted px-2 py-1 text-[10px] font-bold uppercase">{log.export_format}</span></div><p className="mt-1 text-xs text-muted-foreground">{log.row_count} baris - {new Date(log.created_at).toLocaleString("id-ID")}</p></div>)}</div>}</div></section>
    </div>

    <section><div className="mb-3"><h2 className="font-bold">Katalog Laporan Lintas Modul</h2><p className="text-xs text-muted-foreground">Laporan khusus tetap dihitung oleh modul sumber agar definisi indikator tidak ganda.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{reportCatalog.map((report) => <Link key={report.href} to={report.href} className="group rounded-lg border bg-card p-4 hover:border-primary/40"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"><report.icon className="h-5 w-5 text-primary" /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{report.domain}</p><h3 className="mt-0.5 font-bold group-hover:text-primary">{report.title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{report.description}</p></div></div></Link>)}</div></section>
  </div>;
};
