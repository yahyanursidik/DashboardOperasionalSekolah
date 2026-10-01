/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
  Wallet,
} from "lucide-react";
import { RolePortalShell, type RolePortalNavGroup } from "../../components/layout/RolePortalShell";
import { supabaseClient } from "../../lib/supabase/client";
import { loadEmployeePortalWorkspace, portalAccessMessage } from "../../lib/supabase/employee-portal-access";
import { PortalAccessNotice } from "../../components/auth/PortalAccessNotice";

export const HrdPortalLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [activeApplicants, setActiveApplicants] = useState(0);
  const navigate = useNavigate();

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
        navigate("/hrd/login", { replace: true });
        return;
      }

      const { employee: currentEmployee } = await loadEmployeePortalWorkspace(supabaseClient, session.user.id, "hrd");
      if (cancelled) return;
      setEmployee(currentEmployee);
      authorized = true;
      setIsLoading(false);
      const [leaveResult, reviewResult, applicantResult] = await Promise.all([
        supabaseClient.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseClient.from("attendance_correction_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseClient.from("recruitment_applicants").select("id", { count: "exact", head: true }).not("status", "in", "(lulus,ditolak,withdrawn)"),
      ]);
      if (cancelled) return;
      setPendingLeaves(leaveResult.count || 0);
      setPendingReviews(reviewResult.count || 0);
      setActiveApplicants(applicantResult.count || 0);
      setIsLoading(false);
      } catch (error) {
        if (!cancelled && !authorized) { setLoadError(portalAccessMessage(error)); setIsLoading(false); }
      }
    };
    void loadPortal();
    return () => { cancelled = true; };
  }, [navigate, retry]);

  const navGroups = useMemo<RolePortalNavGroup[]>(() => [
    { label: "Ringkasan", items: [{ to: "/hrd", label: "Beranda HRD", icon: Home, exact: true }] },
    { label: "Data SDM", items: [
      { to: "/employees", label: "Data Pegawai", icon: Users, keywords: ["guru", "staf", "nik", "kontrak"] },
      { to: "/schedules", label: "Jadwal & Penugasan", icon: CalendarCheck, keywords: ["shift", "mengajar", "lintas unit"] },
      { to: "/onboarding", label: "Onboarding, SOP & Kebijakan", icon: BookOpen },
    ] },
    { label: "Kehadiran & Hak Pegawai", items: [
      { to: "/attendance/employees", label: "Absensi Pegawai", icon: UserCheck },
      { to: "/payroll", label: "Penggajian", icon: Wallet, keywords: ["gaji", "slip", "tunjangan"] },
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

  if (loadError) return <PortalAccessNotice message={loadError} onRetry={() => setRetry((value) => value + 1)} onLogout={() => void handleLogout()} />;
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
