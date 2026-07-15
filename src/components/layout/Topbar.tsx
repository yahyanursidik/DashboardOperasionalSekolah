import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogout, useSelect } from "@refinedev/core";
import {
  Bell,
  Building,
  CalendarDays,
  GraduationCap,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react";
import { navigationConfig } from "../../config/navigation";
import { filterNavigationGroups, getVisibleNavigationGroups } from "../../config/navigation-utils";
import { useCurrentRoles, useCurrentUser } from "../../hooks/useAuth";
import { hasAnyRole } from "../../lib/permissions";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

interface TopbarProps {
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  ketua_yayasan: "Ketua Yayasan",
  kepsek: "Kepala Sekolah",
  wakasek: "Wakil Kepala Sekolah",
  kepala_tu: "Kepala Tata Usaha",
  admin_tu: "Admin Tata Usaha",
  admin_sekolah: "Admin Sekolah",
  admin_unit: "Admin Unit",
  admin_keuangan: "Admin Keuangan",
  admin_dokumen: "Admin Dokumen",
  admin_spmb: "Admin SPMB",
  operator_absensi: "Operator Absensi",
  guru: "Guru",
  wali_kelas: "Wali Kelas",
  hrd: "HRD",
};

function getRoleLabel(role?: string) {
  return ROLE_LABELS[role || ""] || String(role || "Pengguna").replace(/_/g, " ");
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { mutate: logout } = useLogout();
  const { user } = useCurrentUser();
  const { roles } = useCurrentRoles();
  const { activeUnitId, setActiveUnitId, availableUnits } = useCurrentUnit();
  const { activeYearId, setActiveYearId, activeSemesterId, setActiveSemesterId } = useAcademicYear();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { options: yearOptions } = useSelect({
    resource: "academic_years",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "desc" }],
  });
  const { options: semesterOptions } = useSelect({
    resource: "semesters",
    optionLabel: "name",
    optionValue: "id",
    filters: activeYearId
      ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }]
      : [],
    sorters: [{ field: "start_date", order: "asc" }],
    queryOptions: { enabled: Boolean(activeYearId) },
  });
  const { options: allUnitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const mayAccessAllUnits = hasAnyRole(roles, ["super_admin", "ketua_yayasan"]);
  const unitOptions = useMemo(
    () => (allUnitOptions || []).filter((unit) => mayAccessAllUnits || availableUnits.includes(String(unit.value))),
    [allUnitOptions, availableUnits, mayAccessAllUnits],
  );
  const activeUnitName = String(unitOptions.find((unit) => String(unit.value) === activeUnitId)?.label || "");
  const isPaudUnit = ["paud", "tk", "kb", "preschool"].some((term) => activeUnitName.toLowerCase().includes(term));
  const visibleGroups = useMemo(
    () => getVisibleNavigationGroups(navigationConfig, roles, { activeUnitId, isPaudUnit }),
    [activeUnitId, isPaudUnit, roles],
  );
  const searchResults = useMemo(
    () => filterNavigationGroups(visibleGroups, search).flatMap((group) => group.items).slice(0, 7),
    [search, visibleGroups],
  );

  const goToResult = (href: string) => {
    navigate(href);
    setSearch("");
    setSearchFocused(false);
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-3 shadow-sm sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Buka menu utama"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary hover:bg-muted md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="relative hidden w-full max-w-md lg:block">
          <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) goToResult(searchResults[0].href);
                if (event.key === "Escape") setSearchFocused(false);
              }}
              placeholder="Cari menu atau fitur..."
              aria-label="Cari menu atau fitur"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")} aria-label="Hapus pencarian" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {searchFocused && search.trim() ? (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border bg-popover p-1 shadow-lg">
              {searchResults.length ? searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.href} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => goToResult(item.href)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.href}</span>
                  </button>
                );
              }) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">Menu tidak ditemukan.</p>}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <label className="hidden h-10 items-center gap-2 rounded-md border bg-background px-2 xl:flex" title="Tahun ajaran aktif">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <select value={activeYearId || ""} onChange={(event) => setActiveYearId(event.target.value || null)} aria-label="Tahun ajaran aktif" className="max-w-32 cursor-pointer border-0 bg-transparent text-sm font-semibold outline-none">
            <option value="">Tahun ajaran</option>
            {yearOptions?.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
          </select>
        </label>

        <label className="hidden h-10 items-center gap-2 rounded-md border bg-background px-2 xl:flex" title="Semester aktif">
          <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
          <select value={activeSemesterId || ""} onChange={(event) => setActiveSemesterId?.(event.target.value || null)} aria-label="Semester aktif" className="max-w-28 cursor-pointer border-0 bg-transparent text-sm font-semibold outline-none">
            <option value="">Semester</option>
            {semesterOptions?.map((semester) => <option key={semester.value} value={semester.value}>{semester.label}</option>)}
          </select>
        </label>

        {unitOptions.length ? (
          <label className="hidden h-10 items-center gap-2 rounded-md border bg-background px-2 md:flex" title="Unit sekolah aktif">
            <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select value={activeUnitId || ""} onChange={(event) => setActiveUnitId(event.target.value || null)} aria-label="Unit sekolah aktif" className="max-w-36 cursor-pointer border-0 bg-transparent text-sm font-semibold outline-none">
              {mayAccessAllUnits ? <option value="">Lintas Unit</option> : null}
              {unitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
            </select>
          </label>
        ) : null}

        <Link to="/announcements" title="Buka pengumuman" aria-label="Buka pengumuman" className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Link>

        <div className="flex items-center gap-2 border-l pl-2 sm:pl-3">
          <div className="hidden max-w-36 flex-col items-end lg:flex">
            <span className="w-full truncate text-right text-sm font-semibold leading-none">{user?.name || "Pengguna"}</span>
            <span className="mt-1 w-full truncate text-right text-xs text-muted-foreground">{getRoleLabel(roles?.[0]?.role)}</span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary">
            {user?.avatar ? <img src={user.avatar} alt="Foto profil" className="h-full w-full object-cover" /> : (user?.name || "P").charAt(0).toUpperCase()}
          </div>
          <button type="button" onClick={() => logout()} title="Keluar" aria-label="Keluar dari sistem" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
