import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, ChevronRight, Home, LayoutGrid, PanelLeftClose, PanelLeftOpen, Star, X } from "lucide-react";
import { getNavigationModuleMeta } from "../../config/navigation-module-meta";
import { BrandLogo } from "../common/BrandLogo";
import { useAdminNavigation } from "./AdminNavigationProvider";
import { FavoriteButton } from "./NavigationHub";
import { NavigationSearchTrigger } from "./NavigationSearch";
import type { NavigationItem } from "../../config/navigation";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  brand?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse, brand }) => {
  const { groups, activeHref, unitName, roleName, preferences, isLoading, setSearchOpen } = useAdminNavigation();
  const location = useLocation();
  const activeGroup = groups.find((group) => group.items.some((item) => item.href === activeHref));
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState(location.pathname);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  // Open the current module when the route changes, but allow the user to close it.
  if (lastPath !== location.pathname) { setLastPath(location.pathname); setOpenModule(activeGroup?.name || null); }
  const selectedModule = openModule === null ? activeGroup?.name : openModule;
  const byHref = useMemo(() => new Map(groups.flatMap((group) => group.items.map((item) => [item.href, item] as const))), [groups]);
  const favorites = preferences.favorites.flatMap((href) => byHref.has(href) ? [byHref.get(href)!] : []);
  const pinned = favorites.slice(0, 4);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => { setIsMobile(media.matches); if (!media.matches) onClose?.(); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [onClose]);
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input") || []).filter((element) => element.getClientRects().length);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") { event.preventDefault(); onClose?.(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [isOpen, isMobile, onClose]);

  const renderItem = (item: NavigationItem, pin = true) => {
    const Icon = item.icon;
    return <div key={item.href} className={`nav-sidebar-item ${activeHref === item.href ? "is-active" : ""}`}>
      <Link to={item.href} title={item.title} aria-current={activeHref === item.href ? "page" : undefined} onClick={onClose}><Icon size={17} aria-hidden="true" /><span>{item.title}</span></Link>
      {pin ? <FavoriteButton item={item} /> : null}
    </div>;
  };

  return <>
    {isOpen ? <button type="button" aria-label="Tutup menu utama" className="nav-sidebar-scrim md:hidden" onClick={onClose} /> : null}
    <aside ref={sidebarRef} className={`navigation-surface nav-sidebar ${isCollapsed ? "is-collapsed" : ""} ${isOpen ? "is-open" : ""}`} role={isMobile && isOpen ? "dialog" : undefined} aria-modal={isMobile && isOpen ? true : undefined} aria-label="Menu admin">
      <div className="nav-sidebar-brand">
        <div className="nav-expanded-only">{brand || <BrandLogo textClassName="text-base font-bold text-foreground" />}</div>
        <div className="nav-collapsed-only nav-brand-mark">TS</div>
        <button type="button" onClick={onToggleCollapse} aria-label={isCollapsed ? "Lebarkan sidebar" : "Ringkaskan sidebar"} title={isCollapsed ? "Lebarkan sidebar" : "Ringkaskan sidebar"} className="nav-icon-button nav-sidebar-collapse">{isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        <button type="button" onClick={onClose} aria-label="Tutup sidebar" className="nav-icon-button nav-mobile-only"><X size={20} /></button>
      </div>
      <div className="nav-sidebar-search"><NavigationSearchTrigger compact /></div>
      <nav className="nav-sidebar-scroll" aria-label="Navigasi utama">
        <Link to="/" aria-current={activeHref === "/" ? "page" : undefined} title="Beranda & pintasan" className={`nav-sidebar-home ${activeHref === "/" ? "is-active" : ""}`} onClick={onClose}><Home size={19} /><span className="nav-expanded-only">Beranda & pintasan</span></Link>
        <button type="button" className="nav-sidebar-home" title="Semua menu" onClick={() => { onClose?.(); setSearchOpen(true); }}><LayoutGrid size={19} /><span className="nav-expanded-only">Semua menu</span><span className="nav-count nav-expanded-only">{groups.reduce((total, group) => total + group.items.length, 0)}</span></button>
        {pinned.length ? <section className="nav-sidebar-pinned nav-expanded-only"><h2><Star size={14} />Favorit</h2>{pinned.map((item) => renderItem(item, false))}{favorites.length > 4 ? <Link to="/" className="nav-text-button" onClick={onClose}>Lihat semua ({favorites.length})</Link> : null}</section> : null}
        <div className="nav-sidebar-section-heading nav-expanded-only"><h2>Modul sekolah</h2><span>{groups.length}</span></div>
        {isLoading ? <p className="nav-note nav-expanded-only" role="status">Menyiapkan menu…</p> : groups.map((group, index) => {
          const meta = getNavigationModuleMeta(group);
          const Icon = meta.icon;
          const active = group.name === activeGroup?.name;
          const expanded = group.name === selectedModule;
          const items = group.items.filter((item) => item.href !== "/");
          if (!items.length) return null;
          return <section key={group.name} className="nav-sidebar-module">
            <button type="button" title={meta.title} aria-label={`${meta.title}, ${items.length} menu`} className={`nav-module-trigger ${active ? "is-active" : ""}`} aria-expanded={expanded && (!isCollapsed || isMobile)} aria-controls={expanded ? `sidebar-module-${index}` : undefined} onClick={() => { setOpenModule(isCollapsed && !isMobile ? group.name : expanded ? "" : group.name); if (isCollapsed && !isMobile) onToggleCollapse?.(); }}>
              <Icon size={19} aria-hidden="true" /><span className="nav-expanded-only">{meta.title}</span><small className="nav-expanded-only">{items.length}</small>{expanded ? <ChevronDown size={15} className="nav-expanded-only" /> : <ChevronRight size={15} className="nav-expanded-only" />}
            </button>
            {expanded ? <div id={`sidebar-module-${index}`} className="nav-module-items nav-expanded-only">{items.map((item) => renderItem(item))}</div> : null}
          </section>;
        })}
      </nav>
      <div className="nav-sidebar-footer nav-expanded-only"><strong>{unitName || "Lintas Unit"}</strong><span>{String(roleName || "Pengguna").replaceAll("_", " ")} · satu modul terbuka</span></div>
    </aside>
  </>;
};
