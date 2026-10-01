/** Development-only UI fixture. Not a production route or authentication bypass. */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { Menu } from "lucide-react";
import { navigationConfig } from "../src/config/navigation";
import { getActiveNavigationHref, getVisibleNavigationGroups } from "../src/config/navigation-utils";
import { createNavigationPreferenceStore } from "../src/config/navigation-preferences";
import { AdminNavigationContext } from "../src/components/layout/AdminNavigationProvider";
import { Sidebar } from "../src/components/layout/Sidebar";
import { NavigationHub, NavigationShortcuts } from "../src/components/layout/NavigationHub";
import { NavigationSearch, NavigationSearchTrigger } from "../src/components/layout/NavigationSearch";
import { MobileBottomNav } from "../src/components/layout/MobileBottomNav";
import type { RoleName } from "../src/lib/permissions";
import "../src/index.css";
import "../src/components/layout/navigation.css";

function Preview() {
  const [role, setRole] = useState<RoleName>("super_admin");
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const groups = useMemo(() => getVisibleNavigationGroups(navigationConfig, [{ role, unit_id: null }]), [role]);
  const activeHref = getActiveNavigationHref(pathname, groups);
  const store = useMemo(() => createNavigationPreferenceStore(`preview-only-${role}`, new Set(navigationConfig.flatMap((group) => group.items.map((item) => item.href))), window.localStorage), [role]);
  const preferences = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { if (activeHref) store.remember(activeHref); }, [activeHref, store]);
  return <AdminNavigationContext.Provider value={{ groups: loading ? [] : groups, activeHref, roleName: role, unitName: "Lintas Unit", preferences, temporaryPreferences: store.isTemporary(), canPersonalize: true, toggleFavorite: store.toggleFavorite, searchOpen, setSearchOpen, isLoading: loading }}>
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar brand={<strong>TSLS Admin OS</strong>} isOpen={menuOpen} onClose={closeMenu} isCollapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
      <div className="flex min-w-0 flex-1 flex-col" inert={menuOpen}>
        <header className="navigation-surface flex min-h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-3">
          <button className="nav-icon-button nav-mobile-only" aria-label="Buka menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><NavigationSearchTrigger />
          <label className="text-xs">Peran uji <select aria-label="Peran uji" value={role} onChange={(event) => setRole(event.target.value as RoleName)} className="min-h-11 max-w-28 bg-card"><option value="super_admin">Admin</option><option value="admin_spmb">SPMB</option><option value="admin_keuangan">Keuangan</option><option value="guru">Guru</option></select></label>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-20 md:p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div><h1 className="text-2xl font-bold" style={{ overflowWrap: "anywhere" }}>Pratinjau navigasi admin</h1><p className="text-sm text-muted-foreground">Uji lokal komponen asli · bukan data sekolah. Rute dipilih: <output>{pathname}</output></p><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={loading} onChange={(event) => setLoading(event.target.checked)} />Uji menu sedang dimuat</label></div>
            <NavigationShortcuts /><NavigationHub />
          </div>
        </main>
      </div>
      <div inert={menuOpen}><MobileBottomNav onMenuClick={() => setMenuOpen(true)} /></div>
      <NavigationSearch onNavigate={closeMenu} />
    </div>
  </AdminNavigationContext.Provider>;
}
if (import.meta.env.DEV) {
  const root = import.meta.hot?.data.root || createRoot(document.getElementById("root")!);
  if (import.meta.hot) import.meta.hot.data.root = root;
  root.render(<MemoryRouter><Preview /></MemoryRouter>);
}
