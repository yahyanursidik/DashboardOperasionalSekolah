import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { navigationConfig } from "../../config/navigation";
import {
  getActiveNavigationHref,
  getMobileNavigationItems,
  getVisibleNavigationGroups,
} from "../../config/navigation-utils";
import { useCurrentRoles } from "../../hooks/useAuth";
import { useCurrentUnit } from "../../app/providers/UnitProvider";

export const MobileBottomNav: React.FC = () => {
  const { roles } = useCurrentRoles();
  const location = useLocation();
  const { activeUnitId } = useCurrentUnit();
  const { data: unitData } = useOne({
    resource: "units",
    id: activeUnitId || "",
    queryOptions: { enabled: Boolean(activeUnitId) },
  });

  const unitName = String(unitData?.data?.name || "").toLowerCase();
  const isPaudUnit = ["paud", "tk", "kb", "preschool"].some((term) => unitName.includes(term));
  const groups = getVisibleNavigationGroups(navigationConfig, roles, { activeUnitId, isPaudUnit });
  const visibleItems = getMobileNavigationItems(groups);
  const activeHref = getActiveNavigationHref(location.pathname, groups);

  if (!visibleItems.length) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden" aria-label="Navigasi cepat">
      <div className="flex h-16 items-center justify-around">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;
          return (
            <Link key={item.href} to={item.href} aria-current={active ? "page" : undefined} className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-5 w-5" />
              <span className="w-full truncate text-center text-[10px] font-semibold leading-none">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
