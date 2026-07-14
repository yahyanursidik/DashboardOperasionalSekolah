import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { BarChart3, Bell, Calendar, CalendarCheck, ChevronRight, Clock, FileText, ShieldCheck, UserCheck } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { dayMap, getScheduleSubjectName } from "../schedules/schedule-utils";
import { isLeaveActiveOnDate } from "../leaves/leave-utils";
import { formatShortTime } from "../substitutes/substitute-utils";
import { formatStaffPosition } from "./staff-utils";

function attendanceLabel(record: any) {
  if (!record) return "Belum Absen";
  if (record.status === "present") return `Hadir ${record.time_in ? `(${formatShortTime(record.time_in)})` : ""}`;
  if (record.status === "late") return "Terlambat";
  if (record.status === "leave") return "Izin";
  if (record.status === "sick") return "Sakit";
  return record.status || "Belum Absen";
}

export const StaffDashboard: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({
    attendance: "Belum Absen",
    pendingLeaves: 0,
    activeLeave: false,
    schedulesToday: 0,
    announcements: 0,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      const today = new Date().toISOString().split("T")[0];
      const day = dayMap[new Date().getDay()] || "Senin";

      let scheduleQuery = supabaseClient
        .from("employee_schedules")
        .select("id, day_of_week, start_time, end_time, schedule_type, subject, classes(name), units(name), subjects(name)")
        .eq("employee_id", employee.id)
        .eq("day_of_week", day)
        .order("start_time");
      if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);

      const [{ data: attendanceRows }, { data: leaveRows }, { data: scheduleRows }, { data: announcementRows }] = await Promise.all([
        supabaseClient.from("employee_attendance").select("status, time_in, time_out").eq("employee_id", employee.id).eq("date", today).limit(1),
        supabaseClient.from("leave_requests").select("id, status, start_date, end_date").eq("employee_id", employee.id).order("created_at", { ascending: false }).limit(20),
        scheduleQuery,
        supabaseClient
          .from("announcements")
          .select("id, title, content, target_type, unit_id, publish_at, created_at, units(name)")
          .eq("status", "terkirim")
          .order("publish_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const scopedAnnouncements = (announcementRows || []).filter((item: any) => {
        if (item.publish_at && new Date(item.publish_at).getTime() > Date.now()) return false;
        if (item.target_type === "all" || item.target_type === "staff") return true;
        if (item.target_type === "unit") return !item.unit_id || item.unit_id === employee.unit_id;
        return false;
      });
      const leaves = leaveRows || [];
      setTodaySchedules(scheduleRows || []);
      setAnnouncements(scopedAnnouncements.slice(0, 3));
      setStats({
        attendance: attendanceLabel(attendanceRows?.[0]),
        pendingLeaves: leaves.filter((item: any) => item.status === "pending").length,
        activeLeave: leaves.some((item: any) => item.status === "approved" && isLeaveActiveOnDate(item, today)),
        schedulesToday: scheduleRows?.length || 0,
        announcements: scopedAnnouncements.length,
      });
    };

    fetchDashboard();
  }, [activeYearId, employee.id, employee.unit_id]);

  const todayText = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const checklist = useMemo(() => ([
    { label: "Absensi", done: stats.attendance.includes("Hadir"), value: stats.attendance },
    { label: "Izin", done: !stats.activeLeave && stats.pendingLeaves === 0, value: stats.activeLeave ? "Izin aktif" : `${stats.pendingLeaves} pending` },
    { label: "Jadwal kerja", done: stats.schedulesToday > 0, value: `${stats.schedulesToday} tugas` },
    { label: "Informasi", done: stats.announcements === 0, value: `${stats.announcements} info` },
  ]), [stats]);

  return (
    <div className="p-4 md:p-0 space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-800 p-6 text-white shadow-sm">
        <p className="text-sm text-emerald-100">Assalamu'alaikum,</p>
        <h1 className="mt-1 text-2xl font-black leading-tight">{employee.full_name}</h1>
        <p className="mt-2 text-sm text-emerald-100">{formatStaffPosition(employee.position)} - {todayText}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Absensi", value: stats.attendance.includes("Hadir") ? "OK" : "Cek", icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Jadwal Hari Ini", value: stats.schedulesToday, icon: Clock, tone: "bg-blue-50 text-blue-700" },
          { label: "Izin Pending", value: stats.pendingLeaves, icon: FileText, tone: "bg-amber-50 text-amber-700" },
          { label: "Informasi", value: stats.announcements, icon: Bell, tone: "bg-purple-50 text-purple-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs font-bold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-black text-gray-900">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Definition of done hari ini
          </h3>
          <div className="grid gap-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-black text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.value}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.done ? "Ok" : "Cek"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-black text-gray-900">
              <UserCheck className="h-5 w-5 text-slate-700" />
              Aksi Cepat
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/staff/attendance", label: "Absen", icon: CalendarCheck },
              { to: "/staff/leaves", label: "Ajukan Izin", icon: FileText },
              { to: "/staff/schedules", label: "Jadwal Kerja", icon: Calendar },
              { to: "/staff/announcements", label: "Informasi", icon: Bell },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-3 text-sm font-black text-gray-700 hover:bg-white">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-3 flex items-end justify-between px-1">
            <h3 className="text-sm font-black text-gray-900">Jadwal Kerja Hari Ini</h3>
            <Link to="/staff/schedules" className="flex items-center gap-0.5 text-xs font-black text-primary hover:underline">
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {todaySchedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
              <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Belum ada jadwal kerja hari ini.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="divide-y">
                {todaySchedules.map((schedule: any) => (
                  <div key={schedule.id} className="p-4">
                    <p className="text-sm font-black text-gray-900">{getScheduleSubjectName(schedule)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatShortTime(schedule.start_time)} - {formatShortTime(schedule.end_time)} {schedule.units?.name ? `- ${schedule.units.name}` : "- Lintas Unit"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between px-1">
            <h3 className="text-sm font-black text-gray-900">Informasi Terbaru</h3>
            <Link to="/staff/announcements" className="flex items-center gap-0.5 text-xs font-black text-primary hover:underline">
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Belum ada informasi baru.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="divide-y">
                {announcements.map((item: any) => (
                  <Link key={item.id} to="/staff/announcements" className="block p-4 hover:bg-gray-50">
                    <p className="line-clamp-1 text-sm font-black text-gray-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{item.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
