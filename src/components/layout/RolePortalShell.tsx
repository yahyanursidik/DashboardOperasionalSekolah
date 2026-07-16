import React, { useMemo, useState } from "react";
import { useSelect } from "@refinedev/core";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  GraduationCap,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { BrandLogo } from "../common/BrandLogo";

export interface RolePortalNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  keywords?: string[];
}

export interface RolePortalNavGroup {
  label: string;
  items: RolePortalNavItem[];
}

interface RolePortalShellProps {
  employee: PortalEmployee;
  portalLabel: string;
  roleLabel: string;
  navGroups: RolePortalNavGroup[];
  storageKey: string;
  onLogout: () => void | Promise<void>;
  outletContext?: Record<string, unknown>;
  mobilePrimaryPaths?: string[];
  notificationPath?: string;
  showAcademicContext?: boolean;
}

interface PortalEmployee {
  full_name?: string | null;
  photo_url?: string | null;
  unit_name?: string | null;
  units?: { name?: string | null } | Array<{ name?: string | null }> | null;
  [key: string]: unknown;
}

function employeeUnitName(employee: PortalEmployee) {
  const unit = Array.isArray(employee.units) ? employee.units[0] : employee.units;
  return unit?.name || employee.unit_name || "Lintas unit";
}

export const RolePortalShell: React.FC<RolePortalShellProps> = ({
  employee,
  portalLabel,
  roleLabel,
  navGroups,
  storageKey,
  onLogout,
  outletContext,
  mobilePrimaryPaths = [],
  notificationPath,
  showAcademicContext = false,
}) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`${storageKey}-sidebar-collapsed`) === "true";
  });
  const { activeYearId, setActiveYearId, activeSemesterId, setActiveSemesterId } = useAcademicYear();

  const { options: yearOptions } = useSelect({
    resource: "academic_years",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "desc" }],
    queryOptions: { enabled: showAcademicContext },
  });
  const { options: semesterOptions } = useSelect({
    resource: "semesters",
    optionLabel: "name",
    optionValue: "id",
    filters: activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : [],
    sorters: [{ field: "start_date", order: "asc" }],
    queryOptions: { enabled: showAcademicContext && Boolean(activeYearId) },
  });

  const allItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => [item.label, item.to, ...(item.keywords || [])].some((value) => value.toLowerCase().includes(query))),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, search]);

  const mobileItems = useMemo(() => {
    const selected = mobilePrimaryPaths
      .map((path) => allItems.find((item) => item.to === path))
      .filter(Boolean) as RolePortalNavItem[];
    return selected.slice(0, 3);
  }, [allItems, mobilePrimaryPaths]);

  const isActive = (item: RolePortalNavItem) => item.exact
    ? location.pathname === item.to
    : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(`${storageKey}-sidebar-collapsed`, String(next));
      return next;
    });
  };

  const renderNavItem = (item: RolePortalNavItem, mobile = false) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-current={active ? "page" : undefined}
        title={!mobile && isCollapsed ? item.label : undefined}
        className={mobile
          ? `relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 ${active ? "text-primary" : "text-muted-foreground"}`
          : `group mx-1 flex items-center rounded-md px-3 py-2.5 text-sm transition-colors ${isCollapsed ? "md:justify-center md:px-2" : "gap-3"} ${active ? "bg-primary/10 font-bold text-primary" : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
      >
        <Icon className={mobile ? "h-5 w-5" : "h-4 w-4 shrink-0"} />
        <span className={mobile ? "max-w-full truncate text-[10px] font-semibold" : `min-w-0 flex-1 truncate ${isCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
        {item.badge ? (
          <span className={mobile
            ? "absolute right-3 top-2 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[9px] font-bold text-white"
            : `min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-800 ${isCollapsed ? "md:absolute md:ml-7 md:-mt-6" : ""}`}
          >{item.badge}</span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {isMobileMenuOpen ? <button type="button" aria-label="Tutup menu" onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 md:hidden" /> : null}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card shadow-sm transition-all duration-200 md:sticky md:translate-x-0 ${isCollapsed ? "md:w-20" : "md:w-72"} ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-[110%]"}`}>
        <div className={`flex h-16 shrink-0 items-center justify-between border-b ${isCollapsed ? "px-3 md:justify-center" : "px-5"}`}>
          <div className={isCollapsed ? "md:hidden" : "block"}><BrandLogo textClassName="text-lg font-bold text-foreground" /></div>
          {isCollapsed ? <div className="hidden h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-bold text-primary md:flex">TS</div> : null}
          <button type="button" onClick={toggleSidebar} title={isCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:flex">
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Tutup menu" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"><X className="h-5 w-5" /></button>
        </div>

        <div className={`border-b p-4 ${isCollapsed ? "md:hidden" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 font-bold uppercase text-primary">{String(employee?.full_name || "P").charAt(0)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{employee?.full_name || "Pengguna"}</p>
              <p className="truncate text-xs font-semibold text-primary">{portalLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{employeeUnitName(employee)}</p>
            </div>
          </div>
        </div>

        <div className={`border-b p-3 ${isCollapsed ? "md:hidden" : ""}`}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari menu atau fitur..." className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            {search ? <button type="button" onClick={() => setSearch("")} title="Hapus pencarian" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button> : null}
          </label>
        </div>

        <nav className="flex-1 overflow-y-auto py-4" aria-label={`Navigasi ${portalLabel}`}>
          {filteredGroups.map((group) => (
            <section key={group.label} className="mb-4 px-2">
              <p className={`mb-1 px-3 text-[11px] font-bold uppercase text-muted-foreground ${isCollapsed ? "md:hidden" : ""}`}>{group.label}</p>
              {isCollapsed ? <div className="mx-2 mb-2 hidden border-t md:block" title={group.label} /> : null}
              <div className="space-y-1">{group.items.map((item) => renderNavItem(item))}</div>
            </section>
          ))}
          {filteredGroups.length === 0 ? <div className={`px-5 py-10 text-center ${isCollapsed ? "md:hidden" : ""}`}><Search className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">Menu tidak ditemukan</p></div> : null}
        </nav>

        <div className="shrink-0 border-t p-3">
          <button type="button" onClick={() => void onLogout()} title="Keluar" className={`flex w-full items-center rounded-md px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 ${isCollapsed ? "md:justify-center md:px-2" : "gap-3"}`}><LogOut className="h-4 w-4" /><span className={isCollapsed ? "md:hidden" : ""}>Keluar</span></button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-3 shadow-sm sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Buka menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary hover:bg-muted md:hidden"><Menu className="h-6 w-6" /></button>
            <div className="min-w-0"><p className="truncate text-sm font-bold">{portalLabel}</p><p className="truncate text-xs text-muted-foreground">{roleLabel}</p></div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {showAcademicContext ? <>
              <label className="hidden h-10 items-center gap-2 rounded-md border bg-background px-2 lg:flex" title="Tahun ajaran aktif">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <select value={activeYearId || ""} onChange={(event) => { setActiveSemesterId?.(null); setActiveYearId(event.target.value || null); }} className="max-w-32 border-0 bg-transparent text-sm font-semibold outline-none"><option value="">Tahun ajaran</option>{yearOptions?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </label>
              <label className="hidden h-10 items-center gap-2 rounded-md border bg-background px-2 xl:flex" title="Semester aktif">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <select value={activeSemesterId || ""} onChange={(event) => setActiveSemesterId?.(event.target.value || null)} className="max-w-28 border-0 bg-transparent text-sm font-semibold outline-none"><option value="">Semester</option>{semesterOptions?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </label>
            </> : null}
            {notificationPath ? <Link to={notificationPath} title="Informasi dan pengumuman" className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Bell className="h-5 w-5" /></Link> : null}
            <div className="flex items-center gap-2 border-l pl-2 sm:pl-3">
              <div className="hidden max-w-40 text-right lg:block"><p className="truncate text-sm font-semibold leading-none">{employee?.full_name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{roleLabel}</p></div>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary">{employee?.photo_url ? <img src={employee.photo_url} alt="Foto profil" className="h-full w-full object-cover" /> : String(employee?.full_name || "P").charAt(0).toUpperCase()}</div>
              <button type="button" onClick={() => void onLogout()} title="Keluar" className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:flex"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8"><Outlet context={outletContext} /></div>
          <footer className="mt-auto border-t bg-card py-4 text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} TS Lab School. {portalLabel}.</footer>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card shadow-[0_-4px_18px_rgba(0,0,0,0.04)] md:hidden" aria-label="Navigasi cepat">
        {mobileItems.map((item) => renderNavItem(item, true))}
        <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-muted-foreground"><Menu className="h-5 w-5" /><span className="text-[10px] font-semibold">Menu</span></button>
      </nav>
    </div>
  );
};
