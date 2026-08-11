/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileWarning,
  ListChecks,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Timer,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { exportToCsv } from "../../../lib/csv";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { fetchAllReportRows, formatPercent, monthRange, recordReportExport, type ReportQueryFilter } from "../report-utils";

type ReportMode = "summary" | "daily";

type EmployeeInfo = {
  id?: string;
  full_name?: string;
  nik?: string;
  position?: string;
  unit_id?: string;
  units?: { name?: string } | null;
};

type AttendanceRecord = {
  id: string;
  employee_id: string;
  unit_id?: string | null;
  date: string;
  status: string;
  time_in?: string | null;
  time_out?: string | null;
  expected_start_time?: string | null;
  expected_end_time?: string | null;
  is_late?: boolean | null;
  late_minutes?: number | null;
  is_early_departure?: boolean | null;
  early_departure_minutes?: number | null;
  verification_status?: string | null;
  location_status?: string | null;
  check_in_method?: string | null;
  check_out_method?: string | null;
  attendance_rule_source?: string | null;
  notes?: string | null;
  created_at?: string | null;
  employees?: EmployeeInfo | null;
  attendance_sites?: { name?: string } | null;
};

type SummaryRow = {
  employee_id: string;
  employee?: EmployeeInfo | null;
  total: number;
  present: number;
  late: number;
  sick: number;
  leave: number;
  absent: number;
  verified: number;
  early: number;
  lateMinutes: number;
  workedMinutes: number;
  missedCheckout: number;
};

const currentMonth = new Date().toISOString().slice(0, 7);
const initialRange = monthRange(currentMonth);
const verifiedStatuses = new Set(["verified", "approved_exception", "manual"]);

const statusLabels: Record<string, string> = {
  present: "Hadir",
  late: "Terlambat",
  sick: "Sakit",
  leave: "Izin",
  absent: "Alpa",
  remote: "Dinas luar",
};

const statusClasses: Record<string, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-800",
  late: "border-amber-200 bg-amber-50 text-amber-800",
  sick: "border-yellow-200 bg-yellow-50 text-yellow-800",
  leave: "border-blue-200 bg-blue-50 text-blue-800",
  absent: "border-red-200 bg-red-50 text-red-800",
  remote: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

const ruleLabels: Record<string, string> = {
  assigned_shift: "Shift khusus",
  teaching_schedule: "Jadwal mengajar",
  work_schedule: "Jadwal kerja",
  unit_policy: "Aturan unit",
  global_policy: "Aturan lintas unit",
  system_default: "Default sistem",
  manual: "Input manual",
  event: "Kegiatan khusus",
  no_schedule: "Tanpa jadwal mengajar",
  no_work_schedule: "Tanpa jadwal kerja",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function timeToMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function getWorkedMinutes(record: AttendanceRecord) {
  const start = timeToMinutes(record.time_in);
  const end = timeToMinutes(record.time_out);
  if (start === null || end === null) return 0;
  return end >= start ? end - start : (24 * 60) - start + end;
}

function formatDuration(minutes: number) {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}j ${rest}m` : `${rest} menit`;
}

function buildSummaryRows(records: AttendanceRecord[]) {
  const grouped = new Map<string, SummaryRow>();
  records.forEach((record) => {
    const item = grouped.get(record.employee_id) || {
      employee_id: record.employee_id,
      employee: record.employees,
      total: 0,
      present: 0,
      late: 0,
      sick: 0,
      leave: 0,
      absent: 0,
      verified: 0,
      early: 0,
      lateMinutes: 0,
      workedMinutes: 0,
      missedCheckout: 0,
    };
    item.total += 1;
    if (["present", "late"].includes(record.status)) item.present += 1;
    if (record.status === "late" || record.is_late) item.late += 1;
    if (record.status === "sick") item.sick += 1;
    if (record.status === "leave") item.leave += 1;
    if (record.status === "absent") item.absent += 1;
    if (verifiedStatuses.has(record.verification_status || "")) item.verified += 1;
    if (record.is_early_departure) item.early += 1;
    if (record.time_in && !record.time_out && ["present", "late"].includes(record.status)) item.missedCheckout += 1;
    item.lateMinutes += Number(record.late_minutes || 0);
    item.workedMinutes += getWorkedMinutes(record);
    grouped.set(record.employee_id, item);
  });
  return Array.from(grouped.values()).sort((a, b) =>
    String(a.employee?.full_name || "").localeCompare(String(b.employee?.full_name || ""), "id")
  );
}

function EmployeeIdentity({ employee }: { employee?: EmployeeInfo | null }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{employee?.full_name || "Pegawai tidak ditemukan"}</p>
      <p className="truncate text-xs text-muted-foreground">{employee?.nik || "NIK belum diisi"}</p>
    </div>
  );
}

export const ReportEmployeeAttendance: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [month, setMonth] = useState(currentMonth);
  const [dateFrom, setDateFrom] = useState(initialRange.start);
  const [dateTo, setDateTo] = useState(initialRange.end);
  const [employeeId, setEmployeeId] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<ReportMode>("summary");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedAt] = useState(() => new Date());

  const filters: ReportQueryFilter[] = [
    { field: "date", operator: "gte", value: dateFrom },
    { field: "date", operator: "lte", value: dateTo },
  ];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (employeeId) filters.push({ field: "employee_id", operator: "eq", value: employeeId });

  const select = "id,employee_id,unit_id,date,status,time_in,time_out,is_late,late_minutes,is_early_departure,early_departure_minutes,verification_status,location_status,check_in_method,check_out_method,attendance_rule_source,expected_start_time,expected_end_time,notes,created_at,employees(id,full_name,nik,position,unit_id,units(name)),attendance_sites(name)";
  const { data, isLoading } = useList({
    resource: "employee_attendance",
    filters,
    pagination: { pageSize: 5000 },
    sorters: [{ field: "date", order: "desc" }],
    meta: { select },
  });

  const employeeFilters: ReportQueryFilter[] = [{ field: "status", operator: "eq", value: "active" }];
  if (activeUnitId) employeeFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  const { data: employeeData } = useList({
    resource: "employees",
    filters: employeeFilters,
    pagination: { pageSize: 2000 },
    sorters: [{ field: "full_name", order: "asc" }],
    meta: { select: "id,full_name,nik,position,unit_id,units(name)" },
  });

  const records = useMemo(() => (data?.data || []) as AttendanceRecord[], [data?.data]);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecords = useMemo(() => {
    if (!normalizedSearch) return records;
    return records.filter((record) => {
      const employee = record.employees;
      return [employee?.full_name, employee?.nik, employee?.position, employee?.units?.name]
        .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
    });
  }, [normalizedSearch, records]);

  const reportRows = useMemo(() => buildSummaryRows(filteredRecords), [filteredRecords]);
  const employees = (employeeData?.data || []) as EmployeeInfo[];
  const selectedEmployee = employees.find((employee) => employee.id === employeeId)
    || filteredRecords.find((record) => record.employee_id === employeeId)?.employees;

  const totalRecords = filteredRecords.length;
  const totalVerified = filteredRecords.filter((record) => verifiedStatuses.has(record.verification_status || "")).length;
  const totalLate = filteredRecords.filter((record) => record.status === "late" || record.is_late).length;
  const totalAnomalies = filteredRecords.filter((record) =>
    record.status === "absent" || record.is_early_departure || (record.time_in && !record.time_out)
  ).length;

  const pageSize = mode === "summary" ? 20 : 15;
  const sourceRows = mode === "summary" ? reportRows : filteredRecords;
  const pageCount = Math.max(1, Math.ceil(sourceRows.length / pageSize));
  const visibleSummary = reportRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleDaily = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateRangeFromMonth = (value: string) => {
    const range = monthRange(value);
    setMonth(value);
    setDateFrom(range.start);
    setDateTo(range.end);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setMonth(currentMonth);
    setDateFrom(initialRange.start);
    setDateTo(initialRange.end);
    setEmployeeId("");
    setSearch("");
    setMode("summary");
    setCurrentPage(1);
  };

  const openIndividualReport = (row: SummaryRow) => {
    setEmployeeId(row.employee_id);
    setSearch("");
    setMode("daily");
    setCurrentPage(1);
  };

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const exportRecords = await fetchAllReportRows<AttendanceRecord>(
        "employee_attendance",
        select,
        filters,
        "date",
      );
      const detailExport = mode === "daily" || Boolean(employeeId);
      if (detailExport) {
        exportToCsv(exportRecords.map((record) => ({
          Tanggal: formatDate(record.date),
          Nama: record.employees?.full_name || "",
          NIK: record.employees?.nik || "",
          Unit: record.employees?.units?.name || "Lintas unit",
          Jabatan: String(record.employees?.position || "").replace(/_/g, " "),
          Status: statusLabels[record.status] || record.status,
          "Jam Acuan Masuk": formatTime(record.expected_start_time),
          "Jam Absen Masuk": formatTime(record.time_in),
          "Jam Acuan Pulang": formatTime(record.expected_end_time),
          "Jam Absen Pulang": formatTime(record.time_out),
          "Durasi Kerja": formatDuration(getWorkedMinutes(record)),
          "Menit Terlambat": Number(record.late_minutes || 0),
          "Menit Pulang Awal": Number(record.early_departure_minutes || 0),
          "Acuan Kehadiran": ruleLabels[record.attendance_rule_source || ""] || record.attendance_rule_source || "-",
          Lokasi: record.attendance_sites?.name || record.location_status || "-",
          Verifikasi: record.verification_status || "-",
          "Metode Masuk": record.check_in_method || "-",
          "Metode Pulang": record.check_out_method || "-",
          Catatan: record.notes || "",
        })), `Rincian_Kehadiran_${selectedEmployee?.full_name || dateFrom}_${dateFrom}_${dateTo}`);
      } else {
        const summary = buildSummaryRows(exportRecords);
        exportToCsv(summary.map((row) => ({
          NIK: row.employee?.nik || "",
          Nama: row.employee?.full_name || "",
          Jabatan: String(row.employee?.position || "").replace(/_/g, " "),
          Unit: row.employee?.units?.name || "Lintas unit",
          "Hari Input": row.total,
          Hadir: row.present,
          Terlambat: row.late,
          "Total Menit Terlambat": row.lateMinutes,
          "Pulang Awal": row.early,
          "Belum Absen Pulang": row.missedCheckout,
          Sakit: row.sick,
          Izin: row.leave,
          Alpa: row.absent,
          Terverifikasi: row.verified,
          "Total Durasi": formatDuration(row.workedMinutes),
        })), `Rekap_Kehadiran_Pegawai_${dateFrom}_${dateTo}`);
      }
      await recordReportExport({
        reportKey: employeeId ? "employee_attendance_individual" : "employee_attendance",
        reportLabel: employeeId ? `Rincian Kehadiran ${selectedEmployee?.full_name || "Pegawai"}` : "Laporan Kehadiran Pegawai",
        format: "csv",
        rowCount: detailExport ? exportRecords.length : buildSummaryRows(exportRecords).length,
        unitId: activeUnitId,
        academicYearId: activeYearId,
        semesterId: activeSemesterId,
        dateFrom,
        dateTo,
        filters: { month, employeeId: employeeId || null, mode },
      });
      toast.success("Laporan kehadiran berhasil diekspor.");
    } catch (error) {
      toast.error("Ekspor kehadiran pegawai gagal", {
        description: error instanceof Error ? error.message : "Kesalahan tidak diketahui",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Kehadiran Pegawai"
        description="Rekap dan rincian waktu kehadiran guru serta staf berdasarkan unit, jadwal, shift, dan periode kerja."
        action={(
          <button
            type="button"
            onClick={() => void exportReport()}
            disabled={isExporting || totalRecords === 0}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Ekspor {mode === "daily" || employeeId ? "Rincian" : "Rekap"}
          </button>
        )}
      />
      <ReportsSectionNav />

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_1.3fr_1.2fr_auto]">
          <label className="min-w-0 text-xs font-bold text-muted-foreground">
            Bulan cepat
            <input
              type="month"
              value={month}
              onChange={(event) => updateRangeFromMonth(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="min-w-0 text-xs font-bold text-muted-foreground">
            Tanggal mulai
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => { setDateFrom(event.target.value); setCurrentPage(1); }}
              className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="min-w-0 text-xs font-bold text-muted-foreground">
            Tanggal akhir
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => { setDateTo(event.target.value); setCurrentPage(1); }}
              className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="min-w-0 text-xs font-bold text-muted-foreground">
            Laporan individu
            <select
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setMode(event.target.value ? "daily" : "summary");
                setCurrentPage(1);
              }}
              className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Semua pegawai</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name} {employee.nik ? `(${employee.nik})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-bold text-muted-foreground">
            Cari hasil
            <span className="relative mt-1.5 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                placeholder="Nama, NIK, jabatan"
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground"
              />
            </span>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              title="Atur ulang filter"
              onClick={resetFilters}
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-semibold hover:bg-muted xl:w-10"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="xl:sr-only">Atur ulang</span>
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-md border bg-muted/40 p-1">
            <button
              type="button"
              aria-pressed={mode === "summary"}
              onClick={() => { setMode("summary"); setCurrentPage(1); }}
              className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded px-3 text-sm font-semibold ${mode === "summary" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <BarChart3 className="h-4 w-4" /> Rekap Pegawai
            </button>
            <button
              type="button"
              aria-pressed={mode === "daily"}
              onClick={() => { setMode("daily"); setCurrentPage(1); }}
              className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded px-3 text-sm font-semibold ${mode === "daily" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <ListChecks className="h-4 w-4" /> Rincian Harian
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dibuat {generatedAt.toLocaleDateString("id-ID")} pukul {generatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
          </p>
        </div>
      </section>

      {selectedEmployee ? (
        <section className="flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-emerald-950">{selectedEmployee.full_name}</p>
              <p className="truncate text-xs text-emerald-800">
                {selectedEmployee.nik || "NIK belum diisi"} · {selectedEmployee.units?.name || "Lintas unit"} · {String(selectedEmployee.position || "-").replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <span className="whitespace-nowrap text-xs font-semibold text-emerald-800">{dateFrom} sampai {dateTo}</span>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: mode === "summary" ? "Pegawai Tercatat" : "Hari Tercatat", value: mode === "summary" ? reportRows.length : totalRecords, icon: Users, tone: "bg-blue-50 text-blue-700" },
          { label: "Terverifikasi", value: formatPercent(totalRecords ? (totalVerified / totalRecords) * 100 : 0), icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Kejadian Terlambat", value: totalLate, icon: Clock3, tone: "bg-amber-50 text-amber-700" },
          { label: "Perlu Ditinjau", value: totalAnomalies, icon: AlertTriangle, tone: "bg-red-50 text-red-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${tone}`}><Icon className="h-5 w-5" /></div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm" translate="no">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : sourceRows.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center px-5 text-center">
            <CalendarRange className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-bold">Belum ada rekaman kehadiran</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Tidak ada data pada rentang tanggal, pegawai, dan unit yang dipilih.</p>
          </div>
        ) : mode === "summary" ? (
          <>
            <div className="divide-y md:hidden">
              {visibleSummary.map((row) => (
                <article key={row.employee_id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <EmployeeIdentity employee={row.employee} />
                    <button type="button" title="Lihat rincian individu" onClick={() => openIndividualReport(row)} className="shrink-0 rounded-md border p-2 text-primary hover:bg-muted"><UserRoundSearch className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/50 p-2"><p className="text-lg font-bold">{row.present}</p><p className="text-muted-foreground">Hadir</p></div>
                    <div className="rounded-md bg-amber-50 p-2"><p className="text-lg font-bold text-amber-800">{row.late}</p><p className="text-amber-700">Terlambat</p></div>
                    <div className="rounded-md bg-red-50 p-2"><p className="text-lg font-bold text-red-800">{row.absent}</p><p className="text-red-700">Alpa</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Durasi tercatat {formatDuration(row.workedMinutes)} · Verifikasi {row.verified}/{row.total}</p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Unit / jabatan</th><th className="px-4 py-3 text-center">Input</th><th className="px-4 py-3 text-center">Hadir</th><th className="px-4 py-3 text-center">Terlambat</th><th className="px-4 py-3 text-center">Pulang awal</th><th className="px-4 py-3 text-center">Tanpa pulang</th><th className="px-4 py-3 text-center">S/I/A</th><th className="px-4 py-3">Durasi</th><th className="px-4 py-3 text-center">Validasi</th><th className="px-4 py-3 text-right">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleSummary.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3"><EmployeeIdentity employee={row.employee} /></td>
                      <td className="px-4 py-3"><p>{row.employee?.units?.name || "Lintas unit"}</p><p className="text-xs uppercase text-muted-foreground">{String(row.employee?.position || "-").replace(/_/g, " ")}</p></td>
                      <td className="px-4 py-3 text-center">{row.total}</td><td className="px-4 py-3 text-center font-bold text-emerald-700">{row.present}</td><td className="px-4 py-3 text-center font-bold text-amber-700">{row.late}<p className="text-[10px] font-normal">{row.lateMinutes} menit</p></td><td className="px-4 py-3 text-center">{row.early}</td><td className="px-4 py-3 text-center">{row.missedCheckout}</td><td className="px-4 py-3 text-center">{row.sick}/{row.leave}/{row.absent}</td><td className="px-4 py-3">{formatDuration(row.workedMinutes)}</td><td className="px-4 py-3 text-center">{row.verified}/{row.total}</td>
                      <td className="px-4 py-3 text-right"><button type="button" title="Lihat rincian individu" onClick={() => openIndividualReport(row)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-xs font-bold hover:bg-muted"><UserRoundSearch className="h-4 w-4" /> Lihat</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="divide-y lg:hidden">
              {visibleDaily.map((record) => {
                const workedMinutes = getWorkedMinutes(record);
                const needsReview = record.status === "absent" || Boolean(record.time_in && !record.time_out) || record.is_early_departure;
                return (
                  <article key={record.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="font-bold">{formatDate(record.date)}</p><EmployeeIdentity employee={record.employees} /></div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${statusClasses[record.status] || "border-border bg-muted text-foreground"}`}>{statusLabels[record.status] || record.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Masuk</p><p className="mt-1 font-bold">{formatTime(record.time_in)} <span className="font-normal text-muted-foreground">/ {formatTime(record.expected_start_time)}</span></p></div>
                      <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Pulang</p><p className="mt-1 font-bold">{formatTime(record.time_out)} <span className="font-normal text-muted-foreground">/ {formatTime(record.expected_end_time)}</span></p></div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{formatDuration(workedMinutes)}</span>
                      <span className="flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" />{ruleLabels[record.attendance_rule_source || ""] || record.attendance_rule_source || "Acuan belum tercatat"}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{record.attendance_sites?.name || record.location_status || "Lokasi belum tercatat"}</span>
                    </div>
                    {needsReview ? <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><FileWarning className="h-4 w-4" />Perlu ditinjau oleh admin absensi</p> : null}
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-3">Tanggal / pegawai</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Acuan jam</th><th className="px-4 py-3">Absen masuk</th><th className="px-4 py-3">Absen pulang</th><th className="px-4 py-3">Durasi</th><th className="px-4 py-3">Disiplin waktu</th><th className="px-4 py-3">Aturan</th><th className="px-4 py-3">Lokasi</th><th className="px-4 py-3">Verifikasi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {visibleDaily.map((record) => (
                    <tr key={record.id} className="align-top hover:bg-muted/20">
                      <td className="px-4 py-3"><p className="whitespace-nowrap font-semibold">{formatDate(record.date)}</p><EmployeeIdentity employee={record.employees} /></td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-md border px-2 py-1 text-xs font-bold ${statusClasses[record.status] || "border-border bg-muted text-foreground"}`}>{statusLabels[record.status] || record.status}</span></td>
                      <td className="px-4 py-3"><p>{formatTime(record.expected_start_time)} - {formatTime(record.expected_end_time)}</p><p className="mt-1 text-xs text-muted-foreground">jadwal kerja</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{formatTime(record.time_in)}</p><p className="mt-1 text-xs text-muted-foreground">{record.check_in_method || "metode tidak tercatat"}</p></td>
                      <td className="px-4 py-3"><p className={!record.time_out && record.time_in ? "font-bold text-red-700" : "font-bold"}>{formatTime(record.time_out)}</p><p className="mt-1 text-xs text-muted-foreground">{record.check_out_method || (record.time_in ? "belum absen pulang" : "-")}</p></td>
                      <td className="px-4 py-3 font-semibold">{formatDuration(getWorkedMinutes(record))}</td>
                      <td className="px-4 py-3"><p className={record.is_late ? "font-bold text-amber-700" : ""}>{record.is_late ? `Terlambat ${record.late_minutes || 0} menit` : "Tepat waktu"}</p>{record.is_early_departure ? <p className="mt-1 text-xs font-semibold text-red-700">Pulang awal {record.early_departure_minutes || 0} menit</p> : null}</td>
                      <td className="px-4 py-3">{ruleLabels[record.attendance_rule_source || ""] || record.attendance_rule_source || "-"}</td>
                      <td className="px-4 py-3"><p>{record.attendance_sites?.name || "-"}</p><p className="mt-1 text-xs text-muted-foreground">{record.location_status || "status belum tercatat"}</p></td>
                      <td className="px-4 py-3"><p>{record.verification_status || "pending"}</p>{record.notes ? <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={record.notes}>{record.notes}</p> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageCount > 1 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>{sourceRows.length} data · halaman {currentPage}/{pageCount}</span>
            <div className="flex gap-2">
              <button type="button" title="Sebelumnya" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" title="Berikutnya" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};
