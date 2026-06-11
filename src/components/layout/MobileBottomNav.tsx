import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCurrentRoles } from "../../hooks/useAuth";
import { canAccessResource } from "../../lib/permissions";
import { navigationConfig } from "../../config/navigation";

export const MobileBottomNav: React.FC = () => {
  const { roles } = useCurrentRoles();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Flatten and filter items, taking only the first 4 for the bottom nav
  const flatItems = navigationConfig.flatMap(group => group.items);
  const visibleItems = flatItems.filter(item => 
    !item.resource || canAccessResource(roles, item.resource)
  ).slice(0, 4); // Only top 4 to fit comfortably

  if (visibleItems.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 px-2 pb-safe">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.title}
              to={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "fill-primary/20" : ""}`} />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
