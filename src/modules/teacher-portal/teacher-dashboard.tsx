import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Calendar, Clock, BookOpen, ChevronRight, UserCheck, BarChart3, CalendarCheck, FileText, Megaphone, ListTodo } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { dayMap, getScheduleSubjectName } from "../schedules/schedule-utils";
import { isLeaveActiveOnDate, toDateInputValue } from "../leaves/leave-utils";

const READ_ANNOUNCEMENTS_KEY = "teacher_portal_read_announcement_ids";

export const TeacherDashboard: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [stats, setStats] = useState({
    myAttendance: "Belum Absen",
    classesToday: 0,
    classCount: 0,
    quranRecords: 0,
    assessments: 0,
    followUps: 0,
    pendingLeaves: 0,
    activeLeave: false,
    substitutesToday: 0,
    unreadAnnouncements: 0,
    pendingTasks: 0,
    pendingReports: 0,
  });
  const [recentQuranRecords, setRecentQuranRecords] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayStr = toDateInputValue(new Date());

        const { data: myAtt } = await supabaseClient
          .from("employee_attendance")
          .select("status, time_in")
          .eq("employee_id", employee.id)
          .eq("date", todayStr)
          .single();

        const { data: leaves } = await supabaseClient
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, status")
          .eq("employee_id", employee.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const { data: substituteRows } = await supabaseClient
          .from("substitute_assignments")
          .select("id, status")
          .eq("substitute_employee_id", employee.id)
          .eq("date", todayStr)
          .neq("status", "cancelled");

        const dayOfWeek = dayMap[new Date().getDay()] || "Senin";
        let todayScheduleQuery = supabaseClient
          .from("employee_schedules")
          .select("*, classes(id, name), subjects(name)")
          .eq("employee_id", employee.id)
          .eq("day_of_week", dayOfWeek)
          .order("start_time");
        if (activeYearId) todayScheduleQuery = todayScheduleQuery.or(`academic_year_id.eq.${activeYearId},academic_year_id.is.null`);
        if (activeSemesterId) todayScheduleQuery = todayScheduleQuery.or(`semester_id.eq.${activeSemesterId},semester_id.is.null`);
        const { data: schedules } = await todayScheduleQuery;
        setTodaySchedules(schedules || []);

        let assignmentQuery = supabaseClient
          .from("employee_schedules")
          .select("class_id")
          .eq("employee_id", employee.id)
          .not("class_id", "is", null);
        if (activeYearId) assignmentQuery = assignmentQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) assignmentQuery = assignmentQuery.eq("semester_id", activeSemesterId);
        const { data: assignedClasses } = await assignmentQuery;
        const { data: homeroomClasses } = await supabaseClient
          .from("classes")
          .select("id")
          .eq("homeroom_teacher_id", employee.id);
        const assignedClassIds = new Set<string>();
        (assignedClasses || []).forEach((row: any) => {
          if (row.class_id) assignedClassIds.add(row.class_id);
        });
        (homeroomClasses || []).forEach((row: any) => {
          if (row.id) assignedClassIds.add(row.id);
        });

        const { data: announcementRows } = await supabaseClient
          .from("announcements")
          .select("id, title, content, target_type, unit_id, class_id, publish_at, created_at, units(name), classes(name)")
          .eq("status", "terkirim")
          .order("publish_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);
        const now = Date.now();
        const scopedAnnouncements = (announcementRows || []).filter((item: any) => {
          if (item.publish_at && new Date(item.publish_at).getTime() > now) return false;
          if (item.target_type === "all" || item.target_type === "staff") return true;
          if (item.target_type === "unit") return !item.unit_id || item.unit_id === employee.unit_id;
          if (item.target_type === "class") return item.class_id && assignedClassIds.has(item.class_id);
          return false;
        });
        setRecentAnnouncements(scopedAnnouncements.slice(0, 3));
        const { data: receiptRows, error: receiptError } = await supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", employee.id);
        let readIds: string[] = (receiptRows || []).map((row: any) => row.announcement_id);
        if (receiptError) {
          try { readIds = JSON.parse(localStorage.getItem(READ_ANNOUNCEMENTS_KEY) || "[]"); } catch { readIds = []; }
        }

        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: taskRows } = user ? await supabaseClient.from("admin_tasks").select("id, status").eq("assigned_to", user.id) : { data: [] as any[] };
        const { data: reportRows } = assignedClassIds.size ? await supabaseClient.from("student_reports").select("id, status").in("class_id", Array.from(assignedClassIds)).neq("status", "archived") : { data: [] as any[] };

        let quranQuery = supabaseClient
          .from("quran_records")
          .select("id, record_type, fluency_score, date, students(full_name)")
          .eq("employee_id", employee.id)
          .order("date", { ascending: false })
          .limit(8);
        if (activeYearId) quranQuery = quranQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) quranQuery = quranQuery.eq("semester_id", activeSemesterId);
        const { data: quranRecords } = await quranQuery;
        setRecentQuranRecords(quranRecords || []);

        let assessmentQuery = supabaseClient
          .from("quran_assessments")
          .select("id, status")
          .eq("employee_id", employee.id);
        if (activeYearId) assessmentQuery = assessmentQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) assessmentQuery = assessmentQuery.eq("semester_id", activeSemesterId);
        const { data: assessments } = await assessmentQuery;

        const myAttendance = myAtt as any;
        const records = quranRecords || [];
        const assessmentList = assessments || [];
        const leaveList = leaves || [];
        setStats({
          myAttendance: myAttendance ? (myAttendance.status === "present" ? `Hadir (${myAttendance.time_in?.substring(0, 5)})` : myAttendance.status === "late" ? `Terlambat (${myAttendance.time_in?.substring(0, 5)})` : myAttendance.status === "leave" ? "Izin" : myAttendance.status === "sick" ? "Sakit" : myAttendance.status === "absent" ? "Alpa" : myAttendance.status) : "Belum Absen",
          classesToday: schedules?.length || 0,
          classCount: assignedClassIds.size,
          quranRecords: records.length,
          assessments: assessmentList.length,
          followUps: records.filter((record: any) => record.fluency_score === "Mengulang").length + assessmentList.filter((item: any) => item.status === "Mengulang" || item.status === "Lulus Bersyarat").length,
          pendingLeaves: leaveList.filter((leave: any) => leave.status === "pending").length,
          activeLeave: leaveList.some((leave: any) => leave.status === "approved" && isLeaveActiveOnDate(leave, todayStr)),
          substitutesToday: substituteRows?.length || 0,
          unreadAnnouncements: scopedAnnouncements.filter((item: any) => !readIds.includes(item.id)).length,
          pendingTasks: (taskRows || []).filter((item: any) => !["selesai", "completed", "cancelled"].includes(item.status)).length,
          pendingReports: (reportRows || []).filter((item: any) => ["draft", "teacher_input", "revision_needed"].includes(item.status)).length,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchDashboardData();
  }, [employee.id, employee.unit_id, activeYearId, activeSemesterId]);

  const hariIni = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const qualityChecklist = useMemo(() => ([
    { label: "Kehadiran", done: stats.myAttendance.includes("Hadir") || stats.myAttendance.includes("Terlambat"), value: stats.myAttendance },
    { label: "Izin", done: !stats.activeLeave && stats.pendingLeaves === 0, value: stats.activeLeave ? "Izin aktif" : `${stats.pendingLeaves} pending` },
    { label: "Inval", done: stats.substitutesToday === 0, value: `${stats.substitutesToday} tugas` },
    { label: "Informasi", done: stats.unreadAnnouncements === 0, value: `${stats.unreadAnnouncements} baru` },
    { label: "Tugas", done: stats.pendingTasks === 0, value: `${stats.pendingTasks} aktif` },
    { label: "Rapor", done: stats.pendingReports === 0, value: `${stats.pendingReports} perlu diisi` },
    { label: "Jadwal", done: stats.classesToday > 0, value: `${stats.classesToday} kelas` },
    { label: "Jurnal Qur'an", done: stats.quranRecords > 0, value: stats.quranRecords },
    { label: "Assessment", done: stats.assessments > 0, value: stats.assessments },
  ]), [stats]);

  return (
    <div className="p-4 md:p-0 space-y-6">
      <section className="rounded-md bg-emerald-800 p-6 text-white shadow-sm">
        <p className="text-sm text-emerald-100">Assalamu'alaikum,</p>
        <h1 className="mt-1 text-2xl font-black leading-tight">{employee.full_name}</h1>
        <p className="mt-2 text-sm text-emerald-100">{hariIni}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Kelas Hari Ini", value: stats.classesToday, icon: Calendar, color: "text-blue-700 bg-blue-50" },
          { label: "Absensi", value: stats.myAttendance.includes("Hadir") || stats.myAttendance.includes("Terlambat") ? "OK" : "Cek", icon: CalendarCheck, color: "text-emerald-700 bg-emerald-50" },
          { label: "Info Baru", value: stats.unreadAnnouncements, icon: Megaphone, color: "text-amber-700 bg-amber-50" },
          { label: "Tugas Aktif", value: stats.pendingTasks, icon: ListTodo, color: "text-blue-700 bg-blue-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-md border bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status hari ini</p>
              <h3 className="font-bold text-gray-900">{hariIni}</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Kehadiran</p>
              <p className={`text-sm font-bold ${stats.myAttendance.includes("Hadir") || stats.myAttendance.includes("Terlambat") ? "text-emerald-600" : "text-amber-600"}`}>{stats.myAttendance}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Jadwal</p>
              <p className="text-sm font-bold text-gray-900">{stats.classesToday} kelas</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Definition of done hari ini
          </h3>
          <div className="grid gap-2">
            {qualityChecklist.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.value}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.done ? "Ok" : "Cek"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 px-1 text-sm font-bold text-gray-900">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { to: "/teacher/tasks", label: "Tugas Saya", icon: ListTodo, color: "bg-blue-100 text-blue-700" },
            { to: "/teacher/classes", label: "Absen & Nilai", icon: UserCheck, color: "bg-emerald-100 text-emerald-600" },
            { to: "/teacher/reports", label: "Rapor Digital", icon: FileText, color: "bg-amber-100 text-amber-700" },
            { to: "/teacher/attendance", label: "Absensi Saya", icon: CalendarCheck, color: "bg-green-100 text-green-600" },
          ].map(({ to, label, icon: Icon, color }) => (
            <Link key={to} to={to} className="flex flex-col items-center justify-center gap-3 rounded-md border bg-white p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md">
              <div className={`rounded-full p-3 ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-center text-xs font-bold text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-3 flex items-end justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Informasi Terbaru</h3>
            <Link to="/teacher/announcements" className="flex items-center gap-0.5 text-xs font-bold text-primary hover:underline">
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {recentAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
              <Megaphone className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Belum ada pengumuman baru untuk Anda.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="divide-y">
                {recentAnnouncements.map((item: any) => (
                  <Link key={item.id} to="/teacher/announcements" className="block p-4 hover:bg-amber-50/40">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-bold text-gray-900">{item.title}</p>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        {item.target_type === "staff" ? "Staf" : item.target_type === "unit" ? "Unit" : item.target_type === "class" ? "Kelas" : "Umum"}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-5 text-gray-500">{item.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Jadwal Mengajar Hari Ini</h3>
            <Link to="/teacher/schedules" className="flex items-center gap-0.5 text-xs font-bold text-primary hover:underline">
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {todaySchedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
              <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Tidak ada jadwal mengajar hari ini.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="divide-y">
                {todaySchedules.map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 text-center">
                        <p className="text-sm font-bold text-gray-900">{schedule.start_time?.substring(0, 5)}</p>
                        <p className="text-xs text-gray-500">{schedule.end_time?.substring(0, 5)}</p>
                      </div>
                      <div className="h-10 w-px bg-gray-200" />
                      <div>
                        <h4 className="font-bold text-gray-900">{getScheduleSubjectName(schedule)}</h4>
                        <p className="mt-0.5 text-xs font-medium text-primary">{schedule.classes?.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900">Jurnal Qur'an Terakhir</h3>
            <Link to="/teacher/quran" className="flex items-center gap-0.5 text-xs font-bold text-primary hover:underline">
              Input <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {recentQuranRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Belum ada jurnal Qur'an yang Anda input pada semester ini.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="divide-y">
                {recentQuranRecords.slice(0, 5).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{record.students?.full_name || "Siswa"}</p>
                      <p className="text-xs text-gray-500">{record.record_type} - {new Date(record.date).toLocaleDateString("id-ID")}</p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${record.fluency_score === "Mengulang" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {record.fluency_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
