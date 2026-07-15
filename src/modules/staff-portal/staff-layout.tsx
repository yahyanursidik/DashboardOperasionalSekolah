/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Calendar, CalendarCheck, FileWarning, Home, ListTodo, LogOut, MoreHorizontal, UserRound, Wallet, X } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { formatStaffPosition, getInitials, staffPortalPositions } from "./staff-utils";

type NavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean; badge?: number };
type NavGroup = { label: string; items: NavItem[] };
const localReadKey = "staff_portal_read_announcement_ids";

export const StaffLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [badges, setBadges] = useState({ tasks: 0, reports: 0, announcements: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl } = useSystemSettings();

  useEffect(() => {
    const loadPortal = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { navigate("/staff/login", { replace: true }); return; }
      const { data, error } = await supabaseClient.from("employees").select("*,units(name)").eq("user_id", session.user.id).eq("status", "active").maybeSingle();
      const currentEmployee = data as any;
      if (error || !currentEmployee || !staffPortalPositions.includes(currentEmployee.position)) { await supabaseClient.auth.signOut(); navigate("/staff/login", { replace: true }); return; }
      const { data: hasAccess, error: accessError } = await supabaseClient.rpc("staff_has_portal_access");
      if (!accessError && !hasAccess) { await supabaseClient.auth.signOut(); navigate("/staff/login", { replace: true }); return; }
      setEmployee(currentEmployee);
      setIsLoading(false);

      const [{ data: tasks }, { data: reports }, { data: announcements }, readsResult] = await Promise.all([
        supabaseClient.from("admin_tasks").select("id,status").eq("assigned_to", session.user.id),
        supabaseClient.from("staff_operational_reports").select("id,status").or(`employee_id.eq.${currentEmployee.id},assigned_to.eq.${currentEmployee.id}`),
        supabaseClient.from("announcements").select("id,target_type,unit_id,publish_at").eq("status", "terkirim"),
        supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", currentEmployee.id),
      ]);
      let readIds = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
      if (readsResult.error) { try { readIds = new Set(JSON.parse(localStorage.getItem(localReadKey) || "[]")); } catch { readIds = new Set(); } }
      const scoped = (announcements || []).filter((item: any) => (!item.publish_at || new Date(item.publish_at).getTime() <= Date.now()) && (["all", "staff"].includes(item.target_type) || (item.target_type === "unit" && (!item.unit_id || item.unit_id === currentEmployee.unit_id))));
      setBadges({
        tasks: (tasks || []).filter((item: any) => !["selesai", "completed", "cancelled"].includes(item.status)).length,
        reports: (reports || []).filter((item: any) => ["submitted", "in_review", "assigned"].includes(item.status)).length,
        announcements: scoped.filter((item: any) => !readIds.has(item.id)).length,
      });
    };
    void loadPortal();
  }, [navigate]);

  const navGroups = useMemo<NavGroup[]>(() => [
    { label: "Hari Ini", items: [{ to: "/staff", label: "Beranda", icon: Home, exact: true }] },
    { label: "Pekerjaan", items: [
      { to: "/staff/tasks", label: "Tugas Saya", icon: ListTodo, badge: badges.tasks },
      { to: "/staff/schedules", label: "Jadwal Kerja", icon: Calendar },
      { to: "/staff/reports", label: "Laporan Operasional", icon: FileWarning, badge: badges.reports },
      ...(employee?.position === "bendahara" ? [{ to: "/bendahara", label: "Ruang Kerja Bendahara", icon: Wallet }] : []),
    ] },
    { label: "Kepegawaian", items: [
      { to: "/staff/attendance", label: "Absensi Saya", icon: CalendarCheck },
      { to: "/staff/leaves", label: "Izin & Cuti", icon: Calendar },
    ] },
    { label: "Informasi & Akun", items: [
      { to: "/staff/announcements", label: "Informasi Sekolah", icon: Bell, badge: badges.announcements },
      { to: "/staff/profile", label: "Profil & Keamanan", icon: UserRound },
    ] },
  ], [badges, employee?.position]);

  const allItems = navGroups.flatMap((group) => group.items);
  const mobileItems = allItems.filter((item) => ["/staff", "/staff/tasks", "/staff/attendance"].includes(item.to));
  const isActive = (item: NavItem) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  const logout = async () => { await supabaseClient.auth.signOut(); navigate("/staff/login", { replace: true }); };

  if (isLoading || !employee) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">Menyiapkan portal staf...</div>;

  return <div className="min-h-screen bg-gray-50 font-sans">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r bg-white md:flex"><div className="flex h-16 items-center border-b px-5">{logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="max-h-10 max-w-36 object-contain" /> : <span className="text-lg font-bold text-gray-900">{appName || "TSLS"}</span>}</div><div className="border-b p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-900 text-sm font-bold text-white">{getInitials(employee.full_name)}</div><div className="min-w-0"><p className="text-xs font-semibold text-emerald-700">Portal Staf</p><h2 className="truncate text-sm font-bold text-gray-950">{employee.full_name}</h2><p className="truncate text-xs text-gray-500">{formatStaffPosition(employee.position)} - {employee.units?.name || "Lintas unit"}</p></div></div></div>
      <nav className="flex-1 overflow-y-auto p-3">{navGroups.map((group) => <div key={group.label} className="mb-4"><p className="mb-1 px-3 text-[10px] font-bold uppercase text-gray-400">{group.label}</p>{group.items.map((item) => { const Icon = item.icon; const active = isActive(item); return <Link key={item.to} to={item.to} className={`mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"}`}><Icon className={`h-4 w-4 ${active ? "text-white" : "text-gray-400"}`} /><span className="flex-1">{item.label}</span>{Boolean(item.badge) && <span className="min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-800">{item.badge}</span>}</Link>; })}</div>)}</nav><div className="border-t p-3"><button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Keluar</button></div></aside>
    <div className="md:pl-72"><header className="sticky top-0 z-30 border-b bg-white md:hidden"><div className="flex items-center justify-between px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold text-emerald-700">Portal Staf</p><h1 className="truncate text-sm font-bold text-gray-950">{employee.full_name}</h1><p className="truncate text-[11px] text-gray-500">{formatStaffPosition(employee.position)}</p></div><button onClick={() => void logout()} title="Keluar" className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-600"><LogOut className="h-4 w-4" /></button></div></header><main className="mx-auto w-full max-w-7xl pb-24 md:p-6 md:pb-10"><Outlet context={{ employee }} /></main></div>
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden"><div className="grid grid-cols-4 px-2">{mobileItems.map((item) => { const Icon = item.icon; const active = isActive(item); return <Link key={item.to} to={item.to} className={`flex min-h-16 flex-col items-center justify-center gap-1 ${active ? "text-gray-950" : "text-gray-500"}`}><Icon className="h-5 w-5" /><span className="text-[10px] font-semibold">{item.label.replace(" Saya", "")}</span></Link>; })}<button onClick={() => setIsMoreOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-gray-500"><MoreHorizontal className="h-5 w-5" /><span className="text-[10px] font-semibold">Menu</span></button></div></nav>
    {isMoreOpen && <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"><button aria-label="Tutup menu" className="absolute inset-0 bg-black/50" onClick={() => setIsMoreOpen(false)} /><section className="relative max-h-[82vh] overflow-y-auto rounded-t-lg bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-gray-950">Menu Staf</h3><p className="text-xs text-gray-500">Pilih pekerjaan yang akan dilakukan</p></div><button onClick={() => setIsMoreOpen(false)} title="Tutup" className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100"><X className="h-5 w-5" /></button></div>{navGroups.map((group) => <div key={group.label} className="mb-5"><p className="mb-2 text-[10px] font-bold uppercase text-gray-400">{group.label}</p><div className="grid grid-cols-3 gap-2">{group.items.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} onClick={() => setIsMoreOpen(false)} className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border p-2 text-center ${isActive(item) ? "border-gray-900 bg-gray-900 text-white" : "text-gray-600"}`}><Icon className="h-5 w-5" /><span className="text-[10px] font-semibold leading-4">{item.label}</span>{Boolean(item.badge) && <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-white">{item.badge}</span>}</Link>; })}</div></div>)}</section></div>}
  </div>;
};
