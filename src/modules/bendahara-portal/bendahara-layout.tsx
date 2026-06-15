import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Wallet, Receipt, CheckCircle, CreditCard, Users, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { BrandLogo } from "../../components/common/BrandLogo";

export const BendaharaLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl } = useSystemSettings();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session) {
        navigate("/bendahara/login");
        return;
      }

      // Load employee data based on user_id (assume they are employees with bendahara role or just check session)
      const { data: empData } = await supabaseClient
        .from("employees")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .single();

      if (empData) {
        setEmployee(empData);
      } else {
        // Fallback for demo or superadmin
        setEmployee({ full_name: session.user.user_metadata?.full_name || "Bendahara", role: "bendahara" });
      }
    };

    fetchSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/bendahara/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/bendahara", icon: LayoutDashboard },
    { name: "Tagihan SPP", path: "/bendahara/invoices", icon: Receipt },
    { name: "Verifikasi", path: "/bendahara/verifications", icon: CheckCircle },
    { name: "Pengeluaran", path: "/bendahara/expenses", icon: CreditCard },
    { name: "Data Siswa", path: "/bendahara/students", icon: Users },
    { name: "Pengaturan", path: "/bendahara/categories", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-emerald-700 text-white hidden md:flex flex-col h-screen sticky top-0 shadow-xl z-20">
        <div className="h-16 flex items-center px-6 bg-emerald-800/50 shrink-0">
          <BrandLogo textClassName="font-bold text-xl tracking-tight text-white" />
        </div>
        
        <div className="p-4 border-b border-emerald-600/50 bg-emerald-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              {employee?.full_name?.charAt(0) || "B"}
            </div>
            <div>
              <p className="font-semibold text-sm truncate w-40">{employee?.full_name || "Memuat..."}</p>
              <p className="text-xs text-emerald-200">Portal Bendahara</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/bendahara' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-medium ${
                  isActive 
                    ? "bg-white text-emerald-700 shadow-md" 
                    : "text-emerald-50 hover:bg-emerald-600/50 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-emerald-800/30 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-xl transition-all text-sm font-medium text-emerald-100 hover:bg-red-500/20 hover:text-red-100"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-emerald-700 text-white h-16 flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="font-bold">{appName || "Portal Bendahara"}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-emerald-100 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/bendahara' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center py-3 px-1 w-full relative ${isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {isActive && <div className="absolute top-0 w-8 h-1 bg-emerald-600 rounded-b-full"></div>}
                  <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px] text-emerald-600' : ''}`} />
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
