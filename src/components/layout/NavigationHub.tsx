import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowUpRight, ChevronRight, Clock3, Search, Star, X } from "lucide-react";
import { filterNavigationGroups } from "../../config/navigation-utils";
import { FAVORITE_LIMIT, selectShortcutPaths } from "../../config/navigation-preferences";
import { getNavigationModuleMeta } from "../../config/navigation-module-meta";
import type { NavigationItem } from "../../config/navigation";
import { useAdminNavigation } from "./AdminNavigationProvider";

const suggestedPaths = ["/admissions/applicants", "/students", "/attendance/employees", "/schedules", "/finance/verifications", "/lms", "/calendar", "/tasks"];

export function FavoriteButton({ item }: { item: NavigationItem }) {
  const { preferences, toggleFavorite, canPersonalize } = useAdminNavigation();
  const favorite = preferences.favorites.includes(item.href);
  const full = !favorite && preferences.favorites.length >= FAVORITE_LIMIT;
  const label = !canPersonalize ? "Menyiapkan preferensi akun" : full ? `Maksimal ${FAVORITE_LIMIT} favorit; lepas satu terlebih dahulu` : favorite ? `Lepas ${item.title} dari favorit` : `Favoritkan ${item.title}`;
  return <button type="button" className={`nav-icon-button nav-favorite ${favorite ? "is-favorite" : ""}`} aria-label={label} title={label} aria-pressed={favorite} disabled={!canPersonalize || full} onClick={() => toggleFavorite(item.href)}><Star size={17} fill={favorite ? "currentColor" : "none"} /></button>;
}

function NavigationTile({ item, group }: { item: NavigationItem; group?: string }) {
  const Icon = item.icon;
  return <div className="nav-shortcut"><Link to={item.href} title={item.title} className="nav-shortcut-link"><Icon size={20} aria-hidden="true" /><div><span>{item.title}</span>{group ? <small>{group}</small> : null}</div><ArrowUpRight size={16} aria-hidden="true" /></Link><FavoriteButton item={item} /></div>;
}

export function NavigationShortcuts() {
  const { groups, preferences, temporaryPreferences, setSearchOpen, isLoading } = useAdminNavigation();
  const entries = groups.flatMap((group) => group.items.map((item) => ({ item, group: getNavigationModuleMeta(group).title })));
  const byHref = new Map(entries.map((entry) => [entry.item.href, entry]));
  const shortcuts = selectShortcutPaths(preferences, new Set(byHref.keys()), suggestedPaths).flatMap((path) => byHref.has(path) ? [byHref.get(path)!] : []);
  const recent = preferences.recent.filter((path) => byHref.has(path) && !shortcuts.some((entry) => entry.item.href === path)).slice(0, 4);
  const hasFavorites = preferences.favorites.some((path) => byHref.has(path));
  return <section className="navigation-surface nav-shortcuts-section" aria-labelledby="nav-shortcuts-title">
    <div className="nav-section-heading"><div><h2 id="nav-shortcuts-title">{hasFavorites ? "Pintasan Anda" : "Mulai dari sini"}</h2><p>{hasFavorites ? "Menu favorit, siap dibuka tanpa menelusuri sidebar." : "Pilih bintang pada menu yang sering dipakai untuk membuat pintasan sendiri."}</p></div><button type="button" className="nav-text-button" onClick={() => setSearchOpen(true)}><Search size={16} />Cari semua menu</button></div>
    {isLoading ? <p className="nav-note" role="status">Menyiapkan pintasan sesuai hak akses…</p> : <div className="nav-shortcut-grid">{shortcuts.map((entry) => <NavigationTile key={entry.item.href} {...entry} />)}</div>}
    {recent.length ? <div className="nav-recent-row"><span><Clock3 size={16} />Terakhir dibuka</span>{recent.map((path) => <Link key={path} to={path} title={byHref.get(path)!.item.title}>{byHref.get(path)!.item.title}</Link>)}</div> : null}
    {temporaryPreferences ? <p className="nav-note" role="status">Penyimpanan browser tidak tersedia. Favorit tetap bisa dipakai selama sesi ini.</p> : <p className="nav-note">Favorit disimpan untuk akun Anda di browser ini, bukan sebagai perubahan hak akses.</p>}
  </section>;
}

export function NavigationHub() {
  const { groups, isLoading } = useAdminNavigation();
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const selectModule = (name: string | null) => { focusOnChange.current = true; setSelectedModule(name); };
  useEffect(() => {
    if (!focusOnChange.current) return;
    (selectedModule ? detailHeading.current : heading.current)?.focus();
    focusOnChange.current = false;
  }, [selectedModule]);
  const filtered = useMemo(() => filterNavigationGroups(groups, search, (group) => [getNavigationModuleMeta(group).title]), [groups, search]);
  const selected = groups.find((group) => group.name === selectedModule);
  const searching = Boolean(search.trim());
  const displayed = searching ? filtered : selected ? [selected] : [];
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  return <section id="feature-directory" className="navigation-surface nav-hub" aria-labelledby="feature-directory-title">
    <div className="nav-section-heading"><div><h2 ref={heading} tabIndex={-1} id="feature-directory-title">Jelajahi modul</h2><p>{isLoading ? "Menyiapkan modul sesuai hak akses…" : `${count} menu dalam ${groups.length} modul. Buka satu modul atau cari langsung nama fiturnya.`}</p></div><div className="nav-hub-search"><label className="sr-only" htmlFor="nav-hub-query">Cari fitur di semua modul</label><Search size={18} aria-hidden="true" /><input id="nav-hub-query" value={search} placeholder="Cari fitur di semua modul…" onChange={(event) => setSearch(event.target.value)} /><button type="button" className="nav-icon-button" aria-label="Hapus pencarian fitur" disabled={!search} onClick={() => setSearch("")}><X size={16} /></button></div></div>
    {isLoading ? <p className="nav-note" role="status">Memuat menu…</p> : !searching && !selected ? <div className="nav-module-grid">{groups.map((group) => { const meta = getNavigationModuleMeta(group); const Icon = meta.icon; return <button key={group.name} type="button" className="nav-module-card" onClick={() => selectModule(group.name)} aria-label={`Buka modul ${meta.title}, ${group.items.length} menu`}><div className="nav-module-card-heading"><Icon size={20} aria-hidden="true" /><span>{meta.title}</span><ChevronRight size={18} aria-hidden="true" /></div><p>{meta.description}</p><small>{group.items.length} menu · {group.items.slice(0, 2).map((item) => item.title).join(", ")}</small></button>; })}</div> : <>
      <div className="nav-module-toolbar"><button type="button" className="nav-text-button" onClick={() => { setSearch(""); selectModule(null); }}><ArrowLeft size={16} />Semua modul</button><p role="status">{searching ? `${filtered.reduce((sum, group) => sum + group.items.length, 0)} menu ditemukan` : selected && getNavigationModuleMeta(selected).title}</p></div>
      {displayed.map((group) => <div key={group.name} className="nav-module-detail"><h3 ref={detailHeading} tabIndex={-1}>{getNavigationModuleMeta(group).title}<span>{group.items.length} menu</span></h3><div className="nav-shortcut-grid">{group.items.map((item) => <NavigationTile key={item.href} item={item} />)}</div></div>)}
      {!displayed.length ? <div className="nav-empty"><Search size={24} aria-hidden="true" /><strong>Fitur tidak ditemukan</strong><p>Gunakan nama proses, misalnya pendaftar, tagihan, atau izin.</p><button className="nav-text-button" type="button" onClick={() => setSearch("")}>Hapus pencarian</button></div> : null}
    </>}
  </section>;
}
