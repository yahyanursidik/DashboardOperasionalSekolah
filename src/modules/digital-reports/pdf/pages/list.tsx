import React, { useState, useRef, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Search, FilterX, Loader2, FileDown, Printer, CheckCircle } from "lucide-react";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ReportCardPDF } from "../components/ReportCardPDF";

export const GeneratePDFList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();

  const [filterUnit, setFilterUnit] = useState<string>(activeUnitId || "");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [renderData, setRenderData] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", pagination: { mode: "off" }, filters: filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : [] });
  const { data: periods } = useList({ resource: "report_periods", pagination: { mode: "off" }, filters: [ { field: "status", operator: "in", value: ["draft", "active"] }, ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : []) ] });

  // Fetch approved/published reports
  const { data: studentReports, isLoading, refetch } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "in", value: ["approved", "published"] },
      ...(filterClass ? [{ field: "class_id", operator: "eq", value: filterClass }] : []),
      ...(filterPeriod ? [{ field: "report_period_id", operator: "eq", value: filterPeriod }] : [])
    ],
    meta: {
      select: "*, students(full_name, nisn), classes!inner(unit_id, name), report_periods(*), report_templates(*, sections:report_template_sections(*, items:report_template_items(*))), report_pdf_exports(file_url, generated_at)"
    }
  });

  const filteredReports = useMemo(() => {
    if (!studentReports?.data) return [];
    let list = studentReports.data as any[];

    if (filterUnit) list = list.filter(r => r.classes?.unit_id === filterUnit);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => r.students?.full_name?.toLowerCase().includes(q) || r.students?.nisn?.includes(q));
    }
    
    return list.sort((a, b) => (a.students?.full_name || "").localeCompare(b.students?.full_name || ""));
  }, [studentReports?.data, searchTerm, filterUnit]);


  // PDF GENERATION LOGIC
  const handleGeneratePdf = async (report: any) => {
    if (!user?.id) return;
    setGeneratingId(report.id);
    toast.loading("Menyiapkan data PDF...", { id: `pdf-${report.id}` });

    try {
      // 1. Fetch scores & notes for this specific report to render
      const [scoresRes, notesRes] = await Promise.all([
        supabaseClient.from('student_report_scores').select('*').eq('report_id', report.id),
        supabaseClient.from('student_report_notes').select('*').eq('report_id', report.id).eq('parent_visible', true)
      ]);

      const scoresMap: Record<string, any> = {};
      scoresRes.data?.forEach(s => { scoresMap[s.item_id] = s; });

      const homeroomNote = notesRes.data?.find(n => n.note_type === 'homeroom_note')?.note || "";
      const homeAdviceNote = notesRes.data?.find(n => n.note_type === 'home_advice')?.note || "";
      const principalNote = notesRes.data?.find(n => n.note_type === 'principal_note')?.note || "";

      // 2. Set render data so the hidden component renders it
      setRenderData({
        reportData: report,
        scoresMap,
        homeroomNote,
        homeAdviceNote,
        principalNote
      });

      // 3. Wait for React to render the hidden component
      toast.loading("Merender dokumen PDF...", { id: `pdf-${report.id}` });
      await new Promise(resolve => setTimeout(resolve, 500)); // give time for DOM update

      if (!printRef.current) throw new Error("Reference to PDF component missing");

      // 4. Capture Canvas
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      // 5. Create PDF
      toast.loading("Mengonversi ke PDF...", { id: `pdf-${report.id}` });
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      // 6. Upload to Supabase Storage
      toast.loading("Mengunggah ke server...", { id: `pdf-${report.id}` });
      const fileName = `${report.report_period_id}/${report.student_id}_${Date.now()}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('report_pdfs')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabaseClient.storage.from('report_pdfs').getPublicUrl(fileName);

      // 7. Save to report_pdf_exports
      await supabaseClient.from('report_pdf_exports').insert({
        report_id: report.id,
        file_url: urlData.publicUrl,
        generated_by: user.id
      });

      toast.success("PDF berhasil di-generate!", { id: `pdf-${report.id}` });
      refetch(); // update list to show download button
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal generate: ${err.message || "Pastikan bucket 'report_pdfs' sudah dibuat."}`, { id: `pdf-${report.id}` });
    } finally {
      setGeneratingId(null);
      setRenderData(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 relative">
      <PageHeader
        title="Generate PDF Rapor"
        description="Buat versi cetak PDF untuk arsip sekolah dan unduhan orang tua."
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
          
          {!activeUnitId && (
            <div className="w-full md:w-40 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</label>
              <select value={filterUnit} onChange={(e) => { setFilterUnit(e.target.value); setFilterClass(""); setFilterPeriod(""); }} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">Semua Unit</option>
                {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="w-full md:w-40 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periode</label>
            <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Periode</option>
              {periods?.data?.map(p => <option key={p.id} value={p.id as string}>{p.name}</option>)}
            </select>
          </div>

          <div className="w-full md:w-32 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
            </select>
          </div>

          <button onClick={() => { setSearchTerm(""); setFilterPeriod(""); setFilterClass(""); if(!activeUnitId) setFilterUnit(""); }} className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px] shrink-0">
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Memuat data rapor...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex-1 p-16 text-center">
            <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Printer className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Tidak Ada Data</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Tidak ada data rapor (Approved/Published) yang sesuai dengan kriteria pencarian Anda.
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
                  <th className="px-4 py-3 w-40 text-center">Status Rapor</th>
                  <th className="px-4 py-3 w-64 text-center">Status PDF</th>
                  <th className="px-4 py-3 w-48 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReports.map((report, idx) => {
                  const isGenerating = generatingId === report.id;
                  const pdfExports = report.report_pdf_exports || [];
                  const latestPdf = pdfExports.length > 0 ? pdfExports[0] : null; // Descending order assumed, or simply pick first
                  
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-4 font-semibold text-muted-foreground">{report.classes?.name}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{report.students?.full_name}</div>
                        <div className="text-xs text-muted-foreground">NISN: {report.students?.nisn || "-"}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 rounded bg-muted text-xs font-semibold uppercase">
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {latestPdf ? (
                           <div className="flex flex-col items-center gap-1">
                             <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                               <CheckCircle className="w-3 h-3" /> Tersedia
                             </span>
                             <span className="text-[10px] text-muted-foreground">
                               {new Date(latestPdf.generated_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                             </span>
                           </div>
                        ) : (
                           <span className="text-xs text-muted-foreground italic">Belum di-generate</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {latestPdf && (
                            <a 
                              href={latestPdf.file_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-background border shadow-sm rounded-md text-xs font-semibold hover:bg-muted flex items-center gap-1"
                            >
                              <FileDown className="w-3.5 h-3.5" /> Unduh
                            </a>
                          )}
                          <button 
                            onClick={() => handleGeneratePdf(report)}
                            disabled={isGenerating}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 flex items-center gap-1 disabled:opacity-50"
                          >
                            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                            Generate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HIDDEN RENDER CONTAINER FOR PDF */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}>
        {renderData && (
          <ReportCardPDF 
            ref={printRef}
            reportData={renderData.reportData}
            scoresMap={renderData.scoresMap}
            homeroomNote={renderData.homeroomNote}
            homeAdviceNote={renderData.homeAdviceNote}
            principalNote={renderData.principalNote}
          />
        )}
      </div>

    </div>
  );
};
