import React from "react";
import { useList } from "@refinedev/core";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Building2, CalendarCheck, ClipboardList, FileText, Gauge, HeartPulse, History, Users } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentRoles } from "../../../hooks/useAuth";

const reportItems = [
  { label: "Ringkasan", path: "/reports", icon: Gauge, exact: true },
  { label: "Analitik Mutu", path: "/reports/analytics", icon: BarChart3 },
  { label: "Siswa", path: "/reports/students", icon: Users },
  { label: "Kehadiran Siswa", path: "/reports/attendance", icon: CalendarCheck },
  { label: "Kehadiran Pegawai", path: "/reports/employee-attendance", icon: HeartPulse },
  { label: "Izin & Cuti", path: "/reports/leaves", icon: ClipboardList },
  { label: "Dokumen", path: "/reports/documents", icon: FileText },
  { label: "Tugas", path: "/reports/tasks", icon: ClipboardList },
  { label: "Riwayat Ekspor", path: "/reports/history", icon: History },
];

export const ReportsSectionNav: React.FC = () => {
  const location = useLocation();
  const { roles } = useCurrentRoles();
  const { activeUnitId, setActiveUnitId, availableUnits } = useCurrentUnit();
  const { activeYearId, setActiveYearId, activeSemesterId, setActiveSemesterId } = useAcademicYear();
  const { data: unitData } = useList<{ id: string; name: string }>({ resource: "units", pagination: { mode: "off" }, sorters: [{ field: "name", order: "asc" }] });
  const { data: yearData } = useList<{ id: string; name: string; is_active: boolean }>({ resource: "academic_years", pagination: { mode: "off" }, sorters: [{ field: "start_date", order: "desc" }] });
  const { data: semesterData } = useList<{ id: string; name: string }>({ resource: "semesters", filters: activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : [], pagination: { mode: "off" }, queryOptions: { enabled: Boolean(activeYearId) } });
  const canConsolidate = Boolean(roles?.some((scope) => ["super_admin", "ketua_yayasan"].includes(scope.role) || (scope.unit_id === null && ["kepsek", "wakasek", "kepala_tu", "admin_sekolah"].includes(scope.role))));
  const allowedUnits = new Set(availableUnits);
  const units = (unitData?.data || []).filter((unit) => canConsolidate || allowedUnits.has(unit.id));

  const changeYear = (yearId: string) => {
    setActiveYearId(yearId || null);
    setActiveSemesterId?.(null);
  };

  return <div className="space-y-3">
    <section className="grid gap-3 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(180px,240px))] lg:items-end">
      <div className="min-w-0 lg:self-center"><p className="text-sm font-bold">Konteks laporan</p><p className="mt-0.5 text-xs text-muted-foreground">Seluruh indikator mengikuti lingkup yang dipilih.</p></div>
      <label className="block text-xs font-bold text-muted-foreground"><span className="mb-1.5 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Unit</span><select value={activeUnitId || ""} onChange={(event) => setActiveUnitId(event.target.value || null)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-semibold">{canConsolidate && <option value="">Konsolidasi Semua Unit</option>}{!canConsolidate && !activeUnitId && <option value="">Pilih unit</option>}{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      <label className="block text-xs font-bold text-muted-foreground"><span className="mb-1.5 block">Tahun ajaran</span><select value={activeYearId || ""} onChange={(event) => changeYear(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-semibold"><option value="">Semua tahun</option>{yearData?.data?.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_active ? " (Aktif)" : ""}</option>)}</select></label>
      <label className="block text-xs font-bold text-muted-foreground"><span className="mb-1.5 block">Semester</span><select value={activeSemesterId || ""} onChange={(event) => setActiveSemesterId?.(event.target.value || null)} disabled={!activeYearId} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-semibold disabled:opacity-50"><option value="">Semua semester</option>{semesterData?.data?.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></label>
    </section>
    <nav aria-label="Navigasi pusat laporan" className="overflow-x-auto border-b"><div className="flex min-w-max gap-1 px-1">{reportItems.map((item) => { const active = item.exact ? location.pathname === item.path : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`); const Icon = item.icon; return <Link key={item.path} to={item.path} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</div></nav>
  </div>;
};
