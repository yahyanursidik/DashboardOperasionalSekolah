import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";
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
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/staff" className="p-2 bg-white rounded-full shadow-sm border text-gray-600 hover:text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="font-black text-lg text-gray-900">Jadwal Kerja</h2>
          <p className="text-xs text-gray-500">Shift, piket, standby, dan tugas operasional lintas unit.</p>
        </div>
      </div>

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
