import React from "react";
import { Outlet } from "react-router-dom";

export const CbtPortalLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg">
              T
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">TSLS CBT System</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Computer Based Test</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <Outlet />
      </main>

      <footer className="py-6 text-center text-sm text-slate-400 bg-white border-t mt-auto">
        &copy; {new Date().getFullYear()} TS Lab School. Sistem Ujian Online Terpadu.
      </footer>
    </div>
  );
};
