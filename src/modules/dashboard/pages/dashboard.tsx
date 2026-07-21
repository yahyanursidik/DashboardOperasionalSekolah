/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useGetIdentity, useList, useOne } from "@refinedev/core";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Megaphone,
  Search,
  Settings2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { navigationConfig, type NavigationItem } from "../../../config/navigation";
import { filterNavigationGroups, getVisibleNavigationGroups } from "../../../config/navigation-utils";
import { useCurrentRoles } from "../../../hooks/useAuth";
import { canAccessResource, hasRole, type UserRoleScope } from "../../../lib/permissions";

type CountState = {
  value: number | string;
  isLoading: boolean;
  isError: boolean;
};

const countValue = (query: any): CountState => ({
  value: query.data?.total ?? 0,
  isLoading: query.isLoading,
  isError: query.isError,
});

const ContextSummary = () => {
  const { data: identity } = useGetIdentity<any>();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const unit = useOne({ resource: "units", id: activeUnitId || "", queryOptions: { enabled: Boolean(activeUnitId) } });
  const year = useOne({ resource: "academic_years", id: activeYearId || "", queryOptions: { enabled: Boolean(activeYearId) } });
  const semester = useOne({ resource: "semesters", id: activeSemesterId || "", queryOptions: { enabled: Boolean(activeSemesterId) } });
  const units = useList({
    resource: "units",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
  });

  const fullName = identity?.profileData?.full_name || identity?.name || identity?.email || "Admin";
  const firstName = String(fullName).trim().split(/\s+/)[0] || "Admin";

  return (
    <section className="border-y bg-card py-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Assalamu'alaikum, {firstName}</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Konteks kerja aktif</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seluruh indikator dan daftar kerja mengikuti unit serta periode yang dipilih di bagian atas aplikasi.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ContextItem label="Unit" value={unit.data?.data?.name || (activeUnitId ? "Memuat unit" : "Lintas unit")} />
          <ContextItem label="Tahun ajaran" value={year.data?.data?.name || (activeYearId ? "Memuat periode" : "Belum dipilih")} />
          <ContextItem label="Semester" value={semester.data?.data?.name || (activeSemesterId ? "Memuat semester" : "Belum dipilih")} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <span className="text-xs font-semibold text-muted-foreground">Unit beroperasi:</span>
        {units.isLoading ? <span className="text-xs text-muted-foreground">Memuat...</span> : null}
        {(units.data?.data || []).map((item: any) => (
          <span key={item.id} className="rounded-md border bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground">{item.name}</span>
        ))}
        {!units.isLoading && !units.data?.data?.length ? <span className="text-xs text-amber-700">Belum ada unit aktif.</span> : null}
      </div>
    </section>
  );
};

const ContextItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-44 rounded-md border bg-background px-3 py-2.5">
    <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
    <p className="mt-0.5 truncate text-sm font-bold text-foreground">{value}</p>
  </div>
);

const CoreIndicators = ({ roles }: { roles?: UserRoleScope[] }) => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const canViewStudents = canAccessResource(roles, "students");
  const canViewEmployees = canAccessResource(roles, "employees");
  const canViewClasses = canAccessResource(roles, "classes");
  const canViewTasks = canAccessResource(roles, "admin_tasks");
  const canViewReports = canAccessResource(roles, "reports");

  const students = useList({
    resource: "students",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "eq", value: "active" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewStudents },
  });
  const employees = useList({
    resource: "employees",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "eq", value: "active" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewEmployees },
  });
  const classes = useList({
    resource: "classes",
    pagination: { pageSize: 1 },
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    queryOptions: { enabled: canViewClasses },
  });
  const tasks = useList({
    resource: "admin_tasks",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "ne", value: "selesai" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewTasks },
  });

  const items = [
    canViewStudents ? { label: "Siswa aktif", href: "/students", icon: Users, ...countValue(students) } : null,
    canViewEmployees ? { label: "Pegawai aktif", href: "/employees", icon: Building2, ...countValue(employees) } : null,
    canViewClasses ? { label: "Kelas periode aktif", href: "/classes", icon: GraduationCap, ...countValue(classes) } : null,
    canViewTasks ? { label: "Tindak lanjut terbuka", href: "/tasks", icon: ClipboardList, ...countValue(tasks) } : null,
  ].filter(Boolean) as Array<CountState & { label: string; href: string; icon: typeof Users }>;

  if (!items.length) return null;

  return (
    <section aria-labelledby="core-indicators-title">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 id="core-indicators-title" className="text-base font-bold">Indikator inti</h2>
          <p className="text-xs text-muted-foreground">Angka sesuai cakupan akses dan filter aktif.</p>
        </div>
        {canViewReports ? (
          <Link to="/reports/analytics" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex">
            Analitik mutu <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href} className="group rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-4 text-2xl font-bold">{item.isLoading ? "..." : item.isError ? "-" : item.value}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const QuickActions = ({ roles }: { roles?: UserRoleScope[] }) => {
  const actions = [
    { label: "Tambah siswa", description: "Registrasi data siswa", href: "/students/create", resource: "students", icon: UserPlus },
    { label: "Absensi siswa", description: "Input kehadiran kelas", href: "/attendance", resource: "attendance_records", icon: CalendarCheck },
    { label: "Monitor pegawai", description: "Presensi harian pegawai", href: "/attendance/employees", resource: "employee_attendance", icon: ClipboardCheck },
    { label: "Rapat & kegiatan", description: "Presensi kegiatan insidental", href: "/attendance/events", resource: "employee_attendance", icon: Users },
    { label: "Jadwal pelajaran & kerja", description: "Kelas, mapel, shift, dan tugas", href: "/schedules", resource: "employee_schedules", icon: CalendarCheck },
    { label: "Buat pengumuman", description: "Informasi lintas portal", href: "/announcements/create", resource: "announcements", icon: Megaphone },
    { label: "Tagihan siswa", description: "Kelola tagihan per unit", href: "/finance/invoices", resource: "student_invoices", icon: Wallet },
    { label: "Kurikulum", description: "Mapel per tahun dan semester", href: "/curriculum", resource: "subjects", icon: BookOpenCheck },
  ].filter((action) => canAccessResource(roles, action.resource));

  if (!actions.length) return null;

  return (
    <section aria-labelledby="quick-actions-title">
      <div className="mb-3">
        <h2 id="quick-actions-title" className="text-base font-bold">Aksi utama</h2>
        <p className="text-xs text-muted-foreground">Perintah yang paling sering digunakan sesuai peran Anda.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href} className="flex min-h-20 items-center gap-3 rounded-md border bg-card p-3 transition hover:border-primary/40 hover:bg-muted/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{action.label}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const FollowUpQueue = ({ roles }: { roles?: UserRoleScope[] }) => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const canViewStudents = canAccessResource(roles, "students");
  const canViewLeaves = canAccessResource(roles, "leave_requests");
  const canViewPayments = canAccessResource(roles, "payment_transactions");
  const canViewTasks = canAccessResource(roles, "admin_tasks");

  const missingStudentData = useList({
    resource: "students",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "nisn", operator: "null", value: true },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewStudents },
  });
  const pendingLeaves = useList({
    resource: "leave_requests",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "eq", value: "pending" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewLeaves },
  });
  const pendingPayments = useList({
    resource: "payment_transactions",
    pagination: { mode: "off" },
    filters: [{ field: "status", operator: "eq", value: "pending_verification" }],
    meta: { select: "id, student_invoices(unit_id, academic_year_id)" },
    queryOptions: { enabled: canViewPayments },
  });
  const openTasks = useList({
    resource: "admin_tasks",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "ne", value: "selesai" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewTasks },
  });

  const items = [
    canViewStudents ? { label: "Data siswa belum lengkap", detail: "NISN siswa aktif perlu dilengkapi", href: "/students", icon: AlertCircle, tone: "amber", ...countValue(missingStudentData) } : null,
    canViewLeaves ? { label: "Izin menunggu tinjauan", detail: "Perlu keputusan dan tindak lanjut jadwal", href: "/leaves", icon: CalendarCheck, tone: "blue", ...countValue(pendingLeaves) } : null,
    canViewPayments ? {
      label: "Pembayaran perlu verifikasi",
      detail: "Cocokkan bukti bayar dan kas",
      href: "/finance/verifications",
      icon: Wallet,
      tone: "emerald",
      value: (pendingPayments.data?.data || []).filter((item: any) => {
        if (activeUnitId && item.student_invoices?.unit_id !== activeUnitId) return false;
        if (activeYearId && item.student_invoices?.academic_year_id !== activeYearId) return false;
        return true;
      }).length,
      isLoading: pendingPayments.isLoading,
      isError: pendingPayments.isError,
    } : null,
    canViewTasks ? { label: "Tugas belum selesai", detail: "Pekerjaan operasional masih terbuka", href: "/tasks", icon: ClipboardList, tone: "violet", ...countValue(openTasks) } : null,
  ].filter(Boolean) as Array<CountState & { label: string; detail: string; href: string; icon: typeof AlertCircle; tone: string }>;

  if (!items.length) return null;

  const toneClasses: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <section aria-labelledby="follow-up-title">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 id="follow-up-title" className="text-base font-bold">Perlu tindak lanjut</h2>
          <p className="text-xs text-muted-foreground">Antrean penting agar layanan sekolah tidak terhenti.</p>
        </div>
        <Link to="/tasks" className="text-sm font-semibold text-primary hover:underline">Pusat tugas</Link>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href} className={`flex items-center gap-3 p-4 transition hover:bg-muted/30 ${index ? "border-t" : ""}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneClasses[item.tone]}`}><Icon className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <span className="min-w-8 text-right text-lg font-bold">{item.isLoading ? "..." : item.isError ? "-" : item.value}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const DataReadiness = ({ roles }: { roles?: UserRoleScope[] }) => {
  const { activeUnitId } = useCurrentUnit();
  const canViewStudents = canAccessResource(roles, "students");
  const canViewEmployees = canAccessResource(roles, "employees");

  const totalStudents = useList({
    resource: "students", pagination: { pageSize: 1 },
    filters: [...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [])],
    queryOptions: { enabled: canViewStudents },
  });
  const completeStudents = useList({
    resource: "students", pagination: { pageSize: 1 },
    filters: [
      { field: "nisn", operator: "nnull", value: true },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewStudents },
  });
  const totalEmployees = useList({
    resource: "employees", pagination: { pageSize: 1 },
    filters: [...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [])],
    queryOptions: { enabled: canViewEmployees },
  });
  const completeEmployees = useList({
    resource: "employees", pagination: { pageSize: 1 },
    filters: [
      { field: "nik", operator: "nnull", value: true },
      { field: "position", operator: "nnull", value: true },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    queryOptions: { enabled: canViewEmployees },
  });

  const percentage = (complete?: number, total?: number) => total ? Math.round(((complete || 0) / total) * 100) : null;
  const rows = [
    canViewStudents ? { label: "Identitas siswa", href: "/students", value: percentage(completeStudents.data?.total, totalStudents.data?.total), loading: totalStudents.isLoading || completeStudents.isLoading } : null,
    canViewEmployees ? { label: "Identitas & jabatan pegawai", href: "/employees", value: percentage(completeEmployees.data?.total, totalEmployees.data?.total), loading: totalEmployees.isLoading || completeEmployees.isLoading } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; value: number | null; loading: boolean }>;

  if (!rows.length) return null;

  return (
    <section aria-labelledby="data-readiness-title">
      <div className="mb-3">
        <h2 id="data-readiness-title" className="text-base font-bold">Kesiapan data</h2>
        <p className="text-xs text-muted-foreground">Data dasar yang memengaruhi portal, laporan, dan integrasi.</p>
      </div>
      <div className="rounded-md border bg-card p-4">
        <div className="space-y-4">
          {rows.map((row) => (
            <Link key={row.href} to={row.href} className="block">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{row.label}</span>
                <span className="font-bold">{row.loading ? "..." : row.value === null ? "Belum ada data" : `${row.value}%`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${(row.value || 0) >= 90 ? "bg-emerald-600" : (row.value || 0) >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${row.value || 0}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureDirectory = ({ roles }: { roles?: UserRoleScope[] }) => {
  const { activeUnitId } = useCurrentUnit();
  const [search, setSearch] = useState("");
  const unit = useOne({ resource: "units", id: activeUnitId || "", queryOptions: { enabled: Boolean(activeUnitId) } });
  const unitName = String(unit.data?.data?.name || "").toLowerCase();
  const isPaudUnit = ["paud", "tk", "kb", "preschool"].some((term) => unitName.includes(term));
  const visibleGroups = useMemo(
    () => getVisibleNavigationGroups(navigationConfig, roles, { activeUnitId, isPaudUnit }),
    [activeUnitId, isPaudUnit, roles],
  );
  const filteredGroups = useMemo(() => filterNavigationGroups(visibleGroups, search), [search, visibleGroups]);
  const resultCount = filteredGroups.reduce((total, group) => total + group.items.length, 0);

  return (
    <section aria-labelledby="feature-directory-title">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="feature-directory-title" className="text-base font-bold">Pusat fitur sekolah</h2>
          <p className="text-xs text-muted-foreground">Semua menu yang dapat Anda akses, tersusun mengikuti workflow terbaru.</p>
        </div>
        <label className="relative block w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari siswa, absensi, RKAS..." className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
          {search ? <button type="button" onClick={() => setSearch("")} title="Hapus pencarian" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button> : null}
        </label>
      </div>
      <div className="mb-2 text-xs text-muted-foreground">{resultCount} fitur tersedia dalam {filteredGroups.length} kelompok.</div>
      {filteredGroups.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredGroups.map((group) => (
            <details key={group.name} open={Boolean(search) || group.name === "Operasional Harian"} className="group overflow-hidden rounded-md border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30">
                <div>
                  <p className="text-sm font-bold">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{group.items.length} fitur</p>
                </div>
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </summary>
              <div className="grid border-t sm:grid-cols-2">
                {group.items.map((item: NavigationItem, index) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} to={item.href} className={`flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-primary/5 hover:text-primary ${index >= 2 ? "border-t" : ""} ${index % 2 === 1 ? "sm:border-l" : ""} ${index === 1 ? "border-t sm:border-t-0" : ""}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold">Fitur tidak ditemukan</p>
          <p className="mt-1 text-xs text-muted-foreground">Gunakan nama proses, modul, atau data yang ingin dikelola.</p>
        </div>
      )}
    </section>
  );
};

const SystemStatus = ({ roles }: { roles?: UserRoleScope[] }) => {
  const items = [
    { label: "Kurikulum per tahun & semester", resource: "subjects", href: "/curriculum", icon: BookOpenCheck },
    { label: "Absensi pegawai multi aturan", resource: "employee_attendance", href: "/attendance/settings", icon: CalendarCheck },
    { label: "Portal & pengumuman lintas peran", resource: "announcements", href: "/announcements", icon: Megaphone },
    { label: "Pelaporan mutu sekolah", resource: "reports", href: "/reports", icon: FileBarChart },
  ].filter((item) => canAccessResource(roles, item.resource));

  if (!items.length) return null;

  return (
    <section aria-labelledby="system-status-title">
      <div className="mb-3">
        <h2 id="system-status-title" className="text-base font-bold">Workflow terintegrasi</h2>
        <p className="text-xs text-muted-foreground">Pintu masuk ke konfigurasi yang berdampak lintas modul dan portal.</p>
      </div>
      <div className="rounded-md border bg-card">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href} className={`flex items-center gap-3 p-4 hover:bg-muted/30 ${index ? "border-t" : ""}`}>
              <Icon className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export const DashboardPage = () => {
  const { roles, isLoading } = useCurrentRoles();
  const canViewAnalytics = canAccessResource(roles, "reports");
  const isSystemAdmin = hasRole(roles, "super_admin") || hasRole(roles, "ketua_yayasan");

  return (
    <div className="space-y-7">
      <PageHeader
        title="Pusat Kendali Sekolah"
        description="Ringkasan operasional, antrean mutu, dan akses seluruh fitur sesuai peran, unit, tahun ajaran, serta semester aktif."
        action={canViewAnalytics ? (
          <Link to="/reports/analytics" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            <Activity className="h-4 w-4" /> Analitik Mutu
          </Link>
        ) : undefined}
      />

      <ContextSummary />

      {isLoading ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">Menyiapkan dashboard sesuai hak akses...</div>
      ) : (
        <>
          <CoreIndicators roles={roles} />
          <QuickActions roles={roles} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <FollowUpQueue roles={roles} />
            <div className="space-y-6">
              <DataReadiness roles={roles} />
              <SystemStatus roles={roles} />
            </div>
          </div>
          <FeatureDirectory roles={roles} />
          {isSystemAdmin ? (
            <div className="flex flex-col gap-3 border-t pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Administrasi sistem</p>
                <p className="text-xs text-muted-foreground">Kelola role, keamanan akun, integrasi, dan audit aktivitas.</p>
              </div>
              <div className="flex gap-2">
                <Link to="/audit-logs" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 font-semibold hover:bg-muted"><ClipboardCheck className="h-4 w-4" /> Audit Log</Link>
                <Link to="/settings" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 font-semibold hover:bg-muted"><Settings2 className="h-4 w-4" /> Pengaturan</Link>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
