import React from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useCurrentRoles } from "../../hooks/useAuth";
import { canAccessResource } from "../../lib/permissions";
import { navigationConfig } from "../../config/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandLogo } from "../common/BrandLogo";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { useOne } from "@refinedev/core";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { roles } = useCurrentRoles();
  const location = useLocation();
  const { activeUnitId } = useCurrentUnit();

  const { data: unitData } = useOne({
    resource: "units",
    id: activeUnitId || "",
    queryOptions: { enabled: !!activeUnitId }
  });

  const unitName = unitData?.data?.name?.toLowerCase() || "";
  const isPaudUnit = unitName.includes("paud") || unitName.includes("tk") || unitName.includes("kb");

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 w-64 bg-primary text-primary-foreground flex-col h-screen shadow-lg border-r border-primary/20 transition-transform duration-300 ease-in-out md:translate-x-0 flex ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center justify-between px-6 bg-black/20 shrink-0">
          <BrandLogo textClassName="font-bold text-xl tracking-tight" />
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-primary-foreground/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      <ScrollArea className="flex-1">
        <nav className="px-4 py-6 space-y-6">
        {navigationConfig.map((group) => {
          // Hide PAUD module if active unit is not PAUD
          if (group.name === "Modul PAUD (KB/TK)" && !isPaudUnit && activeUnitId) {
            return null;
          }

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
                    onClick={() => {
                      if (onClose) onClose();
                    }}
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
    </>
  );
};
