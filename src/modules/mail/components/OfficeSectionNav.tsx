import React from "react";
import { useList } from "@refinedev/core";
import { Link, useLocation } from "react-router-dom";
import { Archive, Building2, ClipboardCheck, FileCog, Gauge, Inbox, Send, Workflow } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useCurrentRoles } from "../../../hooks/useAuth";

const items = [
  { label: "Ringkasan", path: "/mail", icon: Gauge, exact: true },
  { label: "Surat Masuk", path: "/mail/incoming", icon: Inbox },
  { label: "Surat Keluar", path: "/mail/outgoing", icon: Send },
  { label: "Disposisi", path: "/mail/dispositions", icon: Workflow },
  { label: "Arsip Digital", path: "/documents", icon: Archive, exact: true },
  { label: "Retensi & Kepatuhan", path: "/documents/governance", icon: ClipboardCheck },
  { label: "Jenis Dokumen", path: "/document-types", icon: FileCog },
];

export const OfficeSectionNav: React.FC = () => {
  const location = useLocation();
  const { activeUnitId, setActiveUnitId, availableUnits } = useCurrentUnit();
  const { roles } = useCurrentRoles();
  const { data } = useList<{ id: string; name: string }>({ resource: "units", pagination: { mode: "off" }, sorters: [{ field: "name", order: "asc" }] });
  const canConsolidate = Boolean(roles?.some((scope) => ["super_admin", "ketua_yayasan"].includes(scope.role) || (scope.unit_id === null && ["kepala_tu", "admin_tu", "admin_dokumen"].includes(scope.role))));
  const allowed = new Set(availableUnits);
  const units = (data?.data || []).filter((unit) => canConsolidate || allowed.has(unit.id));

  return <div className="space-y-3">
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-bold">Ruang lingkup administrasi</p><p className="text-xs text-muted-foreground">Agenda, disposisi, arsip, dan retensi mengikuti unit yang dipilih.</p></div><label className="flex min-w-0 items-center gap-2 sm:w-72"><Building2 className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="sr-only">Unit administrasi</span><select value={activeUnitId || ""} onChange={(event) => setActiveUnitId(event.target.value || null)} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm font-semibold">{canConsolidate && <option value="">Konsolidasi Semua Unit</option>}{!canConsolidate && !activeUnitId && <option value="">Pilih unit kerja</option>}{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label></div>
    <nav aria-label="Navigasi administrasi sekolah" className="overflow-x-auto border-b"><div className="flex min-w-max gap-1 px-1">{items.map((item) => { const active = item.exact ? location.pathname === item.path : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`); const Icon = item.icon; return <Link key={item.path} to={item.path} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</div></nav>
  </div>;
};
