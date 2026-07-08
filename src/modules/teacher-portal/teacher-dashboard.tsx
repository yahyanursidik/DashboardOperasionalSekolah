import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Calendar, Clock, CheckSquare, BookOpen, ChevronRight, UserCheck, Users, AlertTriangle } from "lucide-react";

export const TeacherDashboard: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [stats, setStats] = useState({
    myAttendance: "Belum Absen",
    classesToday: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 1. Fetch own attendance
        const { data: myAtt } = await supabaseClient
          .from("employee_attendance")
          .select("status, time_in")
          .eq("employee_id", employee.id)
          .eq("date", todayStr)
          .single();

        // 2. Fetch today's schedule
        const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const { data: schedules } = await supabaseClient
          .from("employee_schedules")
          .select("*, classes(name), subjects(name)")
          .eq("employee_id", employee.id)
          .eq("day_of_week", dayOfWeek)
          .order("start_time");

        setTodaySchedules(schedules || []);
        const myAttendance = myAtt as any;
        setStats({
          myAttendance: myAttendance ? (myAttendance.status === 'present' ? `Hadir (${myAttendance.time_in?.substring(0,5)})` : myAttendance.status) : "Belum Absen",
          classesToday: schedules?.length || 0
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchDashboardData();
  }, [employee.id]);

  const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-4 space-y-6">
      
      {/* Date & My Status */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Hari Ini</p>
            <h3 className="font-bold text-gray-900">{hariIni}</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <div className="bg-gray-50 p-3 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Status Kehadiran</p>
            <p className={`text-sm font-bold ${stats.myAttendance.includes('Hadir') ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.myAttendance}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Jadwal Kelas</p>
            <p className="text-sm font-bold text-gray-900">{stats.classesToday} Kelas</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 px-1 text-sm">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/teacher/classes" className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:shadow-md transition">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-gray-700 text-center">Absen Kelas</span>
          </Link>
          <Link to="/teacher/journals" className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:shadow-md transition">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-gray-700 text-center">Tulis Jurnal</span>
          </Link>
          {employee?.teacher_roles?.includes("Guru Piket") && (
            <button className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col items-center justify-center gap-3 hover:border-amber-500/50 hover:shadow-md transition" onClick={() => alert("Fitur Guru Piket: Segera hadir!")}>
              <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-700 text-center">Rekap Sekolah (Piket)</span>
            </button>
          )}
          {employee?.teacher_roles?.includes("Guru Bimbingan dan Konseling") && (
            <button className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col items-center justify-center gap-3 hover:border-rose-500/50 hover:shadow-md transition" onClick={() => alert("Fitur Penanganan BK: Segera hadir!")}>
              <div className="bg-rose-100 p-3 rounded-full text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-700 text-center">Konseling (BK)</span>
            </button>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="font-bold text-gray-900 text-sm">Jadwal Mengajar Hari Ini</h3>
          <Link to="/teacher/schedules" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        
        {todaySchedules.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-dashed">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tidak ada jadwal mengajar hari ini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="divide-y">
              {todaySchedules.map((schedule, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex gap-4 items-center">
                    <div className="text-center w-14">
                      <p className="text-sm font-bold text-gray-900">{schedule.start_time?.substring(0,5)}</p>
                      <p className="text-xs text-gray-500">{schedule.end_time?.substring(0,5)}</p>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div>
                      <h4 className="font-bold text-gray-900">{schedule.subjects?.name || "Mata Pelajaran"}</h4>
                      <p className="text-xs text-primary font-medium mt-0.5">{schedule.classes?.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
