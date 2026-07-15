import React from "react";
import { BookOpen, ClipboardCheck, FileText, LayoutDashboard, Palette, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/curriculum", label: "Ringkasan", icon: LayoutDashboard, end: true },
  { to: "/curriculum/quality", label: "Kendali Mutu", icon: ClipboardCheck },
  { to: "/curriculum/subjects", label: "Kurikulum SD", icon: BookOpen, end: true },
  { to: "/curriculum/paud", label: "Kurikulum PAUD", icon: Palette },
  { to: "/curriculum/subjects/directory", label: "Guru Pengampu", icon: Users },
  { to: "/curriculum/documents", label: "Lampiran", icon: FileText },
];

export const CurriculumSectionNav: React.FC = () => (
  <nav aria-label="Navigasi modul kurikulum" className="overflow-x-auto border-b">
    <div className="flex min-w-max gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `inline-flex min-h-11 items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);

