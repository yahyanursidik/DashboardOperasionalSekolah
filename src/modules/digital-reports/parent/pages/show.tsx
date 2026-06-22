import React, { useState, useEffect } from "react";
import { useShow, useList, useGetIdentity } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle, Heart, FileText, Download, Award, User, Clock } from "lucide-react";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import { logAudit } from "../../../../lib/audit";

export const ParentReportShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user } = useGetIdentity<any>();

  // Fetch Report Header Data
  const { queryResult: reportQuery, refetch: refetchReport } = useShow({
    resource: "student_reports",
    id,
    meta: {
      select: "*, students(full_name, nisn), classes(name), report_periods(name, academic_year_id, semester_id, report_type), report_templates(*, sections:report_template_sections(*, items:report_template_items(*))), report_pdf_exports(file_url)"
    }
  });

  const reportData = reportQuery.data?.data as any;
  const template = reportData?.report_templates;
  const period = reportData?.report_periods;

  // Verify Ownership
  const { data: parentLinks, isLoading: isLoadingLinks } = useList({
    resource: "student_parent_links",
    pagination: { mode: "off" },
    filters: [
      { field: "parent_id", operator: "eq", value: user?.id },
      { field: "student_id", operator: "eq", value: reportData?.student_id }
    ],
    queryOptions: { enabled: !!user?.id && !!reportData?.student_id }
  });

  // Fetch Scores
  const { data: scoresData, isLoading: isScoresLoading } = useList({
    resource: "student_report_scores",
    pagination: { mode: "off" },
    filters: [{ field: "report_id", operator: "eq", value: id }],
    queryOptions: { enabled: !!id }
  });

  // Fetch Notes (strictly parent_visible only)
  const { data: notesData, isLoading: isNotesLoading } = useList({
    resource: "student_report_notes",
    pagination: { mode: "off" },
    filters: [
      { field: "report_id", operator: "eq", value: id },
      { field: "parent_visible", operator: "eq", value: true }
    ],
    queryOptions: { enabled: !!id }
  });

  // Check if Parent has read
  const { data: readLog, refetch: refetchReadLog } = useList({
    resource: "parent_report_reads",
    pagination: { mode: "off" },
    filters: [
      { field: "report_id", operator: "eq", value: id },
      { field: "parent_id", operator: "eq", value: user?.id }
    ],
    queryOptions: { enabled: !!id && !!user?.id }
  });

  const [scoresMap, setScoresMap] = useState<Record<string, any>>({});
  const [homeroomNote, setHomeroomNote] = useState("");
  const [homeAdviceNote, setHomeAdviceNote] = useState("");
  const [principalNote, setPrincipalNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (scoresData?.data) {
      const map: Record<string, any> = {};
      scoresData.data.forEach(s => { map[s.item_id] = s; });
      setScoresMap(map);
    }
  }, [scoresData?.data]);

  useEffect(() => {
    if (notesData?.data) {
      const hrNote = notesData.data.find(n => n.note_type === 'homeroom_note');
      const advNote = notesData.data.find(n => n.note_type === 'home_advice');
      const prNote = notesData.data.find(n => n.note_type === 'principal_note');
      
      if (hrNote) setHomeroomNote(hrNote.note);
      if (advNote) setHomeAdviceNote(advNote.note);
      if (prNote) setPrincipalNote(prNote.note);
    }
  }, [notesData?.data]);

  const handleAcknowledge = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      await supabaseClient.from('parent_report_reads').insert({
        report_id: id,
        parent_id: user.id,
        device_info: navigator.userAgent
      });

      // Log Audit
      await logAudit(
        user.id,
        'create',
        'parent_report_reads',
        id || '',
        null,
        { action: 'Parent acknowledged reading report', device: navigator.userAgent }
      );

      toast.success("Terima kasih. Anda telah mengkonfirmasi membaca rapor ini.");
      refetchReadLog();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan konfirmasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = reportQuery.isLoading || isScoresLoading || isNotesLoading || isLoadingLinks;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Menyiapkan dokumen rapor...</p>
      </div>
    );
  }

  // Security Check
  if (reportData && parentLinks && parentLinks.data.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 text-center bg-red-50 border border-red-200 rounded-xl text-red-700">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
        <p>Anda tidak memiliki akses untuk melihat rapor ini.</p>
        <button onClick={() => navigate("/parent/reports")} className="mt-6 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-md">Kembali ke Daftar Rapor</button>
      </div>
    );
  }

  if (reportData?.status !== 'published') {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 text-center bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
        <Clock className="w-12 h-12 mx-auto mb-4 text-amber-500" />
        <h2 className="text-xl font-bold mb-2">Rapor Belum Tersedia</h2>
        <p>Rapor ini sedang diproses atau belum waktunya diterbitkan oleh sekolah.</p>
        <button onClick={() => navigate("/parent/reports")} className="mt-6 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-md">Kembali</button>
      </div>
    );
  }

  const sortedSections = [...(template?.sections || [])]
    .filter((s: any) => s.parent_visible !== false) // Default to true if null
    .sort((a, b) => a.display_order - b.display_order);

  const hasRead = readLog?.data && readLog.data.length > 0;
  const readDate = hasRead ? new Date(readLog.data[0].read_at) : null;

  const pdfExports = reportData?.report_pdf_exports || [];
  const latestPdf = pdfExports.length > 0 ? pdfExports[0].file_url : null;


  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      
      {/* Navigation */}
      <button 
        onClick={() => navigate("/parent/reports")} 
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Rapor
      </button>

      {/* Main Document Container */}
      <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
        
        {/* Cover / Header Section */}
        <div className="bg-primary/5 p-8 border-b text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Laporan Perkembangan Ananda</h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
              Laporan ini disusun sebagai ikhtiar sekolah dan orang tua dalam membersamai perkembangan ananda. Semoga Allah mudahkan proses tumbuh dan belajarnya.
            </p>
            
            <div className="bg-background rounded-xl p-6 shadow-sm border max-w-2xl mx-auto text-left flex items-center gap-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{reportData.students?.full_name}</h2>
                <div className="text-muted-foreground text-sm flex gap-4 mt-1">
                  <span>NISN: {reportData.students?.nisn || "-"}</span>
                  <span>Kelas: {reportData.classes?.name}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 inline-flex flex-wrap justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="bg-background px-3 py-1.5 rounded-full border">{period?.name}</span>
              <span className="bg-background px-3 py-1.5 rounded-full border">{period?.report_type === 'pts' ? 'Tengah Semester' : period?.report_type === 'pas' ? 'Akhir Semester' : period?.report_type}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-10">
          
          {/* Loop Assessment Sections */}
          {sortedSections.map((section: any) => {
            const items = [...(section.items || [])]
              .filter((i: any) => i.parent_visible !== false) // Ensure parent visible only
              .sort((a: any, b: any) => a.display_order - b.display_order);

            if (items.length === 0) return null;

            return (
              <div key={section.id} className="space-y-4">
                <h3 className="text-xl font-bold text-foreground border-b pb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> {section.title}
                </h3>
                {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
                
                <div className="grid grid-cols-1 gap-3">
                  {items.map((item: any) => {
                    const score = scoresMap[item.id];
                    // Skip if score is completely empty (though usually they have something)
                    if (!score || (!score.score_numeric && !score.score_predicate && !score.score_narrative)) return null;

                    return (
                      <div key={item.id} className="bg-muted/30 p-4 rounded-xl border flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{item.name}</h4>
                          {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                        </div>
                        <div className="md:w-1/2 flex flex-col gap-2 md:items-end text-left md:text-right">
                          {score.score_numeric && (
                            <div className="text-sm">Nilai: <span className="font-bold text-lg ml-1">{score.score_numeric}</span></div>
                          )}
                          {score.score_predicate && (
                            <div className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg text-sm w-fit md:ml-auto">
                              {score.score_predicate}
                            </div>
                          )}
                          {score.score_narrative && (
                            <div className="mt-2 text-sm italic text-muted-foreground bg-background p-3 rounded-lg border text-left w-full shadow-sm">
                              "{score.score_narrative}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Teacher Notes & Home Advice */}
          <div className="pt-6 border-t space-y-6">
            
            {(homeroomNote || homeAdviceNote) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {homeroomNote && (
                  <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-400"></div>
                    <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">Catatan Wali Kelas</h4>
                    <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{homeroomNote}</p>
                  </div>
                )}
                {homeAdviceNote && (
                  <div className="bg-sky-50 rounded-xl p-6 border border-sky-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-sky-400"></div>
                    <h4 className="font-bold text-sky-900 mb-3 flex items-center gap-2"><Heart className="w-4 h-4" /> Saran Pendampingan di Rumah</h4>
                    <p className="text-sm text-sky-800 leading-relaxed whitespace-pre-wrap">{homeAdviceNote}</p>
                  </div>
                )}
              </div>
            )}

            {principalNote && (
              <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-400"></div>
                <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">Catatan Kepala Sekolah</h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap italic">"{principalNote}"</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer / Acknowledgment */}
        <div className="bg-muted/20 p-8 border-t text-center">
          {hasRead ? (
            <div className="inline-flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="font-bold text-emerald-800 text-lg">Terima Kasih</h4>
              <p className="text-sm text-emerald-700">
                Anda telah membaca laporan ini pada<br/>
                <strong>{readDate?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-4">
                Dengan menekan tombol di bawah ini, Anda menyatakan telah menerima dan membaca laporan perkembangan ananda.
              </p>
              <button 
                onClick={handleAcknowledge}
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Saya sudah membaca laporan ini
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t flex justify-center">
             {latestPdf ? (
               <a 
                  href={latestPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2 bg-background border border-primary shadow-sm hover:bg-muted rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 text-primary"
                >
                  <Download className="w-4 h-4" /> Unduh Versi PDF
                </a>
             ) : (
                <button 
                  disabled
                  className="px-6 py-2 bg-background border shadow-sm rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 text-muted-foreground opacity-50 cursor-not-allowed"
                  title="PDF belum tersedia"
                >
                  <Download className="w-4 h-4" /> Unduh Versi PDF
                </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
