import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { LogOut, GraduationCap, UserCircle } from "lucide-react";
import { getSpmbSettings } from "../mock";

export const SpmbLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem('spmbSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...getSpmbSettings(), ...parsed };
      }
    } catch(e) {}
    return getSpmbSettings();
  };

  const [settings, setSettings] = useState(loadSettings());

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spmbSettings') setSettings(loadSettings());
    };
    const handleLocalUpdate = () => setSettings(loadSettings());

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('spmbSettingsUpdated', handleLocalUpdate);
    setSettings(loadSettings());

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('spmbSettingsUpdated', handleLocalUpdate);
    };
  }, []);
  
  const isAuthPage = currentPath === '/spmb/login' || currentPath === '/spmb/register';
  const isAuthenticated = localStorage.getItem('spmbAuth') === 'true';

  let spmbUser = null;
  try {
    const userStr = localStorage.getItem('spmbUser');
    if (userStr) spmbUser = JSON.parse(userStr);
  } catch (e) {}

  if (!isAuthenticated && !isAuthPage) {
    return <Navigate to="/spmb/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('spmbAuth');
    localStorage.removeItem('spmbUser');
    navigate('/spmb/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/spmb" className="flex items-center gap-2">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
                <GraduationCap className="w-6 h-6" />
              </div>
            )}
            <span className="font-bold text-lg text-foreground tracking-tight">Portal SPMB</span>
          </Link>

          {!isAuthPage && (
            <div className="flex items-center gap-6">
              {spmbUser && (
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  {spmbUser.name || spmbUser.email}
                </div>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-rose-600 transition-colors">
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          )}
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
