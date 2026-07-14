import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";

export const StaffSchedules: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      try {
        let query = supabaseClient
          .from("employee_schedules")
          .select("*, classes(name, unit_id, units(name)), units(name), subjects(name)")
          .eq("employee_id", employee.id)
          .order("start_time");
        if (activeYearId) query = query.eq("academic_year_id", activeYearId);
        const { data } = await query;
        setSchedules(data || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [activeYearId, employee.id]);

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
