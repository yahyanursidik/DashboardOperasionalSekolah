import React from "react";
import { useList } from "@refinedev/core";
import { Link, useLocation } from "react-router-dom";
import { BadgeDollarSign, BarChart3, BookOpenCheck, Building2, CalendarDays, CheckCircle2, CreditCard, Landmark, ReceiptText, Settings2, WalletCards } from "lucide-react";
import { getFinanceBasePath } from "../finance-utils";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentRoles, useCurrentUser } from "../../../hooks/useAuth";

const items = [
  { label: "Ringkasan", suffix: "", icon: BarChart3 },
  { label: "Tagihan", suffix: "/invoices", icon: ReceiptText },
  { label: "Penerimaan", suffix: "/receipts", icon: BadgeDollarSign },
  { label: "Verifikasi", suffix: "/verifications", icon: CheckCircle2 },
  { label: "Pengeluaran", suffix: "/expenses", icon: CreditCard },
  { label: "Kas & Bank", suffix: "/cashbook", icon: WalletCards },
  { label: "Anggaran", suffix: "/budgets", icon: Landmark },
  { label: "Tarif & Program", suffix: "/tariffs", icon: Settings2 },
  { label: "Akuntansi", suffix: "/accounting", icon: BookOpenCheck },
  { label: "Laporan", suffix: "/reports", icon: BarChart3 },
];

export const FinanceSectionNav: React.FC = () => {
  const location = useLocation();
  const basePath = getFinanceBasePath(location.pathname);
  const { activeUnitId, setActiveUnitId, availableUnits } = useCurrentUnit();
  const { activeYearId, setActiveYearId } = useAcademicYear();
  const { roles } = useCurrentRoles();
  const { user } = useCurrentUser();
  const { data: unitsData } = useList<{ id: string; name: string }>({ resource: "units", pagination: { mode: "off" }, sorters: [{ field: "name", order: "asc" }] });
  const { data: yearsData } = useList<{ id: string; name: string }>({ resource: "academic_years", pagination: { mode: "off" }, sorters: [{ field: "name", order: "desc" }] });
  const { data: employeeData } = useList<{ unit_id?: string | null; position?: string | null }>({ resource: "employees", filters: user?.id ? [{ field: "user_id", operator: "eq", value: user.id }] : [], pagination: { mode: "off" }, queryOptions: { enabled: Boolean(user?.id) } });
  const employee = employeeData?.data?.[0];
  const isFinanceEmployee = /bendahara|keuangan/i.test(employee?.position || "");
  const canConsolidate = Boolean(roles?.some((scope) => ["super_admin", "ketua_yayasan"].includes(scope.role) || (["admin_keuangan", "kepala_tu"].includes(scope.role) && !scope.unit_id)) || (isFinanceEmployee && !employee?.unit_id));
  const scopedUnitIds = new Set([...availableUnits, ...(employee?.unit_id ? [employee.unit_id] : [])]);
  const units = (unitsData?.data || []).filter((unit) => canConsolidate || scopedUnitIds.has(unit.id));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
        <label className="flex min-w-0 items-center gap-3">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Unit keuangan</span>
          <select value={activeUnitId || ""} onChange={(event) => setActiveUnitId(event.target.value || null)} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm font-semibold">
            {canConsolidate && <option value="">Konsolidasi Semua Unit</option>}
            {!canConsolidate && !activeUnitId && <option value="">Pilih unit kerja</option>}
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-3">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Tahun ajaran keuangan</span>
          <select value={activeYearId || ""} onChange={(event) => setActiveYearId(event.target.value || null)} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm font-semibold">
            <option value="">Semua Tahun Ajaran</option>
            {(yearsData?.data || []).map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </label>
      </div>
      <nav aria-label="Navigasi modul keuangan" className="overflow-x-auto border-b">
        <div className="flex min-w-max gap-1 px-1">
        {items.map((item) => {
          const path = `${basePath}${item.suffix}`;
          const active = item.suffix === ""
            ? location.pathname === basePath
            : location.pathname === path || location.pathname.startsWith(`${path}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={path}
              className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        </div>
      </nav>
    </div>
  );
};
