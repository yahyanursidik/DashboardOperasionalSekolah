import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCurrentRoles } from "../../hooks/useAuth";
import { canAccessResource } from "../../lib/permissions";
import { navigationConfig } from "../../config/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Sidebar: React.FC = () => {
  const { roles } = useCurrentRoles();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-primary text-primary-foreground hidden md:flex flex-col h-screen sticky top-0 shadow-lg border-r border-primary/20">
      <div className="h-16 flex items-center px-6 font-bold text-xl tracking-tight bg-black/20 shrink-0">
        TSLS Admin OS
      </div>
      <ScrollArea className="flex-1">
        <nav className="px-4 py-6 space-y-6">
        {navigationConfig.map((group) => {
          // Filter items based on permissions
          const visibleItems = group.items.filter(item => 
            !item.resource || canAccessResource(roles, item.resource)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.name} className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-primary-foreground/60 uppercase tracking-wider mb-2">
                {group.name}
              </h3>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium ${
                      isActive(item.href)
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
        </nav>
      </ScrollArea>
    </aside>
  );
};
