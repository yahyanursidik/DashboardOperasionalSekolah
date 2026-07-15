import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Wallet, BookOpen, Clock, Calendar, Megaphone, Target, FileText, Award, AlertTriangle, CheckCircle2, ClipboardCheck, LifeBuoy } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const PortalDashboard: React.FC = () => {
  const { student, parent } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [invoiceSummary, setInvoiceSummary] = useState({ count: 0, total: 0 });
  const [attendance, setAttendance] = useState({ present: 0, sick: 0, permission: 0, absent: 0 });
  const [recentJournal, setRecentJournal] = useState<any>(null);
  const [recentAnnouncement, setRecentAnnouncement] = useState<any>(null);
  const [openRequests, setOpenRequests] = useState(0);
  const [quranSummary, setQuranSummary] = useState({
    tahfidzRecords: 0,
    tahsinRecords: 0,
    tahsinTargets: 0,
    tahfidzTargets: 0,
    assessments: 0,
    followUps: 0,
    latestRecord: null as any,
    latestAssessment: null as any,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const { data: invoices } = await supabaseClient
          .from("student_invoices")
          .select("amount, discount, paid_amount, status")
          .eq("student_id", student.id)
          .in("status", ["unpaid", "partial"]);
        setInvoiceSummary({
          count: invoices?.length || 0,
          total: (invoices || []).reduce((sum: number, item: any) => sum + Math.max(Number(item.amount || 0) - Number(item.discount || 0) - Number(item.paid_amount || 0), 0), 0),
        });

        let attendanceQuery = supabaseClient
          .from("attendance_records")
          .select("status")
          .eq("student_id", student.id);
        if (activeYearId) attendanceQuery = attendanceQuery.eq("academic_year_id", activeYearId);
        const { data: attData } = await attendanceQuery;
        if (attData) {
          const stats = { present: 0, sick: 0, permission: 0, absent: 0 };
          attData.forEach((record: any) => {
            const status = String(record.status || "").toLowerCase();
            if (["hadir", "terlambat", "pulang_awal"].includes(status)) stats.present++;
            if (status === "sakit") stats.sick++;
            if (status === "izin") stats.permission++;
            if (status === "alpa") stats.absent++;
          });
          setAttendance(stats);
        }

        const { data: journals } = await supabaseClient
          .from("student_journals")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1);
        setRecentJournal(journals?.[0] || null);

        const { data: annData } = await supabaseClient
          .from("announcements")
          .select("title, content, publish_at, created_at")
          .eq("status", "terkirim")
          .in("target_type", ["all", "parents", "unit", "class"])
          .order("publish_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);
        setRecentAnnouncement(annData?.[0] || null);

        const { count: requestCount } = await supabaseClient
          .from("parent_portal_requests")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", parent.id)
          .eq("student_id", student.id)
          .in("status", ["submitted", "in_review"]);
        setOpenRequests(requestCount || 0);

        let recordsQuery = supabaseClient
          .from("quran_records")
          .select("id, record_type, date, fluency_score, surah_or_jilid, ayat_or_page")
          .eq("student_id", student.id)
          .order("date", { ascending: false });
        if (activeYearId) recordsQuery = recordsQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) recordsQuery = recordsQuery.eq("semester_id", activeSemesterId);
        const { data: quranRecords } = await recordsQuery;

        let assessmentsQuery = supabaseClient
          .from("quran_assessments")
          .select("id, assessment_type, title, date, score, status")
          .eq("student_id", student.id)
          .order("date", { ascending: false });
        if (activeYearId) assessmentsQuery = assessmentsQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) assessmentsQuery = assessmentsQuery.eq("semester_id", activeSemesterId);
        const { data: assessments } = await assessmentsQuery;

        let tahsinTargetsQuery = supabaseClient
          .from("tahsin_student_targets")
          .select("id, status")
          .eq("student_id", student.id)
          .eq("target_type", "tahsin");
        if (activeYearId) tahsinTargetsQuery = tahsinTargetsQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) tahsinTargetsQuery = tahsinTargetsQuery.eq("semester_id", activeSemesterId);
        const { data: tahsinTargets } = await tahsinTargetsQuery;

        let tahfidzTargetsQuery = supabaseClient
          .from("tahfidz_student_targets")
          .select("id, status")
          .eq("student_id", student.id)
          .eq("target_type", "tahfidz");
        if (activeYearId) tahfidzTargetsQuery = tahfidzTargetsQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) tahfidzTargetsQuery = tahfidzTargetsQuery.eq("semester_id", activeSemesterId);
        const { data: tahfidzTargets } = await tahfidzTargetsQuery;

        const records = quranRecords || [];
        const assessmentList = assessments || [];
        setQuranSummary({
          tahfidzRecords: records.filter((record: any) => record.record_type === "tahfidz").length,
          tahsinRecords: records.filter((record: any) => record.record_type === "tahsin").length,
          tahsinTargets: tahsinTargets?.length || 0,
          tahfidzTargets: tahfidzTargets?.length || 0,
          assessments: assessmentList.length,
          followUps: records.filter((record: any) => record.fluency_score === "Mengulang").length + assessmentList.filter((item: any) => item.status === "Mengulang" || item.status === "Lulus Bersyarat").length,
          latestRecord: records[0] || null,
          latestAssessment: assessmentList[0] || null,
        });
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [student.id, parent.id, activeYearId, activeSemesterId]);

  const totalDays = attendance.present + attendance.sick + attendance.permission + attendance.absent;
  const attendancePercentage = totalDays > 0 ? Math.round((attendance.present / totalDays) * 100) : 100;
  const studentFirstName = student.full_name?.split(" ")[0] || "Ananda";
  const qualityItems = useMemo(() => ([
    { label: "Kehadiran", done: attendancePercentage >= 90, value: `${attendancePercentage}%` },
    { label: "Jurnal Quran", done: quranSummary.tahfidzRecords + quranSummary.tahsinRecords > 0, value: quranSummary.tahfidzRecords + quranSummary.tahsinRecords },
    { label: "Target", done: quranSummary.tahsinTargets + quranSummary.tahfidzTargets > 0, value: quranSummary.tahsinTargets + quranSummary.tahfidzTargets },
    { label: "Ujian", done: quranSummary.assessments > 0, value: quranSummary.assessments },
  ]), [attendancePercentage, quranSummary]);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat data dashboard...</div>;

  return (
    <div className="p-4 md:p-0 space-y-6 md:space-y-8 mt-2 md:mt-0">
      <section className="rounded-lg bg-emerald-700 p-6 text-white shadow-sm md:p-8">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Assalamu'alaikum, Wali {studentFirstName}</h2>
          <p className="text-emerald-100 text-sm md:text-base opacity-90">
            Pantau perkembangan akademik, Qur'an, kehadiran, catatan sekolah, dan keuangan dalam satu portal.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-3 md:hidden">
        {[
          { to: "/portal/attendance", label: "Kehadiran", icon: Calendar, className: "bg-emerald-100 text-emerald-600" },
          { to: "/portal/reports", label: "e-Rapor", icon: FileText, className: "bg-blue-100 text-blue-600" },
          { to: "/portal/requests", label: "Pengajuan", icon: LifeBuoy, className: "bg-violet-100 text-violet-600" },
          { to: "/portal/finance", label: "Keuangan", icon: Wallet, className: "bg-amber-100 text-amber-600" },
        ].map(({ to, label, icon: Icon, className }) => (
          <Link key={to} to={to} className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all group">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform ${className}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center">{label}</span>
          </Link>
        ))}
      </section>

      {invoiceSummary.count > 0 && (
        <Link to="/portal/finance" className="block bg-red-50 border border-red-100 rounded-2xl p-4 md:p-5 flex items-center gap-4 hover:bg-red-100 transition-colors shadow-sm">
          <div className="bg-red-100 text-red-600 p-3 rounded-full shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-red-800">Tagihan Perlu Perhatian</h3>
            <p className="text-sm text-red-600 mt-0.5">
              {invoiceSummary.count} tagihan belum lunas, total Rp {invoiceSummary.total.toLocaleString("id-ID")}.
            </p>
          </div>
        </Link>
      )}

      {openRequests > 0 && (
        <Link to="/portal/requests" className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 hover:bg-amber-100">
          <LifeBuoy className="h-6 w-6 shrink-0 text-amber-700" />
          <div><p className="font-bold">{openRequests} pengajuan sedang diproses</p><p className="text-sm text-amber-700">Pantau status dan respons sekolah pada pusat layanan orang tua.</p></div>
        </Link>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {qualityItems.map((item) => (
          <div key={item.label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
              {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            </div>
            <p className="mt-2 text-2xl font-black text-gray-900">{item.value}</p>
            <p className="mt-1 text-xs text-gray-500">{item.done ? "Terpantau" : "Perlu dipantau"}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
        <div className="space-y-6">
          <Link to="/portal/attendance" className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 hover:border-emerald-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Ringkasan Kehadiran
              </h3>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${attendancePercentage < 80 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                {attendancePercentage}% Hadir
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {[
                ["Hadir", attendance.present, "text-emerald-600"],
                ["Sakit", attendance.sick, "text-amber-500"],
                ["Izin", attendance.permission, "text-blue-500"],
                ["Alpa", attendance.absent, "text-red-500"],
              ].map(([label, value, color]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <div className={`text-xl md:text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{label}</div>
                </div>
              ))}
            </div>
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" /> Mutu Qur'an
              </h3>
              <Link to="/portal/quran" className="text-sm text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Detail</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border bg-emerald-50 p-3">
                <p className="text-xl font-black text-emerald-700">{quranSummary.tahfidzRecords}</p>
                <p className="text-[11px] font-semibold text-emerald-800">Tahfidz</p>
              </div>
              <div className="rounded-xl border bg-blue-50 p-3">
                <p className="text-xl font-black text-blue-700">{quranSummary.tahsinRecords}</p>
                <p className="text-[11px] font-semibold text-blue-800">Tahsin</p>
              </div>
              <div className="rounded-xl border bg-purple-50 p-3">
                <p className="text-xl font-black text-purple-700">{quranSummary.assessments}</p>
                <p className="text-[11px] font-semibold text-purple-800">Ujian</p>
              </div>
            </div>
            {quranSummary.followUps > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Ada {quranSummary.followUps} catatan Qur'an yang perlu latihan ulang atau tindak lanjut.
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" /> Catatan Terbaru
              </h3>
              <Link to="/portal/journals" className="text-sm text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Lihat Semua</Link>
            </div>
            {recentJournal ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md uppercase tracking-wider">{recentJournal.category}</span>
                  <span className="text-xs font-medium text-gray-400">{new Date(recentJournal.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
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
          <Link to="/portal/onboarding" className="block bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 hover:shadow-md hover:border-emerald-200 transition-all group">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <Target className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-lg">Panduan Orang Tua</h3>
                <p className="text-emerald-700/80 text-sm mt-1">Baca panduan sekolah dan cara mendampingi pembelajaran anak.</p>
              </div>
            </div>
          </Link>

          {quranSummary.latestRecord && (
            <Link to="/portal/quran" className="block bg-white border rounded-2xl p-5 shadow-sm hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-emerald-600" /> Jurnal Qur'an Terakhir</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">{quranSummary.latestRecord.record_type}</span>
              </div>
              <p className="mt-3 font-semibold text-gray-800">{quranSummary.latestRecord.surah_or_jilid}</p>
              <p className="text-sm text-gray-500">{quranSummary.latestRecord.ayat_or_page} - {quranSummary.latestRecord.fluency_score}</p>
            </Link>
          )}

          {quranSummary.latestAssessment && (
            <Link to="/portal/quran" className="block bg-purple-50 border border-purple-100 rounded-2xl p-5 shadow-sm hover:bg-purple-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-purple-900 flex items-center gap-2"><Award className="w-5 h-5 text-purple-600" /> Ujian Qur'an Terakhir</h3>
                <span className="text-2xl font-black text-purple-700">{quranSummary.latestAssessment.score}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-purple-900">{quranSummary.latestAssessment.title}</p>
              <p className="text-xs text-purple-700">{quranSummary.latestAssessment.status || "Terekam"}</p>
            </Link>
          )}

          {recentAnnouncement && (
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" /> Pengumuman Terbaru
                </h3>
                <Link to="/portal/announcements" className="text-sm text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Semua</Link>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
                <Megaphone className="absolute -top-4 -right-4 w-24 h-24 text-amber-500/10 rotate-12" />
                <div className="relative z-10">
                  <h4 className="font-bold text-amber-900 text-lg leading-tight mb-3">{recentAnnouncement.title}</h4>
                  <p className="text-sm text-amber-800/90 leading-relaxed line-clamp-4">{recentAnnouncement.content}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-xs text-amber-700 font-bold bg-amber-100/60 w-fit px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(recentAnnouncement.publish_at || recentAnnouncement.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
