import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  LockKeyhole,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { getScheduleSubjectName } from "../schedules/schedule-utils";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";

function formatPosition(position?: string | null) {
  const map: Record<string, string> = {
    guru: "Guru / Pengajar",
    guru_quran: "Guru Al Qur'an",
    kepala_sekolah: "Kepala Sekolah",
    wakasek_umum: "Wakasek Umum",
    wakasek_kurikulum: "Wakasek Kurikulum",
    wakasek_kesiswaan: "Wakasek Kesiswaan",
    kepala_unit: "Kepala Unit",
    tu: "Tata Usaha",
    bendahara: "Bendahara",
    bk: "Bimbingan Konseling",
  };
  return map[position || ""] || position || "-";
}

function getInitials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-gray-900">{value || "-"}</p>
      </div>
    </div>
  );
}

export const TeacherProfile: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [profile, setProfile] = useState<any>(employee);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [homeroomClasses, setHomeroomClasses] = useState<any[]>([]);
  const [halaqohs, setHalaqohs] = useState<any[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return toast.error("Kata sandi minimal 8 karakter.");
    if (password !== confirmPassword) return toast.error("Konfirmasi kata sandi belum sama.");
    setIsUpdatingPassword(true);
    const { error } = await supabaseClient.auth.updateUser({ password });
    setIsUpdatingPassword(false);
    if (error) return toast.error("Kata sandi gagal diperbarui", { description: error.message });
    setPassword("");
    setConfirmPassword("");
    toast.success("Kata sandi berhasil diperbarui.");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        let scheduleQuery = supabaseClient
          .from("employee_schedules")
          .select("id, day_of_week, start_time, end_time, schedule_type, subject, subject_id, unit_id, classes(name, unit_id, units(name)), units(name), subjects(name)")
          .eq("employee_id", employee.id)
          .order("day_of_week")
          .order("start_time");
        if (activeYearId) scheduleQuery = scheduleQuery.or(`academic_year_id.eq.${activeYearId},academic_year_id.is.null`);
        if (activeSemesterId) scheduleQuery = scheduleQuery.or(`semester_id.eq.${activeSemesterId},semester_id.is.null`);

        let homeroomQuery = supabaseClient
          .from("classes")
          .select("id, name, level, unit_id, academic_year_id, units(name)")
          .eq("homeroom_teacher_id", employee.id)
          .order("name");
        if (activeYearId) homeroomQuery = homeroomQuery.eq("academic_year_id", activeYearId);

        let halaqohQuery = supabaseClient
          .from("tahfidz_halaqohs")
          .select("id, name, program_type, academic_year_id, semester_id")
          .eq("employee_id", employee.id)
          .order("name");
        if (activeYearId) halaqohQuery = halaqohQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) halaqohQuery = halaqohQuery.eq("semester_id", activeSemesterId);

        const [{ data: employeeData }, { data: scheduleData }, { data: homeroomData }, { data: halaqohData }, { data: attendanceData }] = await Promise.all([
          supabaseClient.from("employees").select("*, units(name)").eq("id", employee.id).single(),
          scheduleQuery,
          homeroomQuery,
          halaqohQuery,
          supabaseClient.from("employee_attendance").select("id, date, status, time_in, time_out").eq("employee_id", employee.id).order("date", { ascending: false }).limit(10),
        ]);

        if (employeeData) setProfile(employeeData);
        setSchedules(scheduleData || []);
        setHomeroomClasses(homeroomData || []);
        setHalaqohs(halaqohData || []);
        setAttendanceRows(attendanceData || []);
      } catch (error) {
        console.error("Teacher profile fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [activeSemesterId, activeYearId, employee.id]);

  const teachingSchedules = useMemo(() => schedules.filter((schedule) => schedule.schedule_type === "mengajar"), [schedules]);
  const supportSchedules = useMemo(() => schedules.filter((schedule) => schedule.schedule_type !== "mengajar"), [schedules]);
  const subjects = useMemo(() => {
    const names = teachingSchedules.map((schedule) => getScheduleSubjectName(schedule)).filter((name) => name && name !== "Mata Pelajaran");
    return Array.from(new Set(names));
  }, [teachingSchedules]);
  const assignedClassNames = useMemo(() => {
    const names = [
      ...teachingSchedules.map((schedule) => schedule.classes?.name).filter(Boolean),
      ...homeroomClasses.map((cls) => cls.name).filter(Boolean),
    ];
    return Array.from(new Set(names));
  }, [homeroomClasses, teachingSchedules]);
  const assignedUnits = useMemo(() => {
    const names = [
      ...schedules.map((schedule) => schedule.units?.name || schedule.classes?.units?.name).filter(Boolean),
      ...homeroomClasses.map((cls) => cls.units?.name).filter(Boolean),
    ];
    return Array.from(new Set(names));
  }, [homeroomClasses, schedules]);
  const presentCount = attendanceRows.filter((item) => item.status === "present" || item.status === "late").length;
  const attendanceValue = attendanceRows.length > 0 ? `${presentCount}/${attendanceRows.length}` : "-";
  const checklist = [
    { label: "NIK dan nama lengkap", done: Boolean(profile?.nik && profile?.full_name) },
    { label: "Kontak aktif", done: Boolean(profile?.phone || profile?.email) },
    { label: "Unit dan jabatan", done: Boolean(profile?.unit_id && profile?.position) },
    { label: "Jabatan utama", done: Boolean(profile?.position) },
    { label: "Penugasan periode aktif", done: teachingSchedules.length > 0 || homeroomClasses.length > 0 || halaqohs.length > 0 },
  ];
  const completed = checklist.filter((item) => item.done).length;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/teacher" className="p-2 bg-white rounded-full shadow-sm border text-gray-600 hover:text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="font-bold text-lg text-gray-900">Profil Guru</h2>
          <p className="text-xs text-gray-500">Identitas, penugasan, dan kesiapan data portal.</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="h-20 bg-gradient-to-br from-emerald-600 to-teal-700" />
        <div className="px-5 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
              <div className="-mt-8 flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-emerald-100 text-2xl font-black text-emerald-700 shadow-lg">
                {getInitials(profile?.full_name)}
              </div>
              <div className="min-w-0 pt-3">
                <h1 className="break-words text-2xl font-black leading-tight text-gray-900">{profile?.full_name}</h1>
                <p className="mt-1 break-words text-sm font-semibold text-gray-500">{formatPosition(profile?.position)} - {profile?.units?.name || "Unit belum diisi"}</p>
              </div>
            </div>
            <span className={`w-max rounded-full border px-3 py-1 text-xs font-bold uppercase md:mt-3 ${profile?.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {profile?.status === "active" ? "Aktif" : profile?.status || "Status belum jelas"}
            </span>
          </div>

          {assignedClassNames.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {assignedClassNames.map((className) => (
                <span key={className} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  {className}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Jadwal Mengajar", value: teachingSchedules.length, icon: Calendar, tone: "bg-blue-50 text-blue-700" },
          { label: "Tugas Tambahan", value: supportSchedules.length, icon: Briefcase, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Mapel", value: subjects.length, icon: BookOpen, tone: "bg-amber-50 text-amber-700" },
          { label: "Hadir Riwayat", value: attendanceValue, icon: Clock, tone: "bg-cyan-50 text-cyan-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{isLoading ? "-" : value}</p>
            <p className="text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <User className="h-5 w-5 text-primary" />
            Data Pribadi
          </h3>
          <InfoRow icon={ShieldCheck} label="NIK" value={profile?.nik} />
          <InfoRow icon={Mail} label="Email Login" value={profile?.email} />
          <InfoRow icon={Phone} label="No. HP / WhatsApp" value={profile?.phone} />
          <InfoRow icon={MapPin} label="Alamat" value={profile?.address} />
          <InfoRow icon={Award} label="Pendidikan / Sertifikasi" value={[profile?.education, profile?.certification].filter(Boolean).join(" - ")} />
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Kesiapan Data
            </h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{completed}/{checklist.length}</span>
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
                <span className="text-sm font-bold text-gray-800">{item.label}</span>
                {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Jika ada data yang belum lengkap, ajukan pembaruan ke admin/HRD agar jadwal, absensi, PKG, dan komunikasi sekolah berjalan rapi.
          </p>
        </div>
      </section>

      <LessonSchedulePanel
        schedules={schedules}
        isLoading={isLoading}
        title="Jadwal Mengajar & Tugas Tambahan"
        description="Menampilkan jadwal mengajar dan tugas pendukung pada tahun ajaran aktif. Gunakan filter untuk melihat unit, pelajaran, atau tugas non-mengajar."
        emptyMessage="Belum ada jadwal mengajar atau tugas tambahan pada periode aktif."
        compact
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Briefcase className="h-5 w-5 text-amber-600" />
            Wali Kelas Aktif
          </h3>
          {homeroomClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">Belum ada kelas wali pada tahun ajaran aktif.</div>
          ) : (
            <div className="space-y-3">
              {homeroomClasses.map((cls) => (
                <div key={`wali-${cls.id}`} className="rounded-xl border bg-amber-50 p-3">
                  <p className="text-sm font-black text-amber-900">Wali Kelas {cls.name}</p>
                  <p className="text-xs text-amber-700">
                    {[cls.units?.name, cls.level ? `Tingkat ${cls.level}` : null].filter(Boolean).join(" - ") || "Kelas aktif"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Halaqoh Qur'an
          </h3>
          {halaqohs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">Belum ada halaqoh yang ditugaskan pada periode aktif.</div>
          ) : (
            <div className="space-y-3">
              {halaqohs.map((halaqoh) => (
                <div key={halaqoh.id} className="rounded-xl border bg-emerald-50 p-3">
                  <p className="text-sm font-black text-emerald-900">{halaqoh.name}</p>
                  <p className="text-xs font-semibold uppercase text-emerald-700">{halaqoh.program_type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
          <Building2 className="h-5 w-5 text-blue-600" />
          Unit Penugasan
        </h3>
        {assignedUnits.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">Belum ada unit penugasan aktif.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedUnits.map((unit) => (
              <span key={unit} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {unit}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-emerald-700" /><div><h3 className="font-bold text-gray-900">Keamanan Akun</h3><p className="text-xs text-gray-500">Gunakan kata sandi pribadi yang tidak dipakai di layanan lain.</p></div></div>
        <form onSubmit={updatePassword} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-bold text-gray-700">Kata sandi baru<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-gray-700">Ulangi kata sandi<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ketik sekali lagi" className="mt-1 h-10 w-full rounded-md border px-3 text-sm font-normal" /></label><button disabled={isUpdatingPassword || !password || !confirmPassword} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">{isUpdatingPassword ? "Menyimpan..." : "Perbarui"}</button></form>
      </section>
    </div>
  );
};
