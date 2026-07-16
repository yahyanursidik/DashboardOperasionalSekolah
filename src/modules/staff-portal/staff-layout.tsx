/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, BookOpenCheck, Calendar, CalendarCheck, FileWarning, Home, Library, ListTodo, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserRound, Wallet, X } from "lucide-react";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.localStorage.getItem("staff-sidebar-collapsed") === "true");
  const [badges, setBadges] = useState({ tasks: 0, reports: 0, announcements: 0, events: 0, overtime: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl } = useSystemSettings();

  useEffect(() => {
    const loadPortal = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { navigate("/staff/login", { replace: true }); return; }
      if ((session.user.app_metadata?.must_change_password || session.user.user_metadata?.must_change_password) && window.location.pathname !== "/staff/profile") {
        navigate("/staff/profile?security=required", { replace: true });
      }
      const { data, error } = await supabaseClient.from("employees").select("*,units(name)").eq("user_id", session.user.id).eq("status", "active").maybeSingle();
      const currentEmployee = data as any;
      if (error || !currentEmployee || !staffPortalPositions.includes(currentEmployee.position)) { await supabaseClient.auth.signOut(); navigate("/staff/login", { replace: true }); return; }
      const { data: hasAccess, error: accessError } = await supabaseClient.rpc("staff_has_portal_access");
      if (!accessError && !hasAccess) { await supabaseClient.auth.signOut(); navigate("/staff/login", { replace: true }); return; }
      setEmployee(currentEmployee);
      setIsLoading(false);

      const [{ data: tasks }, { data: reports }, { data: announcements }, readsResult, { data: eventParticipations }, { data: overtimeRows }] = await Promise.all([
        supabaseClient.from("admin_tasks").select("id,status").eq("assigned_to", session.user.id),
        supabaseClient.from("staff_operational_reports").select("id,status").or(`employee_id.eq.${currentEmployee.id},assigned_to.eq.${currentEmployee.id}`),
        supabaseClient.from("announcements").select("id,target_type,unit_id,publish_at").eq("status", "terkirim"),
        supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", currentEmployee.id),
        supabaseClient.from("attendance_event_participants").select("id,attendance_events(event_date,status)").eq("employee_id", currentEmployee.id),
        supabaseClient.from("employee_overtime").select("id,status,overtime_date").eq("employee_id", currentEmployee.id).in("status", ["pending", "approved"]),
      ]);
      let readIds = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
      if (readsResult.error) { try { readIds = new Set(JSON.parse(localStorage.getItem(localReadKey) || "[]")); } catch { readIds = new Set(); } }
      const scoped = (announcements || []).filter((item: any) => (!item.publish_at || new Date(item.publish_at).getTime() <= Date.now()) && (["all", "staff"].includes(item.target_type) || (item.target_type === "unit" && (!item.unit_id || item.unit_id === currentEmployee.unit_id))));
      setBadges({
        tasks: (tasks || []).filter((item: any) => !["selesai", "completed", "cancelled"].includes(item.status)).length,
        reports: (reports || []).filter((item: any) => ["submitted", "in_review", "assigned"].includes(item.status)).length,
        announcements: scoped.filter((item: any) => !readIds.has(item.id)).length,
        events: (eventParticipations || []).filter((item: any) => item.attendance_events?.status === "published" && item.attendance_events?.event_date >= new Date().toLocaleDateString("en-CA")).length,
        overtime: (overtimeRows || []).filter((item: any) => item.status === "pending" || item.overtime_date >= new Date().toLocaleDateString("en-CA")).length,
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
      { to: "/staff/attendance", label: "Absensi & Lembur", icon: CalendarCheck, badge: badges.events + badges.overtime },
      { to: "/staff/leaves", label: "Izin & Cuti", icon: Calendar },
    ] },
    { label: "Informasi & Akun", items: [
      { to: "/staff/announcements", label: "Informasi Sekolah", icon: Bell, badge: badges.announcements },
      { to: "/staff/library", label: "Perpustakaan", icon: Library },
      { to: "/staff/onboarding", label: "Panduan & SOP", icon: BookOpenCheck },
      { to: "/staff/profile", label: "Profil & Keamanan", icon: UserRound },
    ] },
  ], [badges, employee?.position]);

  const allItems = navGroups.flatMap((group) => group.items);
  const mobileItems = allItems.filter((item) => ["/staff", "/staff/tasks", "/staff/attendance"].includes(item.to));
  const isActive = (item: NavItem) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  const logout = async () => { await supabaseClient.auth.signOut(); navigate("/staff/login", { replace: true }); };
  const toggleSidebar = () => setIsSidebarCollapsed((current) => {
    const next = !current;
    window.localStorage.setItem("staff-sidebar-collapsed", String(next));
    return next;
  });

  if (isLoading || !employee) return <div className="staff-light-theme flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Menyiapkan portal staf...</div>;

  return <div className="staff-light-theme flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
    {isMoreOpen ? <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsMoreOpen(false)} /> : null}
    <aside className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900 shadow-sm transition-all duration-200 md:sticky md:translate-x-0 ${isSidebarCollapsed ? "md:w-20" : "md:w-72"} ${isMoreOpen ? "translate-x-0" : "-translate-x-[110%]"}`}>
      <div className={`flex h-16 shrink-0 items-center justify-between border-b ${isSidebarCollapsed ? "px-3 md:justify-center" : "px-5"}`}>
        <div className={isSidebarCollapsed ? "md:hidden" : "block"}>{logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="max-h-10 max-w-36 object-contain" /> : <span className="text-lg font-bold text-foreground">{appName || "TSLS"}</span>}</div>
        {isSidebarCollapsed ? <div className="hidden h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary md:flex">TS</div> : null}
        <button type="button" onClick={toggleSidebar} title={isSidebarCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} aria-label={isSidebarCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:flex">{isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
        <button type="button" onClick={() => setIsMoreOpen(false)} aria-label="Tutup sidebar" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"><X className="h-5 w-5" /></button>
      </div>
      <div className={`border-b p-4 ${isSidebarCollapsed ? "md:hidden" : ""}`}><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">{getInitials(employee.full_name)}</div><div className="min-w-0"><p className="text-xs font-semibold text-primary">Portal Staf</p><h2 className="truncate text-sm font-bold text-foreground">{employee.full_name}</h2><p className="truncate text-xs text-muted-foreground">{formatStaffPosition(employee.position)} - {employee.units?.name || "Lintas unit"}</p></div></div></div>
      <nav className={`flex-1 overflow-y-auto py-4 ${isSidebarCollapsed ? "px-2" : "px-3"}`} aria-label="Navigasi portal staf">
        {navGroups.map((group) => <div key={group.label} className="mb-4"><p className={`mb-1 px-3 text-[10px] font-bold uppercase text-muted-foreground ${isSidebarCollapsed ? "md:hidden" : ""}`}>{group.label}</p>{group.items.map((item) => { const Icon = item.icon; const active = isActive(item); return <Link key={item.to} to={item.to} onClick={() => setIsMoreOpen(false)} title={isSidebarCollapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`mx-1 mb-0.5 flex items-center rounded-md py-2.5 text-sm ${isSidebarCollapsed ? "md:justify-center md:px-2" : "gap-3 px-3"} ${active ? "bg-primary/10 font-bold text-primary" : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><Icon className="h-4 w-4 shrink-0" /><span className={`min-w-0 flex-1 truncate ${isSidebarCollapsed ? "md:hidden" : ""}`}>{item.label}</span>{Boolean(item.badge) && <span className={`min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-800 ${isSidebarCollapsed ? "md:hidden" : ""}`}>{item.badge}</span>}</Link>; })}</div>)}
      </nav>
      <div className="shrink-0 border-t p-3"><button type="button" onClick={() => void logout()} title="Keluar" className={`flex w-full items-center rounded-md py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 ${isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"}`}><LogOut className="h-4 w-4" /><span className={isSidebarCollapsed ? "md:hidden" : ""}>Keluar</span></button></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setIsMoreOpen(true)} aria-label="Buka menu utama" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary hover:bg-muted md:hidden"><Menu className="h-6 w-6" /></button><div className="min-w-0"><p className="text-xs font-semibold text-primary">Portal Staf</p><p className="truncate text-sm font-bold text-foreground">Ruang Kerja Operasional</p></div></div>
        <div className="flex shrink-0 items-center gap-1.5"><Link to="/staff/announcements" title="Informasi sekolah" aria-label="Informasi sekolah" className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Bell className="h-5 w-5" />{badges.announcements > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" /> : null}</Link><Link to="/staff/profile" className="flex items-center gap-2 border-l pl-2 sm:pl-3"><div className="hidden max-w-40 text-right lg:block"><p className="truncate text-sm font-semibold leading-none">{employee.full_name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{formatStaffPosition(employee.position)}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{getInitials(employee.full_name)}</div></Link><button type="button" onClick={() => void logout()} title="Keluar" aria-label="Keluar dari portal" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LogOut className="h-4 w-4" /></button></div>
      </header>
      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0"><div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8"><Outlet context={{ employee }} /></div><footer className="mt-auto w-full border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">&copy; {new Date().getFullYear()} TS Lab School</footer></main>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden"><div className="grid grid-cols-4 px-2">{mobileItems.map((item) => { const Icon = item.icon; const active = isActive(item); return <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 ${active ? "text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" /><span className="text-[10px] font-semibold">{item.label.replace(" Saya", "")}</span></Link>; })}<button type="button" onClick={() => setIsMoreOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-muted-foreground"><Menu className="h-5 w-5" /><span className="text-[10px] font-semibold">Menu</span></button></div></nav>
  </div>;
};
