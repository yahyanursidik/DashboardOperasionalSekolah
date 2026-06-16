import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, GraduationCap } from "lucide-react";

export const SpmbLayout: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/spmb" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">Portal SPMB</span>
          </Link>

          <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-rose-600 transition-colors">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} TSLS OS. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
