import React from "react";
import { Link, useLocation } from "react-router";
import { Info } from "lucide-react";
import type { PaudModeFilter, PaudUnit } from "../use-paud-scope";

const NAV = [
  { href: "/paud", label: "Pusat PAUD/TK" },
  { href: "/paud-activities", label: "Jurnal Observasi" },
  { href: "/stppa-assessments", label: "Asesmen Kurikulum Merdeka" },
  { href: "/curriculum/paud", label: "Kurikulum" },
  { href: "/lms", label: "Preschool HBL" },
];

const MODES: { value: PaudModeFilter; label: string }[] = [
  { value: "all", label: "Semua layanan" },
  { value: "reguler", label: "Reguler" },
  { value: "online", label: "Online / HBL" },
];

/** Section navigation plus the Reguler/Online filter shared by the admin PAUD pages. */
export const PaudScopeBar: React.FC<{
  mode: PaudModeFilter;
  onModeChange: (mode: PaudModeFilter) => void;
  units: PaudUnit[];
  activeIsPaud: boolean;
  activeIsOtherLevel: boolean;
  hasOnlineUnit: boolean;
}> = ({ mode, onModeChange, units, activeIsPaud, activeIsOtherLevel, hasOnlineUnit }) => {
  const { pathname } = useLocation();
  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap gap-1.5 border-b pb-3 text-sm">
        {NAV.map((item) => {
          const active = item.href === "/paud" ? pathname === "/paud" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href} className={`rounded-md px-3 py-2 ${active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-muted-foreground">Unit:</span>
          {units.length ? units.map((unit) => (
            <span key={unit.id} className={`rounded px-2 py-1 font-semibold ${unit.delivery_mode === "online" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
              {unit.name} · {unit.delivery_mode === "online" ? "Online" : "Reguler"}
            </span>
          )) : <span className="text-muted-foreground">Tidak ada unit PAUD/TK pada filter ini</span>}
        </div>
        {!activeIsPaud && hasOnlineUnit && (
          <div className="inline-flex rounded-md border bg-muted/40 p-1">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onModeChange(item.value)}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${mode === item.value ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {activeIsOtherLevel && (
        <div className="flex gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          <Info className="h-4 w-4 shrink-0" />
          Unit aktif bukan jenjang PAUD/TK. Halaman ini hanya menampilkan data unit Preschool (reguler dan HBL).
        </div>
      )}
    </div>
  );
};
