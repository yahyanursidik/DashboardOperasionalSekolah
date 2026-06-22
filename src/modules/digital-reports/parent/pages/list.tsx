import React, { useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { FileText, Download, Eye, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { supabaseClient } from "../../../../lib/supabase/client";

export const ParentReportList: React.FC = () => {
  const { data: user } = useGetIdentity<any>();
  const navigate = useNavigate();

  // 1. Get the list of student IDs linked to this parent
  const { data: parentLinks, isLoading: isLoadingLinks } = useList({
    resource: "student_parent_links",
    pagination: { mode: "off" },
    filters: [{ field: "parent_id", operator: "eq", value: user?.id }],
    queryOptions: { enabled: !!user?.id }
  });

  const studentIds = useMemo(() => {
    return parentLinks?.data?.map((link: any) => link.student_id) || [];
  }, [parentLinks?.data]);

  // 2. Fetch published reports only for those students
  const { data: reportsData, isLoading: isLoadingReports } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "eq", value: "published" },
      { field: "student_id", operator: "in", value: studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"] } // Prevent empty array error
    ],
    meta: {
      select: "*, students(full_name, nisn), classes(name), report_periods(name, academic_year_id, semester_id, publish_date, report_type), report_templates(name)"
    },
    queryOptions: { enabled: studentIds.length > 0 }
  });

  const isLoading = isLoadingLinks || (studentIds.length > 0 && isLoadingReports);

  // 3. Process and filter by publish_date <= now()
  const visibleReports = useMemo(() => {
    if (!reportsData?.data) return [];
    
    const now = new Date();
    return reportsData.data.filter((report: any) => {
      const pDate = report.report_periods?.publish_date ? new Date(report.report_periods.publish_date) : null;
      // If no publish date is set, assume it's visible if status is published. 
      // If set, it must be past the publish date.
      return !pDate || pDate <= now;
    }).sort((a: any, b: any) => {
      // Sort by newest publish date first
      const dateA = a.report_periods?.publish_date ? new Date(a.report_periods.publish_date).getTime() : 0;
      const dateB = b.report_periods?.publish_date ? new Date(b.report_periods.publish_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [reportsData?.data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Memuat data rapor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <PageHeader
        title="Daftar Rapor Anak"
        description="Pantau perkembangan akademik dan karakter ananda tercinta."
      />

      {studentIds.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-900 mb-1">Akun Belum Terhubung</h3>
          <p className="text-amber-800/80 text-sm max-w-md mx-auto">
            Akun Anda belum dihubungkan dengan data siswa manapun. Silakan hubungi pihak tata usaha sekolah untuk menghubungkan akun Parent Portal Anda.
          </p>
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">Belum ada rapor yang tersedia</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Rapor akan tampil di sini setelah sekolah mempublikasikannya secara resmi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleReports.map((report: any) => {
            const student = report.students as any;
            const period = report.report_periods as any;
            const publishDate = period?.publish_date ? new Date(period.publish_date) : null;

            return (
              <div key={report.id} className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                
                {/* Card Header */}
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-5 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/20 text-primary uppercase">
                      {period?.report_type === 'pts' ? 'Penilaian Tengah Semester' : 
                       period?.report_type === 'pas' ? 'Penilaian Akhir Semester' : 
                       period?.report_type || 'Rapor'}
                    </div>
                    {publishDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium bg-background px-2 py-1 rounded border shadow-sm">
                        <Clock className="w-3.5 h-3.5" /> 
                        {publishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground line-clamp-1">{period?.name}</h3>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{student?.full_name}</div>
                      <div className="text-sm text-muted-foreground">NISN: {student?.nisn || "-"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Kelas</div>
                      <div className="font-semibold">{report.classes?.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Template Penilaian</div>
                      <div className="font-semibold line-clamp-1">{report.report_templates?.name}</div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-muted/20 border-t flex items-center gap-3">
                  <button 
                    onClick={() => navigate(`/parent/reports/${report.id}`)}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Lihat Rapor
                  </button>
                  <button 
                    className="px-4 py-2 bg-background border shadow-sm hover:bg-muted rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 text-muted-foreground"
                    title="Fitur Unduh PDF akan segera tersedia"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
