import React, { Suspense, useCallback, useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { AdminPanelGate, AdminRouteGuard } from "../auth/AdminRouteGuard";
import { PageLoader } from "../common/PageLoader";
import { AdminNavigationProvider } from "./AdminNavigationProvider";
import { NavigationSearch } from "./NavigationSearch";
import "./navigation.css";

export const AdminLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("admin-sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("admin-sidebar-collapsed", String(next)); }
      catch { /* Navigation remains available in restricted/private browsing. */ }
      return next;
    });
  };
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  return (
    <AdminPanelGate>
      <AdminNavigationProvider>
      <div className="flex h-dvh bg-background overflow-hidden">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
        <div className="flex-1 flex flex-col min-w-0" inert={isMobileMenuOpen}>
          <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
              <AdminRouteGuard>
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </AdminRouteGuard>
            </div>
            <footer className="w-full py-4 text-center text-xs text-muted-foreground mt-auto bg-card border-t shadow-sm">
              &copy; {new Date().getFullYear()} TS Lab School. Disusun oleh <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Yahya Nursidik</a>
            </footer>
          </main>
        </div>
        <div inert={isMobileMenuOpen}><MobileBottomNav onMenuClick={() => setIsMobileMenuOpen(true)} /></div>
        <NavigationSearch onNavigate={closeMobileMenu} />
      </div>
      </AdminNavigationProvider>
    </AdminPanelGate>
  );
};
