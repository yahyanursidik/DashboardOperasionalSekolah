import React from "react";
import { useShow } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Calendar, Clock, Settings, Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const ReportPeriodShow: React.FC = () => {
  const navigate = useNavigate();
  const { queryResult } = useShow({
    resource: "report_periods",
    meta: {
      select: "*, units(name), academic_years(name), semesters(name)"
    }
  });

  const { data, isLoading } = queryResult;
  const period = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Memuat data periode...</p>
        </div>
      </div>
    );
  }

  if (!period) return null;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string, text: string, border: string, dot: string, label: string }> = {
      draft: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", label: "Draft" },
      active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Aktif" },
      closed: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Ditutup" },
      archived: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500", label: "Diarsipkan" },
    };
    const style = styles[status] || styles.draft;
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border}`}>
        <div className={`w-2 h-2 rounded-full ${style.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
        {style.label}
      </div>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: idLocale });
  };

  const u = period.units as any;
  const ay = period.academic_years as any;
  const sm = period.semesters as any;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{period.name}</h1>
              {getStatusBadge(period.status)}
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
              {period.report_type?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/reports/periods/edit/${period.id}`)}
            className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Ubah Pengaturan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info Box */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Informasi Akademik</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8">
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Tahun Ajaran</h3>
                <p className="font-semibold text-foreground">{Array.isArray(ay) ? ay[0]?.name : ay?.name || "-"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Semester</h3>
                <p className="font-semibold text-foreground">{Array.isArray(sm) ? sm[0]?.name : sm?.name || "-"}</p>
              </div>

              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Unit Sekolah</h3>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{Array.isArray(u) ? u[0]?.name : u?.name || "-"}</span>
                </div>
              </div>

              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Deskripsi / Catatan</h3>
                <p className="text-sm bg-muted/30 p-4 rounded-lg border">
                  {period.description || "Tidak ada catatan."}
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Timeline Box */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-lg">Jadwal Rapor</h2>
            </div>
            <div className="p-6 relative">
              
              <div className="absolute left-[39px] top-[40px] bottom-[40px] w-0.5 bg-muted-foreground/20"></div>

              <div className="space-y-6">
                
                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border-4 border-card">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider mb-0.5">Mulai Input</h3>
                    <p className="text-sm font-medium">{formatDate(period.input_start_date)}</p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border-4 border-card">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider mb-0.5">Batas Input Guru</h3>
                    <p className="text-sm font-medium">{formatDate(period.input_due_date)}</p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border-4 border-card">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-purple-600 tracking-wider mb-0.5">Batas Review</h3>
                    <p className="text-sm font-medium">{formatDate(period.review_due_date)}</p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border-4 border-card">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-emerald-600 tracking-wider mb-0.5">Publikasi</h3>
                    <p className="text-sm font-medium">{formatDate(period.publish_date)}</p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
