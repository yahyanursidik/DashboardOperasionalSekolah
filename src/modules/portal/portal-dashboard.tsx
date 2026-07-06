import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Wallet, BookOpen, Clock, AlertCircle, TrendingUp, Calendar, CheckCircle, XCircle, Megaphone, Target, FileText } from "lucide-react";

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
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Assalamu'alykum, Abba dan Umma {student.full_name.split(' ')[0]}!</h2>
          <p className="text-emerald-100 text-sm md:text-base opacity-90">Pantau selalu aktivitas dan perkembangan anak Anda.</p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 md:right-10 md:bottom-[-40px]">
          <TrendingUp className="w-40 h-40 md:w-56 md:h-56" />
        </div>
      </div>

      {/* Quick Menu / Shortcuts (Mobile Prominent) */}
      <div className="grid grid-cols-4 gap-3 md:gap-4 md:hidden">
        <Link to="/portal/onboarding" className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-emerald-50 hover:border-emerald-100 transition-all group">
           <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <Target className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-bold text-gray-700 text-center">Onboarding</span>
        </Link>
        <Link to="/portal/reports" className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all group">
           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <FileText className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-bold text-gray-700 text-center">e-Rapor</span>
        </Link>
        <Link to="/portal/journals" className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-purple-50 hover:border-purple-100 transition-all group">
           <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <Clock className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-bold text-gray-700 text-center">Catatan</span>
        </Link>
        <Link to="/portal/academic" className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-amber-50 hover:border-amber-100 transition-all group">
           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <BookOpen className="w-6 h-6" />
           </div>
           <span className="text-[10px] font-bold text-gray-700 text-center">Akademik</span>
        </Link>
      </div>

      {/* Quick Alerts */}
      {unpaidInvoices > 0 && (
        <Link to="/portal/finance" className="block bg-red-50 border border-red-100 rounded-2xl p-4 md:p-5 flex items-center gap-4 hover:bg-red-100 transition-colors shadow-sm">
          <div className="bg-red-100 text-red-600 p-3 rounded-full shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-red-800">Tagihan Belum Dibayar</h3>
            <p className="text-sm text-red-600 mt-0.5">Ada {unpaidInvoices} tagihan yang butuh perhatian Anda.</p>
          </div>
        </Link>
      )}

      {/* Onboarding Banner for Desktop */}
      <div className="hidden md:block">
        <Link to="/portal/onboarding" className="block bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
              <Target className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-lg">Materi Onboarding & Panduan</h3>
              <p className="text-emerald-700/80 text-sm mt-1">Pelajari informasi penting dan panduan sekolah untuk mendukung anak Anda.</p>
            </div>
          </div>
          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm group-hover:bg-emerald-700 transition-colors">
            Mulai Pelajari
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="space-y-6">
          {/* Attendance Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Ringkasan Kehadiran
              </h3>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${attendancePercentage < 80 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {attendancePercentage}% Hadir
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div className="text-xl md:text-2xl font-bold text-emerald-600">{attendance.present}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Hadir</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div className="text-xl md:text-2xl font-bold text-amber-500">{attendance.sick}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Sakit</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div className="text-xl md:text-2xl font-bold text-blue-500">{attendance.permission}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Izin</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div className="text-xl md:text-2xl font-bold text-red-500">{attendance.absent}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Alpa</div>
              </div>
            </div>
          </div>

          {/* Recent Journal/Activity */}
          <div>
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" /> Catatan Terbaru
              </h3>
              <Link to="/portal/journals" className="text-sm text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Lihat Semua</Link>
            </div>
            {recentJournal ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md uppercase tracking-wider">
                    {recentJournal.category}
                  </span>
                  <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(recentJournal.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-lg">{recentJournal.title}</h4>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{recentJournal.description}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500 text-sm">
                Belum ada catatan aktivitas untuk siswa ini.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Announcement */}
          {recentAnnouncement && (
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" /> Pengumuman Terbaru
                </h3>
                <Link to="/portal/announcements" className="text-sm text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Semua</Link>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 md:p-6 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
                <div className="absolute -top-4 -right-4 text-amber-500/10 transform rotate-12">
                   <Megaphone className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-amber-900 text-lg leading-tight mb-3">{recentAnnouncement.title}</h4>
                  <p className="text-sm text-amber-800/90 leading-relaxed line-clamp-4">{recentAnnouncement.content}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-xs text-amber-700 font-bold bg-amber-100/60 w-fit px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(recentAnnouncement.publish_at || recentAnnouncement.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
