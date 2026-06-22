import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, FilterX, Loader2, CheckCircle2, Clock, FileText, Smartphone, AlertCircle, Phone } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";

export const ReadReceiptsList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();

  const [filterUnit, setFilterUnit] = useState<string>(activeUnitId || "");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterReadStatus, setFilterReadStatus] = useState<string>(""); // 'read', 'unread'
  const [searchTerm, setSearchTerm] = useState("");

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

  // Fetch only published reports
  const { data: studentReports, isLoading } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "eq", value: "published" },
      ...(filterClass ? [{ field: "class_id", operator: "eq", value: filterClass } as any] : []),
      ...(filterPeriod ? [{ field: "report_period_id", operator: "eq", value: filterPeriod } as any] : [])
    ],
    meta: {
      select: "*, students(full_name, nisn, student_parent_links(parents(profiles(full_name)))), classes!inner(unit_id, name), report_periods(name, publish_date), parent_report_reads(read_at)"
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

    if (filterReadStatus === 'read') {
      list = list.filter(r => r.parent_report_reads && r.parent_report_reads.length > 0);
    } else if (filterReadStatus === 'unread') {
      list = list.filter(r => !r.parent_report_reads || r.parent_report_reads.length === 0);
    }
    
    return list.sort((a, b) => {
      const classCmp = (a.classes?.name || "").localeCompare(b.classes?.name || "");
      if (classCmp !== 0) return classCmp;
      return (a.students?.full_name || "").localeCompare(b.students?.full_name || "");
    });
  }, [studentReports?.data, searchTerm, filterUnit, filterReadStatus]);

  // Metrics
  const totalPublished = useMemo(() => filteredReports.length, [filteredReports, filterReadStatus]);
  const totalRead = useMemo(() => filteredReports.filter(r => r.parent_report_reads && r.parent_report_reads.length > 0).length, [filteredReports]);
  const totalUnread = useMemo(() => filteredReports.filter(r => !r.parent_report_reads || r.parent_report_reads.length === 0).length, [filteredReports]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Tanda Terima (Read Receipts)"
        description="Pantau laporan hasil belajar yang sudah atau belum dibaca oleh orang tua."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Total Publish</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalPublished}</h3>
          </div>
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-emerald-800 text-sm font-medium">Sudah Dibaca (Acknowledged)</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-900">{totalRead}</h3>
          </div>
          <div className="w-10 h-10 bg-emerald-200/50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-red-800 text-sm font-medium">Belum Dibaca (Perlu Follow-up)</p>
            <h3 className="text-2xl font-bold mt-1 text-red-900">{totalUnread}</h3>
          </div>
          <div className="w-10 h-10 bg-red-200/50 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
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

          <div className="w-full md:w-32 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-full md:w-40 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Baca</label>
            <select 
              value={filterReadStatus} 
              onChange={(e) => setFilterReadStatus(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua Status</option>
              <option value="read">Sudah Dibaca</option>
              <option value="unread">Belum Dibaca</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterPeriod(""); setFilterClass(""); setFilterReadStatus(""); if(!activeUnitId) setFilterUnit(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px] shrink-0"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Memuat data tanda terima...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex-1 p-16 text-center">
            <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Tidak Ada Data</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Tidak ada data rapor yang diterbitkan atau sesuai dengan kriteria pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-32">Kelas</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 w-64">Nama Orang Tua (Akun)</th>
                  <th className="px-4 py-3 w-48 text-right">Status Dibaca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReports.map((report, idx) => {
                  const student = report.students as any;
                  const parentLinks = student?.student_parent_links || [];
                  const parentNames = parentLinks.map((link: any) => link.parents?.profiles?.full_name).filter(Boolean).join(", ");
                  
                  const reads = report.parent_report_reads || [];
                  const isRead = reads.length > 0;
                  const readDate = isRead ? new Date(reads[0].read_at) : null;
                  
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-4 font-semibold text-muted-foreground">
                        {report.classes?.name}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{student?.full_name}</div>
                        <div className="text-xs text-muted-foreground">NISN: {student?.nisn || "-"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-muted-foreground">{parentNames || <span className="italic text-xs">Belum di-link</span>}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isRead ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dibaca
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {readDate?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 uppercase">
                              <Clock className="w-3.5 h-3.5" /> Belum Dibaca
                            </span>
                            {/* Action to Follow Up via WA could be added here in future */}
                          </div>
                        )}
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
