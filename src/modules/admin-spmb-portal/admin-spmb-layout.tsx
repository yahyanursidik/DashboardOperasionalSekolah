import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { GraduationCap, Users, LayoutDashboard, Settings, LogOut, FileText } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { BrandLogo } from "../../components/common/BrandLogo";

export const AdminSpmbLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { appName } = useSystemSettings();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session) {
        navigate("/admin-spmb/login");
        return;
      }

      // Load employee data
      const { data: empData } = await supabaseClient
        .from("employees")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .single();

      if (empData) {
        setEmployee(empData);
      } else {
        setEmployee({ full_name: session.user.user_metadata?.full_name || "Admin SPMB", role: "admin_spmb" });
      }
    };

    fetchSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/admin-spmb/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/admin-spmb", icon: LayoutDashboard },
    { name: "Pendaftar", path: "/admin-spmb/applicants", icon: Users },
    { name: "Laporan", path: "/admin-spmb/reports", icon: FileText },
    { name: "Pengaturan", path: "/admin-spmb/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-indigo-700 text-white hidden md:flex flex-col h-screen sticky top-0 shadow-xl z-20">
        <div className="h-16 flex items-center px-6 bg-indigo-800/50 shrink-0">
          <BrandLogo textClassName="font-bold text-xl tracking-tight text-white" />
        </div>
        
        <div className="p-4 border-b border-indigo-600/50 bg-indigo-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
              {employee?.full_name?.charAt(0) || "A"}
            </div>
            <div>
              <p className="font-semibold text-sm truncate w-40">{employee?.full_name || "Memuat..."}</p>
              <p className="text-xs text-indigo-200">Portal Admin SPMB</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin-spmb' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-medium ${
                  isActive 
                    ? "bg-white text-indigo-700 shadow-md" 
                    : "text-indigo-50 hover:bg-indigo-600/50 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-indigo-800/30 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-xl transition-all text-sm font-medium text-indigo-100 hover:bg-red-500/20 hover:text-red-100"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-indigo-700 text-white h-16 flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold">{appName || "Admin SPMB"}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-indigo-100 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex-1">
            <Outlet />
          </div>
          <footer className="mt-8 text-center text-xs text-muted-foreground w-full pb-4 md:pb-8">
            &copy; {new Date().getFullYear()} TS Lab School. Sistem Penerimaan Siswa Baru.<br/>
            Disusun oleh <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium">Yahya Nursidik</a>
          </footer>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin-spmb' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center py-3 px-1 w-full relative ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {isActive && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full"></div>}
                  <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px] text-indigo-600' : ''}`} />
                  <span className="text-[9px] font-medium truncate w-full text-center">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
