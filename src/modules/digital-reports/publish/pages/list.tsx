import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, FilterX, CheckSquare, Loader2, Send, Clock, FileText, CheckCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import { logAudit } from "../../../../lib/audit";

const Modal: React.FC<{ isOpen: boolean; title: string; children: React.ReactNode; onClose: () => void }> = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-card w-full max-w-lg rounded-xl shadow-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
};

export const PublishReportList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();

  const [filterUnit, setFilterUnit] = useState<string>(activeUnitId || "");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("approved"); // Default to approved (ready to publish)
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unpublish state
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState("");

  const { data: units } = useList({
    resource: "units",
    pagination: { mode: "off" }
  });

  const { data: classes } = useList({
    resource: "classes",
    pagination: { mode: "off" },
    filters: filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit } as any] : []
  });

  const { data: periods } = useList({
    resource: "report_periods",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "in", value: ["draft", "active"] },
      ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit } as any] : [])
    ]
  });

  // Fetch only approved or published reports
  const { data: studentReports, isLoading, refetch } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "in", value: ["approved", "published"] },
      ...(filterClass ? [{ field: "class_id", operator: "eq", value: filterClass } as any] : []),
      ...(filterPeriod ? [{ field: "report_period_id", operator: "eq", value: filterPeriod } as any] : []),
      ...(filterStatus ? [{ field: "status", operator: "eq", value: filterStatus } as any] : [])
    ],
    meta: {
      select: "*, students(full_name, nisn, gender), classes!inner(unit_id, name), report_periods(name, publish_date)"
    }
  });

  const filteredReports = useMemo(() => {
    if (!studentReports?.data) return [];
    let list = studentReports.data as any[];

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

  // Metrics
  const totalApproved = useMemo(() => filteredReports.filter(r => r.status === 'approved').length, [filteredReports]);
  const totalPublished = useMemo(() => filteredReports.filter(r => r.status === 'published').length, [filteredReports]);

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

  const handleBulkPublish = async () => {
    if (!user?.id || selectedIds.length === 0) return;
    
    const invalidIds = filteredReports.filter(r => selectedIds.includes(r.id) && r.status !== 'approved');
    if (invalidIds.length > 0) {
      toast.error("Hanya rapor dengan status 'Siap Publish' yang bisa di-publish.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create publish logs
      const logs = selectedIds.map(id => ({
        report_id: id,
        published_by: user.id,
        notes: 'Published by Admin'
      }));
      await supabaseClient.from('report_publish_logs').insert(logs);

      // Create review audit logs for consistency
      const auditLogs = selectedIds.map(id => ({
        report_id: id,
        reviewer_id: user.id,
        status_from: 'approved',
        status_to: 'published',
        comments: 'Rapor dipublish ke Parent Portal'
      }));
      await supabaseClient.from('report_reviews').insert(auditLogs);

      // Update statuses
      const { error } = await supabaseClient
        .from('student_reports')
        .update({ status: 'published' })
        .in('id', selectedIds);

      if (error) throw error;

      // Log Audit (Using a loop because it's a batch operation, or just one log per action)
      for (const id of selectedIds) {
        await logAudit(user.id, 'status-change', 'student_reports', id, { status: 'approved' }, { status: 'published' });
      }

      toast.success(`Berhasil mem-publish ${selectedIds.length} rapor!`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal melakukan publish.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUnpublish = async () => {
    if (!user?.id || selectedIds.length === 0 || !unpublishReason.trim()) return;

    const invalidIds = filteredReports.filter(r => selectedIds.includes(r.id) && r.status !== 'published');
    if (invalidIds.length > 0) {
      toast.error("Hanya rapor dengan status 'Published' yang bisa di-unpublish.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create publish logs for unpublish
      const logs = selectedIds.map(id => ({
        report_id: id,
        published_by: user.id,
        notes: `UNPUBLISHED: ${unpublishReason}`
      }));
      await supabaseClient.from('report_publish_logs').insert(logs);

      // Create review audit logs for consistency
      const auditLogs = selectedIds.map(id => ({
        report_id: id,
        reviewer_id: user.id,
        status_from: 'published',
        status_to: 'approved',
        comments: `Ditarik dari Parent Portal: ${unpublishReason}`
      }));
      await supabaseClient.from('report_reviews').insert(auditLogs);

      // Update statuses back to approved
      const { error } = await supabaseClient
        .from('student_reports')
        .update({ status: 'approved' })
        .in('id', selectedIds);

      if (error) throw error;

      // Log Audit
      for (const id of selectedIds) {
        await logAudit(user.id, 'status-change', 'student_reports', id, { status: 'published' }, { status: 'approved', reason: unpublishReason });
      }

      toast.success(`${selectedIds.length} rapor berhasil ditarik (Unpublish).`);
      setSelectedIds([]);
      setIsUnpublishModalOpen(false);
      setUnpublishReason("");
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal melakukan unpublish.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Publish Rapor"
        description="Terbitkan rapor yang sudah disetujui Kepala Sekolah ke Parent Portal."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Siap Publish</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalApproved}</h3>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Telah Dipublish</p>
            <h3 className="text-2xl font-bold mt-1">{totalPublished}</h3>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periode</label>
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

          <div className="w-full md:w-40 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Publish</label>
            <select 
              value={filterStatus} 
              onChange={(e) => { setFilterStatus(e.target.value); setSelectedIds([]); }} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua</option>
              <option value="approved">Siap Publish (Approved)</option>
              <option value="published">Telah Dipublish</option>
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
        <div className={`border rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${filterStatus === 'published' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 px-3">
            <CheckSquare className={`w-5 h-5 ${filterStatus === 'published' ? 'text-red-600' : 'text-emerald-600'}`} />
            <span className={`font-semibold ${filterStatus === 'published' ? 'text-red-900' : 'text-emerald-900'}`}>{selectedIds.length} Siswa Terpilih</span>
          </div>
          
          {filterStatus === 'published' ? (
            <button
              onClick={() => setIsUnpublishModalOpen(true)}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Unpublish (Tarik Rapor)
            </button>
          ) : (
            <button
              onClick={handleBulkPublish}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish ke Parent Portal
            </button>
          )}
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
            <h3 className="text-lg font-bold mb-2">Tidak Ada Data</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Pastikan Anda memfilter rapor yang sudah "Approved" atau "Published".
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
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedIds.length === filteredReports.length && filteredReports.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 w-40">Kelas</th>
                  <th className="px-4 py-3">Data Siswa</th>
                  <th className="px-4 py-3 w-64">Jadwal Publish</th>
                  <th className="px-4 py-3 w-48 text-right">Status Publish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReports.map((report) => {
                  const student = report.students as any;
                  const period = report.report_periods as any;
                  const isApproved = report.status === 'approved';
                  const isPublished = report.status === 'published';
                  const publishDate = period?.publish_date ? new Date(period.publish_date) : null;
                  const isPastPublishDate = publishDate ? publishDate <= new Date() : false;
                  
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedIds.includes(report.id)}
                          onChange={() => handleToggleSelect(report.id)}
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
                        {publishDate ? (
                          <div className={`text-xs flex items-center gap-1.5 ${isPastPublishDate ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {publishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Belum diatur</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                            <Send className="w-3.5 h-3.5" /> Published
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 uppercase">
                            <CheckCircle className="w-3.5 h-3.5" /> Siap Publish
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unpublish Modal */}
      <Modal isOpen={isUnpublishModalOpen} title="Unpublish Rapor (Tarik Kembali)" onClose={() => setIsUnpublishModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm border border-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Rapor ini akan ditarik dari Parent Portal dan statusnya dikembalikan ke <strong>"Approved"</strong>.<br/>
              Wajib mencantumkan alasan penarikan untuk dokumentasi.
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Alasan Unpublish</label>
            <textarea 
              rows={3}
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
              placeholder="Contoh: Ada salah ketik nama di catatan wali kelas..."
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 text-sm resize-y"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
          <button 
            onClick={() => setIsUnpublishModalOpen(false)}
            disabled={isSubmitting}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-background"
          >
            Batal
          </button>
          <button 
            onClick={handleBulkUnpublish}
            disabled={isSubmitting || !unpublishReason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Tarik Rapor (Unpublish)
          </button>
        </div>
      </Modal>

    </div>
  );
};
