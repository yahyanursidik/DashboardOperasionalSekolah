/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { BookOpen, CalendarDays, CheckCircle2, GraduationCap, IdCard, Mail, MapPin, Phone, School, UserRound } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";
import { loadStudentLearningSchedules } from "../schedules/schedule-data";
import type { ParentPortalContext } from "./portal-context";

function formatGender(gender?: string | null) {
  if (gender === "L") return "Ikhwan";
  if (gender === "P") return "Akhawat";
  return "-";
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

export const PortalProfile: React.FC = () => {
  const { parent, student } = useOutletContext<ParentPortalContext>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoadingSchedules(true);
      try {
        if (!student?.class_id) {
          setSchedules([]);
          return;
        }

        const { data, error } = await loadStudentLearningSchedules({
          classId: student.class_id,
          unitId: student.unit_id || student.classes?.unit_id,
          academicYearId: activeYearId,
          semesterId: activeSemesterId,
        });
        if (error) console.error("Portal profile schedules error:", error);
        setSchedules(data || []);
      } catch (error) {
        console.error("Portal profile schedules error:", error);
      } finally {
        setIsLoadingSchedules(false);
      }
    };

    fetchSchedules();
  }, [activeSemesterId, activeYearId, student?.class_id, student?.classes?.unit_id, student?.unit_id]);

  const readiness = [
    { label: "Identitas siswa", done: Boolean(student?.full_name && student?.nis) },
    { label: "Kelas aktif", done: Boolean(student?.class_id || student?.classes?.name) },
    { label: "Unit sekolah", done: Boolean(student?.unit_id || student?.classes?.units?.name) },
    { label: "Jadwal pelajaran", done: schedules.length > 0 },
  ];

  const relationshipLabel = ({ father: "Ayah", mother: "Ibu", guardian: "Wali" } as Record<string, string>)[student.relationship || ""] || "Orang tua / wali";

  return (
    <div className="p-4 space-y-6">
      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="h-20 bg-emerald-700" />
        <div className="-mt-8 px-5 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4 min-w-0">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-4 border-white bg-emerald-100 text-xl font-black text-emerald-700 shadow-sm">
                {getInitials(student?.full_name)}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="truncate text-2xl font-black text-gray-900">{student?.full_name || "Siswa"}</h1>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {[student?.classes?.units?.name, student?.classes?.name].filter(Boolean).join(" - ") || "Kelas belum diisi"}
                </p>
              </div>
            </div>
            <span className="w-max rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
              {student?.status || "active"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "NIS", value: student?.nis || "-", icon: IdCard, tone: "bg-blue-50 text-blue-700" },
          { label: "Kelas", value: student?.classes?.name || "-", icon: GraduationCap, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Unit", value: student?.classes?.units?.name || "-", icon: School, tone: "bg-amber-50 text-amber-700" },
          { label: "Jadwal", value: isLoadingSchedules ? "-" : schedules.length, icon: CalendarDays, tone: "bg-purple-50 text-purple-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="truncate text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <UserRound className="h-5 w-5 text-primary" />
            Data Siswa
          </h3>
          <div className="divide-y">
            {[
              ["Nama Lengkap", student?.full_name],
              ["NIS / NISN", [student?.nis, student?.nisn].filter(Boolean).join(" / ")],
              ["Jenis Kelamin", formatGender(student?.gender)],
              ["Kelas", student?.classes?.name],
              ["Unit", student?.classes?.units?.name],
            ].map(([label, value]) => (
              <div key={label} className="py-3">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900">{value || "-"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Kesiapan Portal
          </h3>
          <div className="space-y-2">
            {readiness.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
                <span className="text-sm font-bold text-gray-800">{item.label}</span>
                <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-emerald-600" : "text-gray-300"}`} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Jadwal pelajaran mengikuti kelas aktif siswa. Jika jadwal belum muncul, hubungi wali kelas/admin akademik untuk memastikan jadwal semester sudah dibuat.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-bold text-gray-900"><UserRound className="h-5 w-5 text-emerald-600" /> Data Orang Tua / Wali</h3>
              <p className="mt-1 text-xs text-gray-500">Kontak utama yang dipakai sekolah untuk komunikasi resmi.</p>
            </div>
            <span className="w-max rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{relationshipLabel}{student.is_primary_guardian ? " utama" : ""}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [UserRound, "Nama", parent.full_name],
              [Phone, "No. HP / WhatsApp", parent.phone],
              [Mail, "Email portal", parent.email],
              [MapPin, "Alamat", parent.address],
            ].map(([Icon, label, value]) => {
              const DataIcon = Icon as typeof UserRound;
              return <div key={String(label)} className="flex gap-3 rounded-md border bg-gray-50 p-3"><DataIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div className="min-w-0"><p className="text-xs font-semibold text-gray-500">{String(label)}</p><p className="mt-0.5 break-words text-sm font-bold text-gray-900">{String(value || "Belum diisi")}</p></div></div>;
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900">Perlu perubahan data?</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">Data identitas tidak diubah langsung agar riwayat administrasi tetap terjaga. Ajukan koreksi dan admin sekolah akan memverifikasinya.</p>
          <Link to="/portal/requests?type=data_correction" className="mt-4 inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">Ajukan koreksi data</Link>
        </div>
      </section>

      <LessonSchedulePanel
        schedules={schedules}
        isLoading={isLoadingSchedules}
        title="Jadwal Pelajaran Siswa"
        description="Jadwal pelajaran kelas aktif yang dapat dipantau orang tua untuk mendampingi persiapan belajar harian."
        emptyMessage="Belum ada jadwal pelajaran untuk kelas siswa ini."
        defaultType="mengajar"
        compact
      />

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-900">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          Catatan Workflow
        </h3>
        <p className="text-sm leading-6 text-gray-500">
          Jadwal ini menjadi acuan persiapan buku, tugas, hafalan, dan komunikasi dengan wali kelas. Perubahan dari admin akademik akan otomatis tercermin di portal. Gunakan menu Pengajuan bila ada jadwal atau penugasan yang perlu dikonfirmasi.
        </p>
      </section>
    </div>
  );
};
