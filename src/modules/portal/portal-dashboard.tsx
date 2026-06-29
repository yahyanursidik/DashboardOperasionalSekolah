import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Wallet, BookOpen, Clock, AlertCircle, TrendingUp, Calendar, CheckCircle, XCircle, Megaphone } from "lucide-react";

export const PortalDashboard: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [unpaidInvoices, setUnpaidInvoices] = useState(0);
  const [attendance, setAttendance] = useState({ present: 0, sick: 0, permission: 0, absent: 0 });
  const [recentJournal, setRecentJournal] = useState<any>(null);
  const [recentAnnouncement, setRecentAnnouncement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Unpaid Invoices
        const { count } = await supabaseClient
          .from("student_invoices")
          .select("*", { count: "exact", head: true })
          .eq("student_id", student.id)
          .in("status", ["unpaid", "partial"]);
        setUnpaidInvoices(count || 0);

        // Fetch Attendance (simple mock aggregation since there's no direct view, we'll fetch all records for this student)
        const { data: attData } = await supabaseClient
          .from("attendance_records")
          .select("status")
          .eq("student_id", student.id);
        
        if (attData) {
          const stats = { present: 0, sick: 0, permission: 0, absent: 0 };
          attData.forEach((r: any) => {
            if (r.status === 'Hadir') stats.present++;
            if (r.status === 'Sakit') stats.sick++;
            if (r.status === 'Izin') stats.permission++;
            if (r.status === 'Alpa') stats.absent++;
          });
          setAttendance(stats);
        }

        // Fetch Recent Journal
        const { data: journals } = await supabaseClient
          .from("student_journals")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (journals && journals.length > 0) setRecentJournal(journals[0]);

        // Fetch Recent Announcement
        const { data: annData } = await supabaseClient
          .from("announcements")
          .select("title, content, publish_at, created_at")
          .eq("status", "terkirim")
          .in("target_type", ["all", "parents"])
          .order("publish_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);
        if (annData && annData.length > 0) setRecentAnnouncement(annData[0]);

      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [student.id]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat data dashboard...</div>;
  }

  const totalDays = attendance.present + attendance.sick + attendance.permission + attendance.absent;
  const attendancePercentage = totalDays > 0 ? Math.round((attendance.present / totalDays) * 100) : 100;

  return (
    <div className="p-4 md:p-0 space-y-6 md:space-y-8 mt-2 md:mt-0">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Assalamu'alykum, Abba dan Umma {student.full_name.split(' ')[0]}!</h2>
          <p className="text-emerald-100 text-sm opacity-90">Pantau selalu aktivitas dan perkembangan anak Anda.</p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 md:right-10 md:bottom-[-40px]">
          <TrendingUp className="w-40 h-40 md:w-56 md:h-56" />
        </div>
      </div>

      {/* Quick Alerts */}
      {unpaidInvoices > 0 && (
        <Link to="/portal/finance" className="block bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4 hover:bg-red-100 transition-colors shadow-sm">
          <div className="bg-red-100 text-red-600 p-2 rounded-full shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Tagihan Belum Dibayar</h3>
            <p className="text-sm text-red-600 mt-0.5">Ada {unpaidInvoices} tagihan yang butuh perhatian Anda.</p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="space-y-6">
          {/* Attendance Stats */}
          <div className="bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Ringkasan Kehadiran
              </h3>
              <span className={`text-sm font-bold ${attendancePercentage < 80 ? 'text-red-500' : 'text-emerald-600'}`}>
                {attendancePercentage}% Hadir
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{attendance.present}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Hadir</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-500">{attendance.sick}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Sakit</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-500">{attendance.permission}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Izin</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-500">{attendance.absent}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Alpa</div>
              </div>
            </div>
          </div>

          {/* Recent Journal/Activity */}
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" /> Catatan Terbaru
              </h3>
              <Link to="/portal/journals" className="text-sm text-emerald-600 font-medium hover:underline">Lihat Semua</Link>
            </div>
            {recentJournal ? (
              <div className="bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md uppercase">
                    {recentJournal.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(recentJournal.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <h4 className="font-bold text-gray-800">{recentJournal.title}</h4>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{recentJournal.description}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-dashed p-6 text-center text-gray-500 text-sm">
                Belum ada catatan aktivitas untuk siswa ini.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Announcement */}
          {recentAnnouncement && (
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" /> Pengumuman Terbaru
                </h3>
                <Link to="/portal/announcements" className="text-sm text-emerald-600 font-medium hover:underline">Lihat Semua</Link>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
                <h4 className="font-bold text-amber-900">{recentAnnouncement.title}</h4>
                <p className="text-sm text-amber-800 mt-2 line-clamp-3">{recentAnnouncement.content}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-700/80 font-medium bg-amber-100/50 w-fit px-2 py-1 rounded-md">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(recentAnnouncement.publish_at || recentAnnouncement.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
