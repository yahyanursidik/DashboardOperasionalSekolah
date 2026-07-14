import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";

export const TeacherSchedules: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        let query = supabaseClient
          .from("employee_schedules")
          .select("*, classes(name, unit_id, units(name)), units(name), subjects(name)")
          .eq("employee_id", employee.id)
          .order("start_time");

        if (activeYearId) query = query.eq("academic_year_id", activeYearId);
        const { data } = await query;

        setSchedules(data || []);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [employee.id, activeYearId]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/teacher" className="p-2 bg-white rounded-full shadow-sm border text-gray-600 hover:text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="font-bold text-lg text-gray-900">Jadwal Pelajaran</h2>
          <p className="text-xs text-gray-500">Lintas unit, kelas, mata pelajaran, dan tugas pendukung.</p>
        </div>
      </div>

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
