import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, FilterX, Eye, CheckCircle2, ChevronRight, CheckSquare, Loader2, Award, Clock, FileText, CheckCircle, ShieldCheck } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";

export const PrincipalApprovalList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();

  const [filterUnit, setFilterUnit] = useState<string>(activeUnitId || "");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("principal_approval");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We fetch all units if activeUnitId is null (super admin or multi-unit principal)
  const { data: units } = useList({
    resource: "units",
    pagination: { mode: "off" }
  });

  const { data: classes } = useList({
    resource: "classes",
    pagination: { mode: "off" },
    filters: filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : []
  });

  const { data: periods } = useList({
    resource: "report_periods",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "in", value: ["draft", "active"] },
      ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : [])
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
    }
  });

  const filteredReports = useMemo(() => {
    if (!studentReports?.data) return [];
    let list = studentReports.data as any[];

    // If filterUnit is selected, ensure classes belong to that unit
    if (filterUnit) {
      list = list.filter(r => r.classes?.unit_id === filterUnit);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => r.students?.full_name?.toLowerCase().includes(q) || r.students?.nisn?.includes(q));
    }
    
    return list.sort((a, b) => {
      const classCmp = (a.classes?.name || "").localeCompare(b.classes?.name || "");
      if (classCmp !== 0) return classCmp;
      return (a.students?.full_name || "").localeCompare(b.students?.full_name || "");
    });
  }, [studentReports?.data, searchTerm, filterUnit]);

  // Summary Metrics
  const totalWaiting = useMemo(() => filteredReports.filter(r => r.status === 'principal_approval').length, [filteredReports]);

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
    
    // Check if any selected is not in principal_approval
    const invalidIds = filteredReports.filter(r => selectedIds.includes(r.id) && r.status !== 'principal_approval');
    if (invalidIds.length > 0) {
      toast.error("Hanya rapor dengan status 'Menunggu Kepsek' yang bisa di-approve secara massal.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create review logs
      const logs = selectedIds.map(id => ({
        report_id: id,
        reviewer_id: user.id,
        status_from: 'principal_approval',
        status_to: 'approved',
        comments: 'Approved in bulk by Principal'
      }));
      await supabaseClient.from('report_reviews').insert(logs);

      // Update statuses
      const { error } = await supabaseClient
        .from('student_reports')
        .update({ status: 'approved' })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Berhasil memberikan Approval Final untuk ${selectedIds.length} rapor!`);
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
        title="Approval Kepala Sekolah"
        description="Persetujuan final sebelum rapor diterbitkan ke orang tua atau dicetak."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium">Menunggu Approval</p>
            <h3 className="text-3xl font-bold mt-1">{totalWaiting}</h3>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

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
          
          {/* Only show unit filter if no active unit is forced */}
          {!activeUnitId && (
            <div className="w-full md:w-40 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</label>
              <select 
                value={filterUnit} 
                onChange={(e) => { setFilterUnit(e.target.value); setFilterClass(""); setFilterPeriod(""); }} 
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Semua Unit</option>
                {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
              </select>
            </div>
          )}

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
              <option value="wakasek_review">Proses Wakasek</option>
              <option value="principal_approval">Menunggu Kepsek</option>
              <option value="approved">Telah Disetujui (Approved)</option>
              <option value="published">Diterbitkan (Published)</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterPeriod(""); setFilterClass(""); setFilterStatus(""); if(!activeUnitId) setFilterUnit(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px] shrink-0"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 px-3">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-indigo-900">{selectedIds.length} Siswa Terpilih</span>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Berikan Approval Final
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
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Tidak Ada Data</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Tidak ditemukan rapor yang sesuai dengan filter pencarian Anda.
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
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
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
                  const isReady = report.status === 'principal_approval';
                  
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          checked={selectedIds.includes(report.id)}
                          onChange={() => handleToggleSelect(report.id)}
                          disabled={!isReady} 
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
                        {isReady ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                            <Clock className="w-3.5 h-3.5" /> Menunggu Approval
                          </span>
                        ) : report.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                            <Award className="w-3.5 h-3.5" /> Disetujui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {report.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/reports/principal-approval/${report.id}`)}
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
