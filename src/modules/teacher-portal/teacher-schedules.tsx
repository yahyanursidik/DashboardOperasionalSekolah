/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { AlertTriangle, Clock3 } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";
import { canUseTeachingScheduleAttendance } from "../employees/employee-role-config";
import { getEmployeePosition } from "../employees/employee-role-config";
import { PageHeader } from "../../components/layout/PageHeader";

export const TeacherSchedules: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const followsTeachingSchedule = employee.attendance_mode === "teaching_schedule" && canUseTeachingScheduleAttendance(employee.position);
  const isLeadership = getEmployeePosition(employee.position).category === "leadership";
  const activeTeachingSchedules = schedules.filter((schedule) => schedule.schedule_type === "mengajar");

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        let query = supabaseClient
          .from("employee_schedules")
          .select("*, classes(name, unit_id, units(name)), units(name), subjects(name), attendance_shifts(name,check_in_open,check_in_close)")
          .eq("employee_id", employee.id)
          .order("start_time");

        if (activeYearId) query = query.or(`academic_year_id.eq.${activeYearId},academic_year_id.is.null`);
        if (activeSemesterId) query = query.or(`semester_id.eq.${activeSemesterId},semester_id.is.null`);
        const { data } = await query;

        setSchedules(data || []);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [employee.id, activeSemesterId, activeYearId]);

  return (
    <div className="space-y-6 p-4 md:p-0">
      <PageHeader title={isLeadership ? "Jadwal & Penugasan" : "Jadwal Pelajaran"} description="Lintas unit, kelas, mata pelajaran, dan tugas pendukung pada periode aktif." />

      {followsTeachingSchedule && !loading && (
        <section className={`flex items-start gap-3 rounded-lg border p-4 ${activeTeachingSchedules.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          {activeTeachingSchedules.length > 0
            ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
          <div>
            <p className={`text-sm font-bold ${activeTeachingSchedules.length > 0 ? "text-emerald-900" : "text-amber-900"}`}>
              {activeTeachingSchedules.length > 0 ? "Absensi mengikuti jadwal mengajar" : "Jadwal mengajar belum tersedia"}
            </p>
            <p className={`mt-1 text-xs leading-5 ${activeTeachingSchedules.length > 0 ? "text-emerald-800" : "text-amber-800"}`}>
              {activeTeachingSchedules.length > 0
                ? "Pada hari mengajar, keterlambatan dihitung dari pelajaran pertama dan kewajiban hadir berakhir pada tugas terakhir. Datang lebih awal tetap diterima; hari tanpa jadwal tidak dihitung sebagai belum absen."
                : "Pola absensi part-time sudah aktif, tetapi belum ada jadwal mengajar pada tahun ajaran dan semester aktif. Hubungi admin kurikulum sebelum mulai mengajar."}
            </p>
          </div>
        </section>
      )}

      <LessonSchedulePanel
        schedules={schedules}
        isLoading={loading}
        title="Jadwal Pelajaran Multi Unit"
        description="Menampilkan seluruh jadwal mengajar dan tugas pendukung yang tertaut ke Anda, termasuk bila mengajar di lebih dari satu unit."
        emptyMessage="Belum ada jadwal pelajaran pada penugasan aktif."
      />
    </div>
  );
};
