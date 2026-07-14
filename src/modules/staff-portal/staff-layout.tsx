import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Calendar, CalendarCheck, Home, LogOut, MoreHorizontal, UserRound, X } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { formatStaffPosition, getInitials, staffPortalPositions } from "./staff-utils";

export const StaffLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl } = useSystemSettings();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/staff/login");
        return;
      }

      const { data, error } = await supabaseClient
        .from("employees")
        .select("*, units(name)")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .single();

      const employeeData = data as any;
      if (error || !employeeData || !staffPortalPositions.includes(employeeData.position)) {
        await supabaseClient.auth.signOut();
        navigate("/staff/login");
        return;
      }

      setEmployee(employeeData);
    };

    fetchSession();
  }, [navigate]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(() => ([
    { to: "/staff", label: "Beranda", icon: Home, exact: true },
    { to: "/staff/attendance", label: "Absensi", icon: CalendarCheck },
    { to: "/staff/schedules", label: "Jadwal Kerja", icon: Calendar },
    { to: "/staff/leaves", label: "Izin", icon: CalendarCheck },
    { to: "/staff/announcements", label: "Informasi", icon: Bell },
    { to: "/staff/profile", label: "Profil", icon: UserRound },
  ]), []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/staff/login");
  };

  if (!employee) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">Memuat portal staf...</div>;
  }

  const isActive = (item: any) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  const mobileMainItems = navItems.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r bg-white md:flex">
        <div className="flex h-16 items-center justify-center border-b px-4">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-10 object-contain" /> : <span className="text-lg font-black text-slate-900">{appName || "TSLS"}</span>}
        </div>

        <div className="border-b p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black uppercase text-white">
              {getInitials(employee.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500">Portal Staf</p>
              <h2 className="truncate text-base font-black text-gray-900">{employee.full_name}</h2>
              <p className="mt-0.5 text-xs text-gray-500">{employee.units?.name || "Lintas Unit"}</p>
            </div>
          </div>
          <span className="mt-3 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
            {formatStaffPosition(employee.position)}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${active ? "bg-slate-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                <Icon className={`h-5 w-5 ${active ? "text-white" : "text-gray-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">
            <LogOut className="h-5 w-5" />
            Keluar
          </button>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 border-b bg-white shadow-sm md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-700">Portal Staf</p>
              <h1 className="truncate text-base font-black text-gray-900">{employee.full_name}</h1>
              <p className="truncate text-[11px] text-gray-500">{formatStaffPosition(employee.position)}</p>
            </div>
            <button onClick={handleLogout} className="rounded-full bg-red-50 p-2 text-red-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl pb-24 md:p-6 md:pb-10">
          <Outlet context={{ employee }} />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
        <div className="grid grid-cols-4 px-2">
          {mobileMainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center justify-center py-2 ${active ? "text-slate-900" : "text-gray-400"}`}>
                <Icon className="mb-1 h-5 w-5" />
                <span className={`text-[10px] ${active ? "font-black" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setIsMoreOpen(true)} className={`flex flex-col items-center justify-center py-2 ${isMoreOpen ? "text-slate-900" : "text-gray-400"}`}>
            <MoreHorizontal className="mb-1 h-5 w-5" />
            <span className="text-[10px] font-medium">Lainnya</span>
          </button>
        </div>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMoreOpen(false)} />
          <div className="relative rounded-t-3xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Menu Staf</h3>
              <button onClick={() => setIsMoreOpen(false)} className="rounded-full bg-gray-100 p-2 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link key={item.to} to={item.to} className="flex flex-col items-center gap-2 text-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-600"}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className={`text-[11px] font-bold ${active ? "text-slate-900" : "text-gray-600"}`}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
