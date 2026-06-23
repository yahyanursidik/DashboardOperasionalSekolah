import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { Target, LogOut, Menu, User, LayoutDashboard, LayoutList } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";

export const ExtracurricularPortalLayout: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/ekskul-portal/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const isAuthPage = location.pathname.includes('/login') || location.pathname.includes('/register');

  if (isAuthPage) {
    return <Outlet />;
  }

  const isProgramsPage = location.pathname.includes('/ekskul-portal/programs');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/ekskul-portal')}>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Portal Ekskul</h1>
                <p className="text-xs text-muted-foreground">Siswa Eksternal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 mr-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{identity?.full_name || 'Siswa'}</p>
                  <p className="text-xs text-muted-foreground">{identity?.email}</p>
                </div>
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <button className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" onClick={() => logout()} title="Keluar">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-6 mt-1 border-t pt-2">
            <Link 
              to="/ekskul-portal" 
              className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${!isProgramsPage && !location.pathname.includes('/profile') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dasbor Utama
            </Link>
            <Link 
              to="/ekskul-portal/programs" 
              className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${isProgramsPage ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'}`}
            >
              <LayoutList className="w-4 h-4" />
              Daftar Program
            </Link>
            <Link 
              to="/ekskul-portal/profile" 
              className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${location.pathname.includes('/profile') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'}`}
            >
              <User className="w-4 h-4" />
              Profil Saya
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TS Lab School. Sistem Ekstrakurikuler.<br/>
            Disusun oleh <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Yahya Nursidik</a>
          </div>
      </footer>
    </div>
  );
};
