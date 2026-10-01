import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, Search, Star, X } from "lucide-react";
import { filterNavigationGroups } from "../../config/navigation-utils";
import { getNavigationModuleMeta } from "../../config/navigation-module-meta";
import { useAdminNavigation } from "./AdminNavigationProvider";

export function NavigationSearchTrigger({ compact = false }: { compact?: boolean }) {
  const { setSearchOpen } = useAdminNavigation();
  return <button type="button" className={`nav-search-trigger ${compact ? "nav-search-trigger--compact" : ""}`} onClick={() => setSearchOpen(true)} aria-label="Cari semua menu (Ctrl K)"><Search size={18} aria-hidden="true" /><span>Cari menu atau fitur</span><kbd>Ctrl K</kbd></button>;
}

export function NavigationSearch({ onNavigate }: { onNavigate?: () => void }) {
  const { groups, preferences, searchOpen, setSearchOpen, isLoading } = useAdminNavigation();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = useMemo(() => {
    const filtered = filterNavigationGroups(groups, query, (group) => [getNavigationModuleMeta(group).title]);
    const entries = filtered.flatMap((group) => group.items.map((item) => ({ item, group: getNavigationModuleMeta(group).title })));
    if (query.trim()) return entries;
    const priority = [...preferences.favorites, ...preferences.recent];
    return entries.sort((a, b) => {
      const rank = (href: string) => { const index = priority.indexOf(href); return index < 0 ? priority.length : index; };
      return rank(a.item.href) - rank(b.item.href);
    });
  }, [groups, preferences, query]);
  const activeIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));
  const choose = (href: string) => { setSearchOpen(false); onNavigate?.(); navigate(href); };
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.altKey) {
        event.preventDefault(); setSearchOpen(!searchOpen);
      }
    };
    document.addEventListener("keydown", toggle);
    return () => document.removeEventListener("keydown", toggle);
  }, [searchOpen, setSearchOpen]);
  useEffect(() => {
    if (searchOpen && !dialog.current?.open) { dialog.current?.showModal(); input.current?.focus(); }
    else if (!searchOpen && dialog.current?.open) dialog.current.close();
  }, [searchOpen]);
  useEffect(() => { if (searchOpen) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" }); }, [activeIndex, listId, query, searchOpen]);
  return <dialog ref={dialog} className="nav-search-dialog navigation-surface" aria-labelledby={`${listId}-title`} onCancel={() => setSearchOpen(false)} onClose={() => { setSearchOpen(false); setQuery(""); setSelectedIndex(0); }} onClick={(event) => { if (event.target === dialog.current) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setSearchOpen(false); } }}>
    <div className="nav-search-heading"><h2 id={`${listId}-title`}>Ke mana Anda ingin pergi?</h2><button className="nav-icon-button" type="button" aria-label="Tutup pencarian" onClick={() => setSearchOpen(false)}><X size={20} /></button></div>
    <div className="nav-search-field"><Search size={20} aria-hidden="true" /><input ref={input} aria-label="Cari semua menu" placeholder="Contoh: pendaftar, izin, pembayaran…" role="combobox" aria-controls={listId} aria-expanded="true" aria-autocomplete="list" aria-activedescendant={results.length ? `${listId}-${activeIndex}` : undefined} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={(event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); if (results.length) setSelectedIndex((activeIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length); }
      if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex].item.href); }
    }} /><button className="nav-icon-button" type="button" aria-label="Hapus pencarian" disabled={!query} onClick={() => { setQuery(""); setSelectedIndex(0); input.current?.focus(); }}><X size={16} /></button></div>
    <p className="nav-search-summary" role="status">{isLoading ? "Menyiapkan menu sesuai hak akses…" : `${results.length} menu${query.trim() ? " ditemukan" : " tersedia · favorit dan terbaru di atas"}`}</p>
    <div className="nav-search-results" id={listId} role="listbox" aria-label="Hasil pencarian menu">
      {results.map(({ item, group }, index) => { const Icon = item.icon; return <div key={item.href} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex} className="nav-search-result" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item.href)}>
        <Icon size={18} aria-hidden="true" /><div className="nav-search-result-copy"><span>{item.title}</span><small>{group}</small></div>{preferences.favorites.includes(item.href) ? <Star size={15} fill="currentColor" aria-label="Favorit" /> : <ArrowUpRight size={16} aria-hidden="true" />}
      </div>; })}
      {!isLoading && !results.length ? <div className="nav-empty"><Search size={24} aria-hidden="true" /><strong>Menu tidak ditemukan</strong><p>Coba nama kegiatan seperti absensi, siswa, atau keuangan.</p><button className="nav-text-button" type="button" onClick={() => { setQuery(""); input.current?.focus(); }}>Tampilkan semua menu</button></div> : null}
    </div>
    <div className="nav-search-footer"><span>↑ ↓ pilih · Enter buka</span><span>Esc tutup</span></div>
  </dialog>;
}
