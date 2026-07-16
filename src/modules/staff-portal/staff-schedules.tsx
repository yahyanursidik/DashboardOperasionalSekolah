/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";
import { PageHeader } from "../../components/layout/PageHeader";
import { toast } from "sonner";

export const StaffSchedules: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      try {
        let query = supabaseClient
          .from("employee_schedules")
          .select("*, classes(name, unit_id, units(name)), units(name), subjects(name), attendance_shifts(name,check_in_open,check_in_close)")
          .eq("employee_id", employee.id)
          .order("start_time");
        if (activeYearId) query = query.or(`academic_year_id.eq.${activeYearId},academic_year_id.is.null`);
        if (activeSemesterId) query = query.or(`semester_id.eq.${activeSemesterId},semester_id.is.null`);
        const { data, error } = await query;
        if (error) throw error;
        setSchedules(data || []);
      } catch (error: any) {
        console.error("Staff schedule fetch error:", error);
        toast.error("Jadwal kerja belum dapat dimuat", { description: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [activeSemesterId, activeYearId, employee.id]);

  return (
    <div className="space-y-6">
      <PageHeader title="Jadwal Kerja" description="Shift, piket, standby, dan tugas operasional lintas unit." />

      {employee.attendance_mode === "work_schedule" ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Jadwal ini menjadi acuan absensi Anda</p><p className="mt-1 text-xs leading-5 text-emerald-800">Jam masuk mengikuti tugas pertama dan jam pulang mengikuti tugas terakhir pada hari tersebut. Kedatangan lebih awal tetap diterima.</p></div> : null}

      <LessonSchedulePanel
        schedules={schedules}
        isLoading={isLoading}
        title="Jadwal Kerja Staf"
        description="Menampilkan seluruh jadwal kerja yang tertaut ke Anda, termasuk tugas lintas unit seperti keamanan, kebersihan, sarpras, dan layanan sekolah."
        emptyMessage="Belum ada jadwal kerja pada periode aktif."
        mode="work"
      />
    </div>
  );
};
