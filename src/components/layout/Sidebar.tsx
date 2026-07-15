/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Star,
  X,
} from "lucide-react";
import { useOne } from "@refinedev/core";
import { navigationConfig, type NavigationItem } from "../../config/navigation";
import {
  filterNavigationGroups,
  getActiveNavigationHref,
  getVisibleNavigationGroups,
} from "../../config/navigation-utils";
import { useCurrentRoles } from "../../hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandLogo } from "../common/BrandLogo";
import { useCurrentUnit } from "../../app/providers/UnitProvider";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const EXPANDED_STORAGE_KEY = "admin-sidebar-expanded-groups";
const FAVORITES_STORAGE_KEY = "admin-sidebar-favorites";
const RECENT_STORAGE_KEY = "admin-sidebar-recent";

function readStoredStringArray(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch { return []; }
}

function readExpandedGroups() {
  if (typeof window === "undefined") return { "Operasional Harian": true };
  try {
    const value = JSON.parse(window.localStorage.getItem(EXPANDED_STORAGE_KEY) || "{}");
    return Object.keys(value).length ? value : { "Operasional Harian": true };
  } catch { return { "Operasional Harian": true }; }
}

function formatRoleName(role?: string) {
  const labels: Record<string, string> = {
    super_admin: "Super Admin", ketua_yayasan: "Ketua Yayasan", kepsek: "Kepala Sekolah",
    wakasek: "Wakil Kepala Sekolah", kepala_tu: "Kepala Tata Usaha", admin_tu: "Admin Tata Usaha",
    admin_sekolah: "Admin Sekolah", admin_unit: "Admin Unit", admin_keuangan: "Admin Keuangan",
    admin_dokumen: "Admin Dokumen", admin_spmb: "Admin SPMB", operator_absensi: "Operator Absensi",
    guru: "Guru", wali_kelas: "Wali Kelas", hrd: "HRD",
  };
  return labels[role || ""] || String(role || "Pengguna").replace(/_/g, " ");
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { roles } = useCurrentRoles();
  const location = useLocation();
  const { activeUnitId } = useCurrentUnit();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(readExpandedGroups);
  const [favorites, setFavorites] = useState<string[]>(() => readStoredStringArray(FAVORITES_STORAGE_KEY));
  const [recent, setRecent] = useState<string[]>(() => readStoredStringArray(RECENT_STORAGE_KEY));
  const [search, setSearch] = useState("");

  const { data: unitData } = useOne({ resource: "units", id: activeUnitId || "", queryOptions: { enabled: Boolean(activeUnitId) } });
  const unitName = String(unitData?.data?.name || "");
  const normalizedUnitName = unitName.toLowerCase();
  const isPaudUnit = ["paud", "tk", "kb", "preschool"].some((name) => normalizedUnitName.includes(name));

  const visibleGroups = useMemo(
    () => getVisibleNavigationGroups(navigationConfig, roles, { activeUnitId, isPaudUnit }),
    [activeUnitId, isPaudUnit, roles],
  );
  const displayedGroups = useMemo(() => filterNavigationGroups(visibleGroups, search), [search, visibleGroups]);
  const allVisibleItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const itemByHref = useMemo(() => new Map(allVisibleItems.map((item) => [item.href, item])), [allVisibleItems]);
  const activeHref = getActiveNavigationHref(location.pathname, visibleGroups);

  const quickItems = useMemo(() => {
    const hrefs = [...favorites, ...recent.filter((href) => !favorites.includes(href))].slice(0, 5);
    return hrefs.map((href) => itemByHref.get(href)).filter(Boolean) as NavigationItem[];
  }, [favorites, itemByHref, recent]);

  useEffect(() => {
    const activeGroup = visibleGroups.find((group) => group.items.some((item) => item.href === activeHref));
    if (!activeGroup) return;
    setExpandedGroups((current) => current[activeGroup.name] ? current : { ...current, [activeGroup.name]: true });
  }, [activeHref, visibleGroups]);

  useEffect(() => {
    if (isCollapsed) setSearch("");
  }, [isCollapsed]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((current) => {
      const next = { ...current, [groupName]: !current[groupName] };
      window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = (href: string) => {
    setFavorites((current) => {
      const next = current.includes(href) ? current.filter((item) => item !== href) : [...current, href];
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const rememberRecent = (href: string) => {
    setRecent((current) => {
      const next = [href, ...current.filter((item) => item !== href)].slice(0, 5);
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    onClose?.();
  };

  const renderItem = (item: NavigationItem, allowPin = true) => {
    const Icon = item.icon;
    const active = item.href === activeHref;
    const favorite = favorites.includes(item.href);
    return (
      <div key={item.href} className={`group/item mx-1 flex items-center rounded-md ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
        <Link
          to={item.href}
          onClick={() => rememberRecent(item.href)}
          title={isCollapsed ? item.title : undefined}
          className={`flex min-w-0 flex-1 items-center text-sm ${isCollapsed ? "md:justify-center md:px-2 md:py-3" : "gap-3 px-3 py-2.5"} ${active ? "font-bold" : "font-medium"}`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
          <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>{item.title}</span>
        </Link>
        {allowPin ? (
          <button
            type="button"
            onClick={() => toggleFavorite(item.href)}
            title={favorite ? "Lepas dari favorit" : "Tambahkan ke favorit"}
            aria-label={favorite ? `Lepas ${item.title} dari favorit` : `Favoritkan ${item.title}`}
            className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-opacity ${isCollapsed ? "md:hidden" : ""} ${favorite ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover/item:opacity-100 focus:opacity-100"}`}
          >
            <Star className="h-3.5 w-3.5" fill={favorite ? "currentColor" : "none"} />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {isOpen ? <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} /> : null}
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden border-r bg-card text-card-foreground shadow-sm transition-all duration-200 md:sticky md:translate-x-0 ${isCollapsed ? "md:w-20" : "md:w-72"} ${isOpen ? "translate-x-0" : "-translate-x-[110%]"}`}>
        <div className={`flex h-16 shrink-0 items-center justify-between border-b ${isCollapsed ? "px-3 md:justify-center" : "px-5"}`}>
          <div className={isCollapsed ? "md:hidden" : "block"}><BrandLogo textClassName="text-lg font-bold text-foreground" /></div>
          {isCollapsed ? <div className="hidden h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-bold text-primary md:flex">TS</div> : null}
          <button type="button" onClick={onToggleCollapse} title={isCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} aria-label={isCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:flex">
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup sidebar" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"><X className="h-5 w-5" /></button>
        </div>

        <div className={`border-b p-3 ${isCollapsed ? "md:hidden" : ""}`}>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari menu atau fitur..." className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              {search ? <button type="button" onClick={() => setSearch("")} title="Hapus pencarian" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button> : null}
            </label>
            {search ? <p className="mt-2 px-1 text-[11px] text-muted-foreground">{displayedGroups.reduce((total, group) => total + group.items.length, 0)} tujuan ditemukan</p> : null}
        </div>

        <ScrollArea className="flex-1">
          <nav className={`space-y-4 py-4 ${isCollapsed ? "px-2" : "px-3"}`} aria-label="Navigasi utama">
            {!search && quickItems.length ? (
              <div className="space-y-1">
                <div className={`flex items-center justify-between px-3 py-1.5 ${isCollapsed ? "md:hidden" : ""}`}><p className="text-[11px] font-bold uppercase text-muted-foreground">Akses Cepat</p><span className="text-[10px] text-muted-foreground">favorit & terbaru</span></div>
                {isCollapsed ? <div className="mx-2 hidden border-t md:block" /> : null}
                {quickItems.map((item) => renderItem(item, false))}
              </div>
            ) : null}

            {displayedGroups.map((group) => {
              const expanded = Boolean(search) || isCollapsed || expandedGroups[group.name];
              const hasActiveChild = group.items.some((item) => item.href === activeHref);
              return (
                <section key={group.name} className="space-y-1">
                  {isCollapsed ? <div className="mx-2 hidden border-t md:block" title={group.name} /> : null}
                  <button type="button" onClick={() => toggleGroup(group.name)} aria-expanded={expanded} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[11px] font-bold uppercase text-muted-foreground hover:bg-muted/50 hover:text-foreground ${isCollapsed ? "md:hidden" : ""} ${hasActiveChild ? "text-primary" : ""}`}>
                      <span className="truncate">{group.name}</span>
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  {expanded ? <div className="space-y-1">{group.items.map((item) => renderItem(item))}</div> : null}
                </section>
              );
            })}

            {displayedGroups.length === 0 ? <div className="px-4 py-10 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">Menu tidak ditemukan</p><p className="mt-1 text-xs text-muted-foreground">Coba kata seperti siswa, absensi, rapor, atau keuangan.</p></div> : null}
          </nav>
        </ScrollArea>

        <div className={`shrink-0 border-t bg-muted/20 p-3 ${isCollapsed ? "md:hidden" : ""}`}>
            <p className="truncate text-xs font-bold text-foreground">{unitName || (activeUnitId ? "Unit aktif" : "Lintas Unit")}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{formatRoleName(roles?.[0]?.role)}{roles && roles.length > 1 ? ` +${roles.length - 1} peran` : ""}</p>
        </div>
      </aside>
    </>
  );
};
