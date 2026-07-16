/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  Home,
  Laptop,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react";
import { RolePortalShell, type RolePortalNavGroup } from "../../components/layout/RolePortalShell";
import { supabaseClient } from "../../lib/supabase/client";

function relationRoleName(value: any) {
  const role = Array.isArray(value?.roles) ? value.roles[0] : value?.roles;
  return role?.name;
}

export const HrdPortalLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [activeApplicants, setActiveApplicants] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPortal = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/hrd/login", { replace: true });
        return;
      }

      const [employeeResult, rolesResult] = await Promise.all([
        supabaseClient.from("employees").select("*,units(name)").eq("user_id", session.user.id).eq("status", "active").maybeSingle(),
        supabaseClient.from("user_roles").select("roles(name)").eq("user_id", session.user.id),
      ]);
      const roles = (rolesResult.data || []).map(relationRoleName).filter(Boolean);
      const hasAccess = roles.some((role) => ["hrd", "super_admin", "ketua_yayasan"].includes(role));
      if (!hasAccess || !employeeResult.data) {
        await supabaseClient.auth.signOut();
        navigate("/hrd/login", { replace: true });
        return;
      }

      setEmployee(employeeResult.data);
      const [leaveResult, reviewResult, applicantResult] = await Promise.all([
        supabaseClient.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseClient.from("attendance_correction_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseClient.from("recruitment_applicants").select("id", { count: "exact", head: true }).not("status", "in", "(lulus,ditolak,withdrawn)"),
      ]);
      setPendingLeaves(leaveResult.count || 0);
      setPendingReviews(reviewResult.count || 0);
      setActiveApplicants(applicantResult.count || 0);
      setIsLoading(false);
    };
    void loadPortal();
  }, [navigate]);

  const navGroups = useMemo<RolePortalNavGroup[]>(() => [
    { label: "Ringkasan", items: [{ to: "/hrd", label: "Beranda HRD", icon: Home, exact: true }] },
    { label: "Data SDM", items: [
      { to: "/employees", label: "Data Pegawai", icon: Users, keywords: ["guru", "staf", "nik", "kontrak"] },
      { to: "/schedules", label: "Jadwal & Penugasan", icon: CalendarCheck, keywords: ["shift", "mengajar", "lintas unit"] },
      { to: "/onboarding", label: "Onboarding, SOP & Kebijakan", icon: BookOpen },
    ] },
    { label: "Kehadiran & Hak Pegawai", items: [
      { to: "/attendance/employees", label: "Absensi Pegawai", icon: UserCheck },
      { to: "/attendance/reviews", label: "Koreksi Absensi", icon: ClipboardCheck, badge: pendingReviews },
      { to: "/attendance/events", label: "Rapat & Kegiatan", icon: CalendarCheck },
      { to: "/attendance/overtime", label: "Lembur & Kompensasi", icon: Clock3 },
      { to: "/leaves", label: "Izin & Cuti", icon: ClipboardList, badge: pendingLeaves },
      { to: "/attendance/settings", label: "Aturan, Shift & Lokasi", icon: Settings2 },
    ] },
    { label: "Rekrutmen", items: [
      { to: "/hrd/vacancies", label: "Lowongan & Kebutuhan SDM", icon: Briefcase },
      { to: "/hrd/applicants", label: "Pelamar & Seleksi", icon: Users, badge: activeApplicants },
      { to: "/hrd/cbt/banks", label: "Bank Soal CBT", icon: BookOpen },
      { to: "/hrd/cbt/exams", label: "Ujian CBT", icon: Laptop },
      { to: "/hrd/cbt/results", label: "Hasil CBT", icon: FileText },
    ] },
    { label: "Mutu & Pelaporan", items: [
      { to: "/pkg", label: "PKG & Kinerja Guru", icon: BarChart3 },
      { to: "/operations/reports", label: "Laporan Operasional Staf", icon: FileText },
      { to: "/announcements", label: "Pengumuman Pegawai", icon: Bell },
    ] },
  ], [activeApplicants, pendingLeaves, pendingReviews]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/hrd/login", { replace: true });
  };

  if (isLoading || !employee) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Menyiapkan pusat HRD...</div>;

  return (
    <RolePortalShell
      employee={employee}
      portalLabel="Portal HRD"
      roleLabel="Manajemen SDM Yayasan"
      navGroups={navGroups}
      storageKey="hrd-portal"
      onLogout={handleLogout}
      outletContext={{ employee }}
      mobilePrimaryPaths={["/hrd", "/employees", "/attendance/employees"]}
      notificationPath="/announcements"
    />
  );
};
