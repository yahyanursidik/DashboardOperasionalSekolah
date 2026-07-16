/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";

type DashboardData = {
  employees: any[];
  attendance: any[];
  leaves: any[];
  corrections: any[];
  overtime: any[];
  vacancies: any[];
  applicants: any[];
};

const emptyData: DashboardData = { employees: [], attendance: [], leaves: [], corrections: [], overtime: [], vacancies: [], applicants: [] };

function relationName(value: any) {
  if (Array.isArray(value)) return value[0]?.name;
  return value?.name;
}

export const HrdDashboard: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      const today = new Date().toLocaleDateString("en-CA");
      const [employeeResult, attendanceResult, leaveResult, correctionResult, overtimeResult, vacancyResult, applicantResult] = await Promise.all([
        supabaseClient.from("employees").select("id,full_name,nik,email,phone,user_id,position,employment_type,unit_id,units(name)").eq("status", "active").order("full_name"),
        supabaseClient.from("employee_attendance").select("employee_id,status,time_in,time_out").eq("date", today),
        supabaseClient.from("leave_requests").select("id,leave_type,start_date,end_date,status,employees(full_name,units(name))").eq("status", "pending").order("created_at", { ascending: false }).limit(8),
        supabaseClient.from("attendance_correction_requests").select("id,request_type,request_date,status,employees(full_name,units(name))").eq("status", "pending").order("created_at", { ascending: false }).limit(8),
        supabaseClient.from("employee_overtime").select("id,overtime_date,status,reason,employees(full_name,units(name))").eq("status", "pending").order("created_at", { ascending: false }).limit(8),
        supabaseClient.from("recruitment_vacancies").select("id,title,status,unit_id,units(name)").eq("status", "open").order("created_at", { ascending: false }),
        supabaseClient.from("recruitment_applicants").select("id,full_name,status,vacancy_id,recruitment_vacancies(title)").order("created_at", { ascending: false }).limit(200),
      ]);
      setData({
        employees: employeeResult.data || [],
        attendance: attendanceResult.data || [],
        leaves: leaveResult.data || [],
        corrections: correctionResult.data || [],
        overtime: overtimeResult.data || [],
        vacancies: vacancyResult.data || [],
        applicants: applicantResult.data || [],
      });
      setIsLoading(false);
    };
    void loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const attendanceEmployeeIds = new Set(data.attendance.map((row) => row.employee_id));
    const present = data.attendance.filter((row) => ["present", "late"].includes(row.status)).length;
    const incompleteProfiles = data.employees.filter((row) => !row.nik || !row.full_name || !row.email || !row.phone || !row.user_id).length;
    const unitMap = new Map<string, number>();
    data.employees.forEach((row) => {
      const unit = relationName(row.units) || "Lintas unit";
      unitMap.set(unit, (unitMap.get(unit) || 0) + 1);
    });
    return {
      totalEmployees: data.employees.length,
      attendanceRecorded: attendanceEmployeeIds.size,
      present,
      attendancePercent: data.employees.length ? Math.round((attendanceEmployeeIds.size / data.employees.length) * 100) : 0,
      incompleteProfiles,
      activeApplicants: data.applicants.filter((row) => !["lulus", "ditolak", "withdrawn"].includes(row.status)).length,
      acceptedApplicants: data.applicants.filter((row) => row.status === "lulus").length,
      units: Array.from(unitMap.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [data]);

  const queues = [
    { label: "Izin dan cuti", value: data.leaves.length, to: "/leaves", icon: FileText, tone: "bg-amber-50 text-amber-700", note: "Menunggu keputusan" },
    { label: "Koreksi absensi", value: data.corrections.length, to: "/attendance/reviews", icon: ClipboardCheck, tone: "bg-blue-50 text-blue-700", note: "Perlu validasi" },
    { label: "Pengajuan lembur", value: data.overtime.length, to: "/attendance/overtime", icon: Clock3, tone: "bg-violet-50 text-violet-700", note: "Perlu peninjauan" },
    { label: "Profil belum lengkap", value: summary.incompleteProfiles, to: "/employees", icon: AlertTriangle, tone: "bg-red-50 text-red-700", note: "NIK, kontak, atau akun" },
  ];

  const maxUnitCount = Math.max(...summary.units.map(([, count]) => count), 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Assalamu'alaikum, {employee?.full_name || "Tim HRD"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal sm:text-3xl">Pusat Kendali SDM</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Pantau kesiapan tenaga pendidik dan kependidikan, selesaikan antrean hak pegawai, lalu tindak lanjuti kebutuhan rekrutmen.</p>
        </div>
        <Link to="/employees/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"><Users className="h-4 w-4" /> Tambah Pegawai</Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pegawai Aktif", value: summary.totalEmployees, detail: `${summary.units.length} unit penempatan`, icon: Users, tone: "bg-blue-50 text-blue-700" },
          { label: "Kehadiran Tercatat", value: `${summary.attendancePercent}%`, detail: `${summary.attendanceRecorded} dari ${summary.totalEmployees} pegawai`, icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Hadir / Terlambat", value: summary.present, detail: "Rekaman hari ini", icon: UserCheck, tone: "bg-cyan-50 text-cyan-700" },
          { label: "Kandidat Aktif", value: summary.activeApplicants, detail: `${data.vacancies.length} lowongan dibuka`, icon: Briefcase, tone: "bg-amber-50 text-amber-700" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${tone}`}><Icon className="h-5 w-5" /></div>
            <p className="text-2xl font-bold">{isLoading ? "-" : value}</p><p className="mt-1 text-sm font-bold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Antrean prioritas</h2><p className="mt-1 text-xs text-muted-foreground">Permohonan yang perlu ditangani oleh HRD atau pimpinan.</p></div><ShieldCheck className="h-5 w-5 text-primary" /></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {queues.map(({ label, value, to, icon: Icon, tone, note }) => (
              <Link key={label} to={to} className="flex items-center gap-3 rounded-md border p-4 transition hover:border-primary/40 hover:bg-muted/30">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="text-lg font-bold">{isLoading ? "-" : value}</p><p className="truncate text-sm font-semibold">{label}</p><p className="truncate text-xs text-muted-foreground">{note}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-bold">Sebaran pegawai</h2><p className="mt-1 text-xs text-muted-foreground">Jumlah pegawai aktif per unit.</p></div><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div className="mt-5 space-y-4">
            {summary.units.slice(0, 6).map(([unit, count]) => <div key={unit}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold">{unit}</span><span className="font-bold">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((count / maxUnitCount) * 100, 6)}%` }} /></div></div>)}
            {!isLoading && summary.units.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data penempatan unit.</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Rekrutmen berjalan</h2><p className="mt-1 text-xs text-muted-foreground">Kebutuhan formasi dan kandidat yang masih diproses.</p></div><Link to="/hrd/vacancies" className="text-xs font-bold text-primary hover:underline">Lihat lowongan</Link></div>
          <div className="divide-y">
            {data.vacancies.slice(0, 5).map((vacancy) => {
              const applicantCount = data.applicants.filter((row) => row.vacancy_id === vacancy.id && !["ditolak", "withdrawn"].includes(row.status)).length;
              return <Link key={vacancy.id} to="/hrd/applicants" className="flex items-center gap-3 p-4 hover:bg-muted/30"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700"><Briefcase className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{vacancy.title}</p><p className="truncate text-xs text-muted-foreground">{relationName(vacancy.units) || "Lintas unit"}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{applicantCount} kandidat</span></Link>;
            })}
            {!isLoading && data.vacancies.length === 0 ? <div className="p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm font-semibold">Tidak ada lowongan aktif.</p></div> : null}
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-5"><h2 className="font-bold">Akses cepat</h2><p className="mt-1 text-xs text-muted-foreground">Pekerjaan HRD yang paling sering dilakukan.</p></div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {[
              { to: "/attendance/employees", label: "Rekap Kehadiran", icon: CalendarCheck },
              { to: "/leaves", label: "Proses Izin", icon: ClipboardCheck },
              { to: "/schedules", label: "Atur Jadwal", icon: Clock3 },
              { to: "/pkg", label: "Kinerja / PKG", icon: TrendingUp },
              { to: "/attendance/settings", label: "Aturan Absensi", icon: ShieldCheck },
              { to: "/operations/reports", label: "Laporan Staf", icon: FileText },
            ].map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border p-3 text-center text-xs font-bold transition hover:border-primary/40 hover:bg-primary/5"><Icon className="h-5 w-5 text-primary" />{label}</Link>)}
          </div>
        </div>
      </section>
    </div>
  );
};
