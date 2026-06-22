import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, UserCircle2, FilterX, Clock, Edit3, Eye, FileText, CheckCircle2, ChevronRight, AlertCircle, AlertTriangle } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { useCurrentRoles } from "../../../../hooks/useAuth";
import { hasRole } from "../../../../lib/permissions";

export const HomeroomReviewList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();
  const { roles } = useCurrentRoles();

  const isHomeroom = hasRole(roles, 'homeroom') || hasRole(roles, 'wali_kelas');
  
  // Extract classes where role is homeroom or wali_kelas
  const homeroomClassIds = React.useMemo(() => {
    if (!roles) return [];
    return Array.from(new Set(
      roles
        .filter(r => r.role_type === 'homeroom' || r.role_type === 'wali_kelas')
        .map(r => r.class_id)
        .filter(Boolean)
    )) as string[];
  }, [roles]);

  const [filterClass, setFilterClass] = useState<string>(homeroomClassIds.length === 1 ? homeroomClassIds[0] : "");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: classes } = useList({
    resource: "classes",
    pagination: { mode: "off" },
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []
  });

  const { data: periods } = useList({
    resource: "report_periods",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "in", value: ["draft", "active"] },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [])
    ]
  });

  const { data: studentReports, isLoading } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "class_id", operator: "eq", value: filterClass },
      { field: "report_period_id", operator: "eq", value: filterPeriod },
      { field: "status", operator: "neq", value: "archived" }
    ],
    meta: {
      select: "*, students(full_name, nisn, gender)"
    },
    queryOptions: { enabled: !!filterClass && !!filterPeriod }
  });

  const filteredReports = useMemo(() => {
    if (!studentReports?.data) return [];
    let list = studentReports.data;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => (r.students as any)?.full_name?.toLowerCase().includes(q) || (r.students as any)?.nisn?.includes(q));
    }
    return list.sort((a, b) => ((a.students as any)?.full_name || "").localeCompare((b.students as any)?.full_name || ""));
  }, [studentReports?.data, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Review Wali Kelas"
        description="Tinjau nilai dari guru, tambahkan catatan wali kelas, dan ajukan rapor ke Wakasek."
      />

      {!isHomeroom && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Akses Terbatas</p>
            <p>Akun Anda tidak memiliki peran Wali Kelas. Anda mungkin tidak melihat kelas apapun di bawah ini.</p>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          
          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periode Rapor</label>
            <select 
              value={filterPeriod} 
              onChange={(e) => setFilterPeriod(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Pilih Periode --</option>
              {periods?.data?.map(p => <option key={p.id} value={p.id as string}>{p.name}</option>)}
            </select>
          </div>

          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas (Wali Kelas)</label>
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Pilih Kelas --</option>
              {classes?.data?.filter(c => homeroomClassIds.includes(c.id as string)).map(c => (
                <option key={c.id} value={c.id as string}>{c.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterPeriod(""); setFilterClass(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px] shrink-0"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {!filterClass || !filterPeriod ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-blue-900 mb-2">Pilih Kelas dan Periode</h3>
          <p className="text-blue-700 text-sm max-w-md mx-auto">
            Silakan pilih Kelas binaan Anda dan Periode Rapor di atas untuk mereview nilai siswa.
          </p>
        </div>
      ) : isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-muted-foreground bg-card border rounded-xl shadow-sm">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Memuat daftar siswa...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center shadow-sm">
          <p className="text-muted-foreground">Tidak ada draft rapor siswa yang ditemukan untuk kelas dan periode ini.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
              <tr>
                <th className="px-6 py-3 w-16 text-center">No</th>
                <th className="px-6 py-3">Data Siswa</th>
                <th className="px-6 py-3 w-48">Status Keseluruhan</th>
                <th className="px-6 py-3 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReports.map((report, idx) => {
                const student = report.students as any;
                
                const renderStatus = () => {
                  switch(report.status) {
                    case 'draft':
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase"><Clock className="w-3.5 h-3.5" /> Draft Kosong</span>;
                    case 'teacher_input':
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 uppercase"><Edit3 className="w-3.5 h-3.5" /> Proses Input Guru</span>;
                    case 'revision_needed':
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 uppercase"><AlertTriangle className="w-3.5 h-3.5" /> Butuh Revisi</span>;
                    case 'homeroom_review':
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 uppercase"><Eye className="w-3.5 h-3.5" /> Siap Review</span>;
                    case 'wakasek_review':
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Diperiksa Wakasek</span>;
                    case 'approved':
                    case 'published':
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Selesai</span>;
                    default:
                      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">{report.status}</span>;
                  }
                };

                return (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/reports/homeroom-review/${report.id}`)}>
                    <td className="px-6 py-4 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${student?.gender === 'P' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          <UserCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{student?.full_name}</div>
                          <div className="text-xs text-muted-foreground">NISN: {student?.nisn || "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
