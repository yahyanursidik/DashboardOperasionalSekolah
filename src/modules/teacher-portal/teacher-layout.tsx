/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  Home,
  Library,
  ListTodo,
  Star,
  UserRound,
  ShieldAlert,
  Laptop,
  Wallet,
} from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { RolePortalShell, type RolePortalNavGroup } from "../../components/layout/RolePortalShell";
import { supabaseClient } from "../../lib/supabase/client";
import { loadEmployeePortalWorkspace, portalAccessMessage } from "../../lib/supabase/employee-portal-access";
import { PortalAccessNotice } from "../../components/auth/PortalAccessNotice";
import { getEmployeePosition } from "../employees/employee-role-config";
import { loadTeacherAssignedUnitIds } from "../schedules/schedule-data";
import { loadTeacherAssignedClassIds } from "./teacher-assignment-data";
import { publishDueAnnouncements } from "../../lib/announcements/publish-due";

const localReadKey = "teacher_portal_read_announcement_ids";

export const TeacherLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [attendanceActions, setAttendanceActions] = useState(0);
  const [hasPaudAssignment, setHasPaudAssignment] = useState(false);
  const [hasHblAssignment, setHasHblAssignment] = useState(false);
  const [hasQuranAssignment, setHasQuranAssignment] = useState(false);
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  useEffect(() => {
    let cancelled = false;
    const loadPortal = async () => {
      let authorized = false;
      setIsLoading(true);
      setLoadError("");
      try {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (cancelled) return;
      if (sessionError) throw sessionError;
      if (!session) {
        navigate("/teacher/login", { replace: true });
        return;
      }

      const { employee: currentEmployee } = await loadEmployeePortalWorkspace(supabaseClient, session.user.id, "teacher");
      if (cancelled) return;
      setEmployee(currentEmployee);
      authorized = true;
      setIsLoading(false);
      await publishDueAnnouncements().catch(() => 0);

      let scheduledClassQuery = supabaseClient
        .from("employee_schedules")
        .select("class_id, subject_id, subjects(quran_program_type)")
        .eq("employee_id", currentEmployee.id)
        .not("class_id", "is", null);
      if (activeYearId) scheduledClassQuery = scheduledClassQuery.eq("academic_year_id", activeYearId);
      if (activeSemesterId) scheduledClassQuery = scheduledClassQuery.eq("semester_id", activeSemesterId);

      const today = new Date().toLocaleDateString("en-CA");
      let quranHalaqohQuery = supabaseClient
        .from("tahfidz_halaqohs")
        .select("id")
        .eq("employee_id", currentEmployee.id);
      if (activeYearId) quranHalaqohQuery = quranHalaqohQuery.eq("academic_year_id", activeYearId);
      if (activeSemesterId) quranHalaqohQuery = quranHalaqohQuery.eq("semester_id", activeSemesterId);

      const [tasksResult, announcementsResult, readsResult, scheduledResult, assignmentClassResult, homeroomResult, eventsResult, overtimeResult, leaveResult, quranHalaqohResult, assignedUnitIds] = await Promise.all([
        supabaseClient.from("admin_tasks").select("id,status").eq("assigned_to", session.user.id),
        supabaseClient.from("announcements").select("id,target_type,unit_id,class_id,publish_at").eq("status", "terkirim"),
        supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", currentEmployee.id),
        scheduledClassQuery,
        loadTeacherAssignedClassIds(currentEmployee.id, activeYearId, activeSemesterId),
        supabaseClient.from("classes").select("id").eq("homeroom_teacher_id", currentEmployee.id),
        supabaseClient.from("attendance_event_participants").select("id,attendance_events(event_date,status)").eq("employee_id", currentEmployee.id),
        supabaseClient.from("employee_overtime").select("id,status,overtime_date").eq("employee_id", currentEmployee.id).in("status", ["pending", "approved"]),
        supabaseClient.from("leave_requests").select("id").eq("employee_id", currentEmployee.id).eq("status", "pending"),
        quranHalaqohQuery,
        loadTeacherAssignedUnitIds(currentEmployee.id, activeYearId, activeSemesterId),
      ]);
      if (cancelled) return;

      setPendingTasks((tasksResult.data || []).filter((task: any) => !["selesai", "completed", "cancelled"].includes(task.status)).length);
      let readIds = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
      if (readsResult.error) {
        try { readIds = new Set(JSON.parse(localStorage.getItem(localReadKey) || "[]")); } catch { readIds = new Set(); }
      }
      const classIds = new Set<string>([
        ...(scheduledResult.data || []).map((row: any) => row.class_id),
        ...(assignmentClassResult.data || []),
        ...(homeroomResult.data || []).map((row: any) => row.id),
      ].filter(Boolean));
      const now = Date.now();
      const accessibleUnitIds = new Set([currentEmployee.unit_id, ...assignedUnitIds].filter(Boolean));
      const { data: assignedUnits } = accessibleUnitIds.size
        ? await supabaseClient
            .from("units")
            .select("id,name,education_level,delivery_mode")
            .in("id", [...accessibleUnitIds] as string[])
        : { data: [] as any[] };
      setHasPaudAssignment((assignedUnits || []).some((unit: any) => {
        const name = String(unit.name || "").toLowerCase();
        return unit.education_level === "preschool" || ["paud", "tk", "kb", "preschool"].some((term) => name.includes(term));
      }));
      setHasHblAssignment((assignedUnits || []).some((unit: any) => unit.delivery_mode === "online"));
      const hasScheduledQuran = (scheduledResult.data || []).some((row: any) =>
        Boolean(row.subjects?.quran_program_type)
      );
      const hasAssignedQuran = (assignmentClassResult.assignments || []).some((assignment: any) =>
        assignment.role_type === "guru_quran" || Boolean(assignment.subjects?.quran_program_type)
      );
      setHasQuranAssignment(
        currentEmployee.position === "guru_quran"
        || hasScheduledQuran
        || hasAssignedQuran
        || (quranHalaqohResult.data || []).length > 0
      );
      const scopedAnnouncements = (announcementsResult.data || []).filter((item: any) => {
        if (item.publish_at && new Date(item.publish_at).getTime() > now) return false;
        if (["all", "staff"].includes(item.target_type)) return true;
        if (item.target_type === "unit") return !item.unit_id || accessibleUnitIds.has(item.unit_id);
        if (item.target_type === "class") return item.class_id && classIds.has(item.class_id);
        return false;
      });
      setUnreadAnnouncements(scopedAnnouncements.filter((item: any) => !readIds.has(item.id)).length);
      const eventCount = (eventsResult.data || []).filter((item: any) => item.attendance_events?.status === "published" && item.attendance_events?.event_date >= today).length;
      const overtimeCount = (overtimeResult.data || []).filter((item: any) => item.status === "pending" || item.overtime_date >= today).length;
      setAttendanceActions(eventCount + overtimeCount + (leaveResult.data || []).length);
      setIsLoading(false);
      } catch (error) {
        if (!cancelled && !authorized) { setLoadError(portalAccessMessage(error)); setIsLoading(false); }
      }
    };
    void loadPortal();
    return () => { cancelled = true; };
  }, [activeSemesterId, activeYearId, navigate, retry]);

  const navGroups = useMemo<RolePortalNavGroup[]>(() => {
    if (!employee) return [];
    const isLeadership = getEmployeePosition(employee.position).category === "leadership";
    return [
      { label: "Ringkasan", items: [{ to: "/teacher", label: "Beranda", icon: Home, exact: true }] },
      { label: "Pembelajaran", items: [
        { to: "/teacher/classes", label: "Kelas, Absensi & Nilai", icon: CheckSquare, keywords: ["siswa", "penilaian"] },
        { to: "/teacher/reports", label: "Rapor Digital", icon: FileText, keywords: ["sas", "asat", "semester"] },
        { to: "/teacher/cbt", label: "Ujian CBT", icon: Laptop, keywords: ["ujian online", "bank soal", "token", "sts", "sas"] },
        ...(hasQuranAssignment ? [{ to: "/teacher/quran", label: "Pembelajaran Qur'an", icon: BookOpen, keywords: ["tahfidz", "tahsin", "mutabaah"] }] : []),
        ...(hasPaudAssignment ? [{ to: "/teacher/paud", label: "Perkembangan KB/TK", icon: Star }] : []),
        ...(hasHblAssignment ? [{ to: "/teacher/hbl", label: "Pertemuan HBL", icon: Laptop, keywords: ["homeschooling", "live meet", "tema"] }] : []),
        { to: "/teacher/journals", label: "Jurnal & Tindak Lanjut Siswa", icon: ClipboardList },
        { to: "/teacher/conduct", label: "Tata Tertib & Prestasi", icon: ShieldAlert, keywords: ["poin", "pelanggaran", "bk"] },
        { to: "/teacher/library", label: "Perpustakaan Digital", icon: Library },
      ] },
      { label: "Pekerjaan", items: [
        { to: "/teacher/tasks", label: "Tugas Saya", icon: ListTodo, badge: pendingTasks },
        { to: "/teacher/schedules", label: isLeadership ? "Jadwal & Penugasan" : "Jadwal Mengajar", icon: Calendar },
        { to: "/teacher/announcements", label: "Informasi Sekolah", icon: Bell, badge: unreadAnnouncements },
        { to: "/teacher/onboarding", label: "Panduan, SOP & Kebijakan", icon: BookOpen },
      ] },
      { label: "Kepegawaian", items: [
        { to: "/teacher/attendance", label: "Absensi, Kegiatan & Lembur", icon: CalendarCheck, badge: attendanceActions },
        { to: "/teacher/leaves", label: "Izin & Cuti", icon: Clock },
        { to: "/teacher/payslips", label: "Slip Gaji", icon: Wallet },
        { to: "/teacher/performance", label: "Kinerja / PKG", icon: BarChart3 },
      ] },
      { label: "Akun", items: [{ to: "/teacher/profile", label: "Profil & Keamanan", icon: UserRound }] },
    ];
  }, [attendanceActions, employee, hasHblAssignment, hasPaudAssignment, hasQuranAssignment, pendingTasks, unreadAnnouncements]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/teacher/login", { replace: true });
  };

  if (loadError) return <PortalAccessNotice message={loadError} onRetry={() => setRetry((value) => value + 1)} onLogout={() => void handleLogout()} />;
  if (isLoading || !employee) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Menyiapkan portal pengajar...</div>;

  return (
    <RolePortalShell
      employee={employee}
      portalLabel="Portal Pengajar"
      roleLabel={getEmployeePosition(employee.position).label || "Guru / Pengajar"}
      navGroups={navGroups}
      storageKey="teacher-portal"
      onLogout={handleLogout}
      outletContext={{ employee }}
      mobilePrimaryPaths={["/teacher", "/teacher/classes", "/teacher/schedules"]}
      notificationPath="/teacher/announcements"
      showAcademicContext
    />
  );
};
