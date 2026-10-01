import React from "react";
import { Link } from "react-router";
import { getMobileNavigationItems } from "../../config/navigation-utils";
import { useAdminNavigation } from "./AdminNavigationProvider";
import { Menu } from "lucide-react";

export const MobileBottomNav: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const { groups, activeHref } = useAdminNavigation();
  const visibleItems = getMobileNavigationItems(groups, 4);

  if (!visibleItems.length) return null;

  return (
    <nav className="navigation-surface fixed bottom-0 left-0 right-0 z-30 border-t bg-background px-2 pb-safe md:hidden" aria-label="Navigasi cepat">
      <div className="flex h-16 items-center justify-around">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;
          return (
            <Link key={item.href} to={item.href} title={item.title} aria-label={item.title} aria-current={active ? "page" : undefined} className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-5 w-5" />
              <span className="w-full truncate text-center text-[10px] font-semibold leading-none">{item.title}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onMenuClick} className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-muted-foreground" aria-label="Buka semua modul"><Menu className="h-5 w-5" /><span className="text-[10px] font-semibold">Menu</span></button>
      </div>
    </nav>
  );
};
