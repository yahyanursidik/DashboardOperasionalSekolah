import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "sonner";

export const AdminLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
            <Outlet />
          </div>
          <footer className="w-full py-4 text-center text-xs text-muted-foreground mt-auto bg-card border-t shadow-sm">
            &copy; {new Date().getFullYear()} TS Lab School. Disusun oleh <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Yahya Nursidik</a>
          </footer>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};
