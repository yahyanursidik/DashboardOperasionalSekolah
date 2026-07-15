import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Bell, BookOpen, Calendar, CalendarCheck, CheckSquare, ClipboardList, Clock, FileText, Home, ListTodo, LogOut, MoreHorizontal, Star, UserRound, X } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

type NavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

const localReadKey = "teacher_portal_read_announcement_ids";

export const TeacherLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl } = useSystemSettings();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  useEffect(() => {
    const loadPortal = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/teacher/login", { replace: true });
        return;
      }

      const { data: empData, error } = await supabaseClient.from("employees").select("*, units(name)").eq("user_id", session.user.id).eq("status", "active").maybeSingle();
      if (error || !empData) {
        await supabaseClient.auth.signOut();
        navigate("/teacher/login", { replace: true });
        return;
      }

      const { data: hasAccess, error: accessError } = await supabaseClient.rpc("teacher_has_portal_access");
      if (!accessError && !hasAccess) {
        await supabaseClient.auth.signOut();
        navigate("/teacher/login", { replace: true });
        return;
      }

      const currentEmployee = empData as any;
      setEmployee(currentEmployee);
      setIsLoading(false);

      let scheduledClassQuery = supabaseClient
        .from("employee_schedules")
        .select("class_id")
        .eq("employee_id", currentEmployee.id)
        .not("class_id", "is", null);
      if (activeYearId) scheduledClassQuery = scheduledClassQuery.eq("academic_year_id", activeYearId);
      if (activeSemesterId) scheduledClassQuery = scheduledClassQuery.eq("semester_id", activeSemesterId);

      const [{ data: tasks }, { data: announcements }, readsResult, { data: scheduledClasses }, { data: homeroomClasses }] = await Promise.all([
        supabaseClient.from("admin_tasks").select("id, status").eq("assigned_to", session.user.id),
        supabaseClient.from("announcements").select("id, target_type, unit_id, class_id, publish_at").eq("status", "terkirim"),
        supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", currentEmployee.id),
        scheduledClassQuery,
        supabaseClient.from("classes").select("id").eq("homeroom_teacher_id", currentEmployee.id),
      ]);
      setPendingTasks((tasks || []).filter((task: any) => !["selesai", "completed", "cancelled"].includes(task.status)).length);
      let readIds = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
      if (readsResult.error) {
        try { readIds = new Set(JSON.parse(localStorage.getItem(localReadKey) || "[]")); } catch { readIds = new Set(); }
      }
      const classIds = new Set<string>([...(scheduledClasses || []).map((row: any) => row.class_id), ...(homeroomClasses || []).map((row: any) => row.id)].filter(Boolean));
      const now = Date.now();
      const scopedAnnouncements = (announcements || []).filter((item: any) => {
        if (item.publish_at && new Date(item.publish_at).getTime() > now) return false;
        if (["all", "staff"].includes(item.target_type)) return true;
        if (item.target_type === "unit") return !item.unit_id || item.unit_id === currentEmployee.unit_id;
        if (item.target_type === "class") return item.class_id && classIds.has(item.class_id);
        return false;
      });
      setUnreadAnnouncements(scopedAnnouncements.filter((item: any) => !readIds.has(item.id)).length);
    };
    loadPortal();
  }, [activeSemesterId, activeYearId, navigate]);

  useEffect(() => setIsMoreOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/teacher/login", { replace: true });
  };

  const navGroups = useMemo<NavGroup[]>(() => {
    if (!employee) return [];
    const unitName = employee.units?.name?.toLowerCase() || "";
    const isPaud = ["paud", "tk", "kb", "preschool"].some((name) => unitName.includes(name));
    return [
      { label: "Hari Ini", items: [{ to: "/teacher", label: "Beranda", icon: Home, exact: true }] },
      { label: "Pembelajaran", items: [
        { to: "/teacher/classes", label: "Kelas & Nilai", icon: CheckSquare },
        { to: "/teacher/reports", label: "Rapor Digital", icon: FileText },
        { to: "/teacher/quran", label: "Pembelajaran Qur'an", icon: BookOpen },
        ...(isPaud ? [{ to: "/teacher/paud", label: "Perkembangan KB/TK", icon: Star }] : []),
        { to: "/teacher/journals", label: "Jurnal Siswa", icon: ClipboardList },
      ] },
      { label: "Administrasi", items: [
        { to: "/teacher/tasks", label: "Tugas Saya", icon: ListTodo, badge: pendingTasks },
        { to: "/teacher/schedules", label: "Jadwal Mengajar", icon: Calendar },
        { to: "/teacher/announcements", label: "Informasi Sekolah", icon: Bell, badge: unreadAnnouncements },
      ] },
      { label: "Kepegawaian", items: [
        { to: "/teacher/attendance", label: "Absensi Saya", icon: CalendarCheck },
        { to: "/teacher/leaves", label: "Izin & Cuti", icon: Clock },
        { to: "/teacher/performance", label: "Kinerja / PKG", icon: BarChart3 },
      ] },
      { label: "Akun", items: [{ to: "/teacher/profile", label: "Profil & Keamanan", icon: UserRound }] },
    ];
  }, [employee, pendingTasks, unreadAnnouncements]);

  const allItems = navGroups.flatMap((group) => group.items);
  const mobileItems = allItems.filter((item) => ["/teacher", "/teacher/classes", "/teacher/schedules"].includes(item.to));
  const isActive = (item: NavItem) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  if (isLoading || !employee) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">Menyiapkan portal pengajar...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r bg-white md:flex">
        <div className="flex h-16 items-center border-b px-5">
          {logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="max-h-10 max-w-36 object-contain" /> : <span className="text-lg font-bold text-emerald-700">{appName || "TSLS"}</span>}
        </div>
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-base font-black uppercase text-emerald-700">{employee.full_name?.charAt(0)}</div>
            <div className="min-w-0"><p className="text-xs font-semibold text-emerald-700">Portal Pengajar</p><h2 className="truncate text-sm font-bold text-gray-950">{employee.full_name}</h2><p className="truncate text-xs text-gray-500">{employee.units?.name || "Lintas unit"}</p></div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-bold uppercase text-gray-400">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return <Link key={item.to} to={item.to} className={`mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-emerald-50 text-emerald-800" : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"}`}><Icon className={`h-4.5 w-4.5 ${active ? "text-emerald-700" : "text-gray-400"}`} /><span className="flex-1">{item.label}</span>{Boolean(item.badge) && <span className="min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-800">{item.badge}</span>}</Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="border-t p-3"><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Keluar</button></div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 border-b bg-white md:hidden"><div className="flex items-center justify-between px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold text-emerald-700">Portal Pengajar</p><h1 className="truncate text-sm font-bold text-gray-950">{employee.full_name}</h1></div><button onClick={handleLogout} title="Keluar" className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-600"><LogOut className="h-4 w-4" /></button></div></header>
        <main className="mx-auto w-full max-w-7xl pb-24 md:p-6 md:pb-10"><Outlet context={{ employee }} /></main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden"><div className="grid grid-cols-4 px-2">
        {mobileItems.map((item) => { const Icon = item.icon; const active = isActive(item); return <Link key={item.to} to={item.to} className={`flex min-h-16 flex-col items-center justify-center gap-1 ${active ? "text-emerald-700" : "text-gray-500"}`}><Icon className="h-5 w-5" /><span className="text-[10px] font-semibold">{item.label.replace(" Mengajar", "")}</span></Link>; })}
        <button onClick={() => setIsMoreOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-gray-500"><MoreHorizontal className="h-5 w-5" /><span className="text-[10px] font-semibold">Menu</span></button>
      </div></nav>

      {isMoreOpen && <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"><button aria-label="Tutup menu" className="absolute inset-0 bg-black/50" onClick={() => setIsMoreOpen(false)} /><section className="relative max-h-[82vh] overflow-y-auto rounded-t-lg bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-gray-950">Menu Pengajar</h3><p className="text-xs text-gray-500">Pilih pekerjaan yang akan dilakukan</p></div><button onClick={() => setIsMoreOpen(false)} title="Tutup" className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-600"><X className="h-5 w-5" /></button></div>{navGroups.map((group) => <div key={group.label} className="mb-5"><p className="mb-2 text-[10px] font-bold uppercase text-gray-400">{group.label}</p><div className="grid grid-cols-3 gap-2">{group.items.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border p-2 text-center ${isActive(item) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-gray-600"}`}><Icon className="h-5 w-5" /><span className="text-[10px] font-semibold leading-4">{item.label}</span>{Boolean(item.badge) && <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-white">{item.badge}</span>}</Link>; })}</div></div>)}</section></div>}
    </div>
  );
};
