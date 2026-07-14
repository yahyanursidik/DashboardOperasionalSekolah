import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { roles } = useCurrentRoles();
  const location = useLocation();
  const { activeUnitId } = useCurrentUnit();
  
  // State to track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: unitData } = useOne({
    resource: "units",
    id: activeUnitId || "",
    queryOptions: { enabled: !!activeUnitId }
  });

  const unitName = unitData?.data?.name?.toLowerCase() || "";
  const isPaudUnit = unitName.includes("paud") || unitName.includes("tk") || unitName.includes("kb");

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  // Auto-expand group that contains active link on initial load
  useEffect(() => {
    const newExpandedState: Record<string, boolean> = { ...expandedGroups };
    let hasChanges = false;
    
    navigationConfig.forEach((group) => {
      // Check if any item in this group is active
      const hasActiveItem = group.items.some(item => isActive(item.href));
      if (hasActiveItem && !expandedGroups[group.name]) {
        newExpandedState[group.name] = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setExpandedGroups(newExpandedState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

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
      <aside className={`fixed md:sticky top-0 left-0 z-50 bg-card text-card-foreground flex-col h-screen border-r shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out md:translate-x-0 flex overflow-hidden ${isCollapsed ? "md:w-20" : "md:w-64"} w-64 ${isOpen ? "translate-x-0" : "-translate-x-[110%]"}`}>
        <div className={`h-16 flex items-center justify-between bg-transparent shrink-0 border-b transition-all ${isCollapsed ? "px-6 md:justify-center md:px-3" : "px-6"}`}>
          <div className={`${isCollapsed ? "md:hidden" : "block"}`}>
            <BrandLogo textClassName="font-bold text-xl tracking-tight text-foreground" />
          </div>
          <div className={`${isCollapsed ? "hidden md:flex" : "hidden"} w-10 h-10 rounded-xl bg-primary/10 text-primary items-center justify-center font-bold`}>
            TS
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
            aria-label={isCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      <ScrollArea className="flex-1">
        <nav className={`${isCollapsed ? "md:px-2" : "px-3"} px-3 py-6 space-y-4`}>
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

          const isExpanded = isCollapsed ? true : expandedGroups[group.name];
          const hasActiveChild = visibleItems.some(item => isActive(item.href));

          return (
            <div key={group.name} className="space-y-1.5">
              <button 
                onClick={() => toggleGroup(group.name)}
                className={`w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] rounded-lg transition-colors hover:text-foreground group ${isCollapsed ? "hidden md:flex md:justify-center md:px-1" : "flex"} ${hasActiveChild && !isExpanded ? 'text-primary' : 'text-muted-foreground/70'}`}
                title={group.name}
              >
                <span className={isCollapsed ? "md:hidden" : ""}>{group.name}</span>
                {isCollapsed ? (
                  <span className="hidden md:block w-8 border-t border-border" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              
              <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const itemIsActive = isActive(item.href);
                  return (
                    <Link
                      key={item.title}
                      to={item.href}
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                      title={isCollapsed ? item.title : undefined}
                      className={`group flex items-center rounded-lg transition-all text-sm mx-1 ${isCollapsed ? "md:justify-center md:gap-0 md:px-2 md:py-3" : "gap-3 px-3 py-2.5"} ${
                        itemIsActive
                          ? "bg-primary/10 text-primary font-bold shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${itemIsActive ? 'text-primary scale-110' : 'group-hover:scale-110 group-hover:text-foreground'}`} />
                      <span className={`transition-all duration-200 ${isCollapsed ? "md:hidden" : ""} ${itemIsActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        </nav>
      </ScrollArea>
    </aside>
    </>
  );
};
