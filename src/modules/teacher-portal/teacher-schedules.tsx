import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Calendar, Clock, ArrowLeft, BookOpen, MapPin } from "lucide-react";

const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
// In JS Date, 0 is Sunday, 1 is Monday.
const dayMap: Record<number, string> = {
  1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat", 6: "Sabtu", 0: "Minggu"
};

export const TeacherSchedules: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>("Senin");

  useEffect(() => {
    const today = new Date().getDay();
    const todayStr = dayMap[today] || "Senin";
    setActiveDay(todayStr);

    const fetchSchedules = async () => {
      try {
        const { data } = await supabaseClient
          .from("employee_schedules")
          .select("*, classes(name), subjects(name)")
          .eq("employee_id", employee.id)
          .order("start_time");

        setSchedules(data || []);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [employee.id]);

  const schedulesForActiveDay = schedules.filter(s => s.day_of_week === activeDay);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/teacher" className="p-2 bg-white rounded-full shadow-sm border text-gray-600 hover:text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="font-bold text-lg text-gray-900">Jadwal Mengajar</h2>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {daysOfWeek.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${
              activeDay === day 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div>
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-dashed">
            <p className="text-gray-500 text-sm animate-pulse">Memuat jadwal...</p>
          </div>
        ) : schedulesForActiveDay.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-dashed">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tidak ada jadwal pada hari {activeDay}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedulesForActiveDay.map((schedule, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border hover:border-primary/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="bg-primary/10 p-3 rounded-xl text-primary h-fit">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">
                        {schedule.subjects?.name || "Mata Pelajaran"}
                      </h4>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {schedule.start_time?.substring(0,5)} - {schedule.end_time?.substring(0,5)}
                        </div>
                        {schedule.classes?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                            <MapPin className="w-3.5 h-3.5" />
                            Kelas {schedule.classes.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase">
                    {schedule.schedule_type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
