import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FileText, Download, Eye, User, Clock, AlertCircle } from "lucide-react";
import { getAssessmentBasisLabel } from "../../report-period-utils";

export const ParentReportList: React.FC = () => {
  const { student } = useOutletContext<any>();
  const navigate = useNavigate();

  const { data: reportsData, isLoading } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "eq", value: "published" },
      { field: "student_id", operator: "eq", value: student?.id || "00000000-0000-0000-0000-000000000000" }
    ],
    meta: {
      select: "*, students(full_name, nisn), classes(name), report_periods(name, academic_year_id, semester_id, publish_date, report_type, assessment_basis), report_templates(name)"
    },
    queryOptions: { enabled: !!student?.id }
  });

  const visibleReports = useMemo(() => {
    if (!reportsData?.data) return [];
    
    const now = new Date();
    return reportsData.data.filter((report: any) => {
      const pDate = report.report_periods?.publish_date ? new Date(report.report_periods.publish_date) : null;
      return !pDate || pDate <= now;
    }).sort((a: any, b: any) => {
      const dateA = a.report_periods?.publish_date ? new Date(a.report_periods.publish_date).getTime() : 0;
      const dateB = b.report_periods?.publish_date ? new Date(b.report_periods.publish_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [reportsData?.data]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat data rapor...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
        <FileText className="w-6 h-6 text-emerald-600" /> Rapor Digital
      </h2>

      {!student?.id ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-900 mb-1">Akun Belum Terhubung</h3>
          <p className="text-amber-800/80 text-sm">
            Silakan hubungi tata usaha untuk menghubungkan akun Parent Portal Anda.
          </p>
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="bg-gray-50 border border-dashed rounded-xl p-8 text-center text-gray-500">
          <p>Belum ada rapor digital yang diterbitkan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleReports.map((report: any) => {
            const period = report.report_periods as any;
            const publishDate = period?.publish_date ? new Date(period.publish_date) : null;

            return (
              <div key={report.id} className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-emerald-50 px-4 py-3 border-b flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-emerald-900 line-clamp-1">{period?.name}</h3>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">
                      {getAssessmentBasisLabel(period?.assessment_basis)}
                    </div>
                  </div>
                  {publishDate && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium bg-white px-2 py-1 rounded shadow-sm border">
                      <Clock className="w-3 h-3" /> 
                      {publishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{student?.full_name}</div>
                      <div className="text-xs text-gray-500">NISN: {student?.nisn || "-"} • {report.classes?.name}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border-t flex items-center gap-2">
                  <button 
                    onClick={() => navigate(`/portal/reports/${report.id}`)}
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Lihat Rapor
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
