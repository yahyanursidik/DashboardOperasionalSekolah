import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { BarChart3, FilterX, Loader2, Users, FileText, CheckCircle, Clock, AlertTriangle, Send } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";

export const MonitoringDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();

  // Filters
  const [filterUnit, setFilterUnit] = useState<string>(activeUnitId || "");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");

  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", pagination: { mode: "off" }, filters: filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : [] });
  const { data: periods } = useList({ resource: "report_periods", pagination: { mode: "off" }, filters: filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : [] });

  // Fetch all reports to compute metrics
  const { data: reports, isLoading } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      ...(filterClass ? [{ field: "class_id", operator: "eq", value: filterClass }] : []),
      ...(filterPeriod ? [{ field: "report_period_id", operator: "eq", value: filterPeriod }] : [])
    ],
    meta: {
      select: "*, classes!inner(unit_id, name), report_periods!inner(name, publish_date), parent_report_reads(id)"
    }
  });

  // Calculate Metrics
  const metrics = useMemo(() => {
    let data = reports?.data || [];
    
    // Apply unit filter client-side because of nested classes relation
    if (filterUnit) {
      data = data.filter(r => r.classes?.unit_id === filterUnit);
    }

    const m = {
      total: data.length,
      draft: 0,
      teacher_input: 0,
      homeroom_review: 0,
      wakasek_review: 0,
      principal_approval: 0,
      revision: 0,
      approved: 0,
      published: 0,
      unread: 0,
      pastDeadline: 0,
      classesIncomplete: new Set<string>()
    };

    const now = new Date();

    data.forEach(r => {
      // Status metrics
      if (r.status === 'draft') m.draft++;
      else if (r.status === 'teacher_input') m.teacher_input++;
      else if (r.status === 'homeroom_review') m.homeroom_review++;
      else if (r.status === 'wakasek_review') m.wakasek_review++;
      else if (r.status === 'principal_approval') m.principal_approval++;
      else if (r.status === 'approved') m.approved++;
      else if (r.status === 'published') {
        m.published++;
        // Check unread
        const reads = r.parent_report_reads || [];
        if (reads.length === 0) m.unread++;
      }

      if (r.status.includes('revision')) m.revision++;

      // Incomplete classes (not approved or published)
      if (r.status !== 'approved' && r.status !== 'published') {
        m.classesIncomplete.add(r.classes?.name || "Unknown");
      }

      // Past deadline check
      if (r.report_periods?.publish_date) {
        const pDate = new Date(r.report_periods.publish_date);
        if (pDate < now && r.status !== 'published') {
          m.pastDeadline++;
        }
      }
    });

    return {
      ...m,
      classesIncompleteArray: Array.from(m.classesIncomplete)
    };
  }, [reports?.data, filterUnit]);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Monitoring Rapor"
        description="Pantau progres pengisian, review, dan distribusi rapor secara real-time."
      />

      {/* Advanced Filters */}
      <div className="bg-card border rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-end">
        {!activeUnitId && (
          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</label>
            <select value={filterUnit} onChange={(e) => { setFilterUnit(e.target.value); setFilterClass(""); setFilterPeriod(""); }} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Unit</option>
              {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
            </select>
          </div>
        )}

        <div className="w-full md:w-48 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periode</label>
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
            <option value="">Semua Periode</option>
            {periods?.data?.map(p => <option key={p.id} value={p.id as string}>{p.name}</option>)}
          </select>
        </div>

        <div className="w-full md:w-48 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas</label>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
            <option value="">Semua Kelas</option>
            {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
          </select>
        </div>

        <button onClick={() => { setFilterPeriod(""); setFilterClass(""); if(!activeUnitId) setFilterUnit(""); }} className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px] shrink-0">
          <FilterX className="w-4 h-4" /> Reset
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Menganalisis data...</p>
        </div>
      ) : (
        <>
          {/* Main Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            
            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <div className="text-muted-foreground text-xs font-bold uppercase mb-1">Total Rapor</div>
              <div className="text-3xl font-bold">{metrics.total}</div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-slate-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> Draft</div>
              <div className="text-3xl font-bold text-slate-800">{metrics.draft}</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="text-blue-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Input Guru</div>
              <div className="text-3xl font-bold text-blue-800">{metrics.teacher_input}</div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
              <div className="text-indigo-600 text-xs font-bold uppercase mb-1">Review Walas</div>
              <div className="text-3xl font-bold text-indigo-800">{metrics.homeroom_review}</div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
              <div className="text-purple-600 text-xs font-bold uppercase mb-1">Review Wakasek</div>
              <div className="text-3xl font-bold text-purple-800">{metrics.wakasek_review}</div>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 shadow-sm">
              <div className="text-pink-600 text-xs font-bold uppercase mb-1">Approval Kepsek</div>
              <div className="text-3xl font-bold text-pink-800">{metrics.principal_approval}</div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
              <div className="text-orange-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Perlu Revisi</div>
              <div className="text-3xl font-bold text-orange-800">{metrics.revision}</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
              <div className="text-emerald-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Approved</div>
              <div className="text-3xl font-bold text-emerald-800">{metrics.approved}</div>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 shadow-sm">
              <div className="text-teal-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Send className="w-3 h-3"/> Published</div>
              <div className="text-3xl font-bold text-teal-800">{metrics.published}</div>
            </div>

          </div>

          {/* Actionable Alerts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-muted/50 p-4 border-b font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Kelas Belum Selesai (Incomplete)
              </div>
              <div className="p-4 flex-1">
                {metrics.classesIncompleteArray.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium">Semua kelas sudah beres (Approved/Published).</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {metrics.classesIncompleteArray.map(c => (
                      <span key={c} className="px-3 py-1 bg-muted rounded-full text-sm font-semibold border">{c}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">Menampilkan kelas yang masih memiliki rapor di tahap Input, Review, atau Approval.</p>
              </div>
            </div>

            <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-red-50 p-4 border-b border-red-100 font-bold text-red-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" /> Peringatan Keterlambatan
              </div>
              <div className="p-4 flex-1 space-y-4">
                
                <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-lg">
                  <div>
                    <div className="font-semibold text-red-900">Melewati Tanggal Publish</div>
                    <div className="text-xs text-red-700">Rapor belum terbit padahal sudah lewat batas waktu.</div>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{metrics.pastDeadline}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <div>
                    <div className="font-semibold text-orange-900">Orang Tua Belum Membaca</div>
                    <div className="text-xs text-orange-700">Rapor sudah published tapi belum di-klik 'Sudah Baca'.</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{metrics.unread}</div>
                </div>

              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
