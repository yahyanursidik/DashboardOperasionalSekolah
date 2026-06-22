import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, FilterX, Eye, CheckCircle2, ChevronRight, CheckSquare, Loader2, Award, Clock, FileText } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";

export const WakasekReviewList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();

  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("wakasek_review");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { data: studentReports, isLoading, refetch } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      ...(filterClass ? [{ field: "class_id", operator: "eq", value: filterClass }] : []),
      ...(filterPeriod ? [{ field: "report_period_id", operator: "eq", value: filterPeriod }] : []),
      ...(filterStatus ? [{ field: "status", operator: "eq", value: filterStatus }] : [{ field: "status", operator: "neq", value: "archived" }])
    ],
    meta: {
      select: "*, students(full_name, nisn, gender), classes!inner(unit_id, name)"
    },
    // We must ensure we only fetch for the active unit.
    // If filterClass is selected, it's already in the unit.
    // Otherwise we need to filter by unit, but student_reports doesn't have unit_id directly, it has class_id.
    // With Supabase inner join, we can filter. Since refine's default provider might not support deep filtering easily without custom queries,
    // we fetch and then filter client-side if activeUnitId is set but no class is selected.
    queryOptions: { enabled: !!activeUnitId }
  });

  const filteredReports = useMemo(() => {
    if (!studentReports?.data) return [];
    let list = studentReports.data as any[];

    // Ensure we only show reports for the active unit
    if (activeUnitId) {
      list = list.filter(r => r.classes?.unit_id === activeUnitId);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => r.students?.full_name?.toLowerCase().includes(q) || r.students?.nisn?.includes(q));
    }
    return list.sort((a, b) => {
      // Sort by class name then student name
      const classCmp = (a.classes?.name || "").localeCompare(b.classes?.name || "");
      if (classCmp !== 0) return classCmp;
      return (a.students?.full_name || "").localeCompare(b.students?.full_name || "");
    });
  }, [studentReports?.data, searchTerm, activeUnitId]);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map(r => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkApprove = async () => {
    if (!user?.id || selectedIds.length === 0) return;
    
    // Check if any selected is not in wakasek_review
    const invalidIds = filteredReports.filter(r => selectedIds.includes(r.id) && r.status !== 'wakasek_review');
    if (invalidIds.length > 0) {
      toast.error("Hanya rapor dengan status 'Siap Review Wakasek' yang bisa di-approve secara massal.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create review logs
      const logs = selectedIds.map(id => ({
        report_id: id,
        reviewer_id: user.id,
        status_from: 'wakasek_review',
        status_to: 'principal_approval',
        comments: 'Approved in bulk by Wakasek'
      }));
      await supabaseClient.from('report_reviews').insert(logs);

      // Update statuses
      const { error } = await supabaseClient
        .from('student_reports')
        .update({ status: 'principal_approval' })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Berhasil menyetujui ${selectedIds.length} rapor!`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal melakukan batch approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Review Wakasek"
        description="Pemeriksaan kualitas (QA) rapor sebelum diajukan ke Kepala Sekolah."
      />

      {/* Advanced Filters */}
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
          
          <div className="w-full md:w-40 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periode Rapor</label>
            <select 
              value={filterPeriod} 
              onChange={(e) => setFilterPeriod(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua Periode</option>
              {periods?.data?.map(p => <option key={p.id} value={p.id as string}>{p.name}</option>)}
            </select>
          </div>

          <div className="w-full md:w-40 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua Kelas</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua Status</option>
              <option value="homeroom_review">Sedang di Wali Kelas</option>
              <option value="wakasek_review">Siap Review Wakasek</option>
              <option value="principal_approval">Menunggu Kepsek</option>
              <option value="approved">Disetujui Kepsek</option>
              <option value="published">Diterbitkan (Parent)</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterPeriod(""); setFilterClass(""); setFilterStatus(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px] shrink-0"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 px-3">
            <CheckSquare className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-900">{selectedIds.length} Siswa Terpilih</span>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={isSubmitting}
            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Approve Terpilih
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Memuat daftar rapor...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex-1 p-16 text-center">
            <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Tidak Ada Data Rapor</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Tidak ditemukan rapor yang sesuai dengan filter pencarian Anda di unit ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                      checked={selectedIds.length === filteredReports.length && filteredReports.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 w-40">Kelas</th>
                  <th className="px-4 py-3">Data Siswa</th>
                  <th className="px-4 py-3 w-48">Status Rapor</th>
                  <th className="px-4 py-3 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReports.map((report) => {
                  const student = report.students as any;
                  const isWakasekReview = report.status === 'wakasek_review';
                  
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                          checked={selectedIds.includes(report.id)}
                          onChange={() => handleToggleSelect(report.id)}
                          disabled={!isWakasekReview} // Only allow selection if ready for wakasek
                        />
                      </td>
                      <td className="px-4 py-4 font-semibold text-muted-foreground">
                        {report.classes?.name}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{student?.full_name}</div>
                        <div className="text-xs text-muted-foreground">NISN: {student?.nisn || "-"}</div>
                      </td>
                      <td className="px-4 py-4">
                        {isWakasekReview ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 uppercase">
                            <Clock className="w-3.5 h-3.5" /> Siap Review
                          </span>
                        ) : report.status === 'principal_approval' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {report.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/reports/wakasek-review/${report.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border shadow-sm text-sm font-medium hover:bg-muted hover:text-primary transition-colors rounded-md"
                        >
                          <Eye className="w-4 h-4" /> Buka
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
    </div>
  );
};
