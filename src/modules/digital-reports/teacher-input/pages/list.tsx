import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, Edit3, FilterX, UserCircle2, Clock, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { useCurrentRoles } from "../../../../hooks/useAuth";

export const TeacherInputList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();
  const { roles } = useCurrentRoles();

  // Determine allowed classes based on assignments
  // For MVP, if teacher is homeroom, they see their class.
  // If subject teacher, they see classes they teach.
  // Since we don't have deep class assignment filtering in standard supabase auth yet, 
  // we will fetch classes within the unit, but ideally filtered by their assignments.
  const myClassIds = React.useMemo(() => {
    if (!roles) return [];
    return Array.from(new Set(roles.map(r => (r as any).class_id).filter(Boolean))) as string[];
  }, [roles]);

  const [filterClass, setFilterClass] = useState<string>(myClassIds.length === 1 ? myClassIds[0] : "");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: classes } = useList({
    resource: "classes",
    pagination: { mode: "off" },
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId } as any] : []
  });

  const { data: periods } = useList({
    resource: "report_periods",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "in", value: ["draft", "active"] },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId } as any] : [])
    ]
  });

  const { data: studentReports, isLoading } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "class_id", operator: "eq", value: filterClass },
      { field: "report_period_id", operator: "eq", value: filterPeriod },
      { field: "status", operator: "ne", value: "archived" }
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
        title="Input Nilai Rapor"
        description="Isi nilai, rubrik, dan narasi rapor untuk siswa di kelas Anda."
      />

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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Pilih Kelas --</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
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
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-blue-900 mb-2">Pilih Kelas dan Periode</h3>
          <p className="text-blue-700 text-sm max-w-md mx-auto">
            Silakan pilih Kelas dan Periode Rapor di filter atas untuk mulai mengisi nilai siswa.
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
          <p className="text-sm mt-2 text-muted-foreground/80">Hubungi Administrator jika draft rapor belum dibuat (Generate Rapor).</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
              <tr>
                <th className="px-6 py-3 w-16 text-center">No</th>
                <th className="px-6 py-3">Data Siswa</th>
                <th className="px-6 py-3 w-40">Status Rapor</th>
                <th className="px-6 py-3 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReports.map((report, idx) => {
                const student = report.students as any;
                const isDraft = report.status === "draft";
                const isReview = report.status.includes("review") || report.status === "teacher_input";
                const isApproved = report.status === "approved" || report.status === "published";

                return (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/reports/teacher-input/${report.id}`)}>
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
                      {isDraft && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3.5 h-3.5" /> Draft Baru
                        </span>
                      )}
                      {isReview && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Edit3 className="w-3.5 h-3.5" /> Sedang Diisi
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                        </span>
                      )}
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
