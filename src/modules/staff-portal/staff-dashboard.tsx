/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { BarChart3, Bell, CalendarCheck, ChevronRight, Clock, FileText, FileWarning, ListTodo, Megaphone, UserCheck } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { isLeaveActiveOnDate, toDateInputValue } from "../leaves/leave-utils";
import { dayMap, getScheduleSubjectName } from "../schedules/schedule-utils";
import { formatShortTime } from "../substitutes/substitute-utils";
import { formatStaffPosition } from "./staff-utils";

const readKey = "staff_portal_read_announcement_ids";
function attendanceLabel(record: any) {
  if (!record) return "Belum Absen";
  if (record.status === "present") return `Hadir${record.time_in ? ` (${formatShortTime(record.time_in)})` : ""}`;
  if (record.status === "late") return `Terlambat${record.time_in ? ` (${formatShortTime(record.time_in)})` : ""}`;
  if (record.status === "leave") return "Izin";
  if (record.status === "sick") return "Sakit";
  return record.status || "Belum Absen";
}

export const StaffDashboard: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({ attendance: "Belum Absen", pendingLeaves: 0, activeLeave: false, schedulesToday: 0, unreadAnnouncements: 0, pendingTasks: 0, openReports: 0 });

  useEffect(() => {
    const load = async () => {
      const today = toDateInputValue(new Date());
      const day = dayMap[new Date().getDay()] || "Senin";
      let scheduleQuery = supabaseClient.from("employee_schedules").select("id,day_of_week,start_time,end_time,schedule_type,subject,classes(name),units(name),subjects(name)").eq("employee_id", employee.id).eq("day_of_week", day).order("start_time");
      if (activeYearId) scheduleQuery = scheduleQuery.or(`academic_year_id.eq.${activeYearId},academic_year_id.is.null`);
      if (activeSemesterId) scheduleQuery = scheduleQuery.or(`semester_id.eq.${activeSemesterId},semester_id.is.null`);
      const { data: { user } } = await supabaseClient.auth.getUser();
      const [attendanceResult, leavesResult, schedulesResult, announcementsResult, tasksResult, reportsResult, readsResult] = await Promise.all([
        supabaseClient.from("employee_attendance").select("status,time_in,time_out").eq("employee_id", employee.id).eq("date", today).limit(1),
        supabaseClient.from("leave_requests").select("id,status,start_date,end_date").eq("employee_id", employee.id).order("created_at", { ascending: false }).limit(20),
        scheduleQuery,
        supabaseClient.from("announcements").select("id,title,content,target_type,unit_id,publish_at,created_at,units(name)").eq("status", "terkirim").order("publish_at", { ascending: false }).limit(20),
        user ? supabaseClient.from("admin_tasks").select("id,status,due_date").eq("assigned_to", user.id) : Promise.resolve({ data: [] as any[] }),
        supabaseClient.from("staff_operational_reports").select("id,status,priority").or(`employee_id.eq.${employee.id},assigned_to.eq.${employee.id}`),
        supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", employee.id),
      ]);
      const scopedAnnouncements = (announcementsResult.data || []).filter((item: any) => (!item.publish_at || new Date(item.publish_at).getTime() <= Date.now()) && (["all", "staff"].includes(item.target_type) || (item.target_type === "unit" && (!item.unit_id || item.unit_id === employee.unit_id))));
      let readIds = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
      if (readsResult.error) { try { readIds = new Set(JSON.parse(localStorage.getItem(readKey) || "[]")); } catch { readIds = new Set(); } }
      const leaves = leavesResult.data || [];
      setTodaySchedules(schedulesResult.data || []);
      setAnnouncements(scopedAnnouncements.slice(0, 3));
      setStats({
        attendance: attendanceLabel(attendanceResult.data?.[0]), pendingLeaves: leaves.filter((item: any) => item.status === "pending").length,
        activeLeave: leaves.some((item: any) => item.status === "approved" && isLeaveActiveOnDate(item, today)), schedulesToday: schedulesResult.data?.length || 0,
        unreadAnnouncements: scopedAnnouncements.filter((item: any) => !readIds.has(item.id)).length,
        pendingTasks: (tasksResult.data || []).filter((item: any) => !["selesai", "completed", "cancelled"].includes(item.status)).length,
        openReports: (reportsResult.data || []).filter((item: any) => ["submitted", "in_review", "assigned"].includes(item.status)).length,
      });
    };
    void load();
  }, [activeSemesterId, activeYearId, employee.id, employee.unit_id]);

  const todayText = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const attendanceReady = stats.activeLeave || stats.attendance.includes("Hadir") || stats.attendance.includes("Terlambat");
  const checklist = useMemo(() => [
    { label: "Absensi", done: attendanceReady, value: stats.activeLeave ? "Izin aktif" : stats.attendance },
    { label: "Tugas aktif", done: stats.pendingTasks === 0, value: `${stats.pendingTasks} tugas` },
    { label: "Jadwal kerja", done: stats.schedulesToday > 0, value: `${stats.schedulesToday} agenda` },
    { label: "Laporan operasional", done: stats.openReports === 0, value: `${stats.openReports} diproses` },
    { label: "Informasi", done: stats.unreadAnnouncements === 0, value: `${stats.unreadAnnouncements} belum dibaca` },
  ], [attendanceReady, stats]);

  return <div className="space-y-6">
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-slate-900"><p className="text-sm font-semibold text-emerald-700">Assalamu'alaikum,</p><h1 className="mt-1 text-2xl font-bold">{employee.full_name}</h1><p className="mt-2 text-sm text-slate-600">{formatStaffPosition(employee.position)} - {todayText}</p></section>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      { label: "Absensi", value: attendanceReady ? "OK" : "Cek", icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Tugas Aktif", value: stats.pendingTasks, icon: ListTodo, tone: "bg-blue-50 text-blue-700" },
      { label: "Jadwal Hari Ini", value: stats.schedulesToday, icon: Clock, tone: "bg-amber-50 text-amber-700" },
      { label: "Laporan Aktif", value: stats.openReports, icon: FileWarning, tone: "bg-purple-50 text-purple-700" },
    ].map((item) => <div key={item.label} className="rounded-md border bg-white p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-xl font-bold text-gray-950">{item.value}</p><p className="text-xs font-semibold text-gray-500">{item.label}</p></div>)}</section>
    <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-md border bg-white p-5"><h2 className="mb-4 flex items-center gap-2 font-bold text-gray-950"><BarChart3 className="h-5 w-5 text-emerald-700" />Kesiapan Hari Ini</h2><div className="space-y-2">{checklist.map((item) => <div key={item.label} className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2"><div><p className="text-sm font-bold text-gray-900">{item.label}</p><p className="text-xs text-gray-500">{item.value}</p></div><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.done ? "Siap" : "Cek"}</span></div>)}</div></div>
      <div className="rounded-md border bg-white p-5"><h2 className="mb-4 flex items-center gap-2 font-bold text-gray-950"><UserCheck className="h-5 w-5" />Aksi Cepat</h2><div className="grid grid-cols-2 gap-3">{[
        { to: "/staff/tasks", label: "Tugas Saya", icon: ListTodo, tone: "bg-blue-50 text-blue-700" }, { to: "/staff/attendance", label: "Absensi", icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-700" },
        { to: "/staff/reports", label: "Buat Laporan", icon: FileWarning, tone: "bg-amber-50 text-amber-700" }, { to: "/staff/leaves", label: "Izin & Cuti", icon: FileText, tone: "bg-purple-50 text-purple-700" },
      ].map((item) => <Link key={item.to} to={item.to} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border text-center hover:border-gray-400"><span className={`flex h-10 w-10 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></span><span className="text-xs font-bold text-gray-700">{item.label}</span></Link>)}</div></div></section>
    <section className="grid gap-5 lg:grid-cols-2"><div><div className="mb-2 flex items-center justify-between"><h2 className="font-bold text-gray-950">Jadwal Hari Ini</h2><Link to="/staff/schedules" className="flex items-center text-xs font-bold text-emerald-700">Semua<ChevronRight className="h-3.5 w-3.5" /></Link></div>{todaySchedules.length === 0 ? <div className="rounded-md border border-dashed bg-white p-8 text-center text-sm text-gray-500">Tidak ada jadwal kerja hari ini.</div> : <div className="divide-y overflow-hidden rounded-md border bg-white">{todaySchedules.map((schedule) => <div key={schedule.id} className="flex items-center gap-4 p-4"><div className="w-14 text-center"><p className="text-sm font-bold">{String(schedule.start_time || "-").slice(0, 5)}</p><p className="text-xs text-gray-500">{String(schedule.end_time || "-").slice(0, 5)}</p></div><div className="min-w-0"><p className="font-bold text-gray-900">{getScheduleSubjectName(schedule)}</p><p className="text-xs text-gray-500">{schedule.units?.name || schedule.classes?.name || "Lintas unit"}</p></div></div>)}</div>}</div>
      <div><div className="mb-2 flex items-center justify-between"><h2 className="font-bold text-gray-950">Informasi Terbaru</h2><Link to="/staff/announcements" className="flex items-center text-xs font-bold text-emerald-700">Semua<ChevronRight className="h-3.5 w-3.5" /></Link></div>{announcements.length === 0 ? <div className="rounded-md border border-dashed bg-white p-8 text-center"><Megaphone className="mx-auto mb-2 h-7 w-7 text-gray-300" /><p className="text-sm text-gray-500">Belum ada informasi terbaru.</p></div> : <div className="divide-y overflow-hidden rounded-md border bg-white">{announcements.map((item) => <Link key={item.id} to="/staff/announcements" className="block p-4 hover:bg-amber-50"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-600" /><p className="line-clamp-1 font-bold text-gray-900">{item.title}</p></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{item.content}</p></Link>)}</div>}</div></section>
  </div>;
};
