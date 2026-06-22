import React, { useState, useEffect } from "react";
import { useShow, useList, useGetIdentity } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Send, ShieldCheck, History } from "lucide-react";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import { logAudit } from "../../../../lib/audit";
import { AuditHistory } from "../../components/AuditHistory";

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

export const WakasekReviewForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user } = useGetIdentity<any>();

  // Data Fetching
  const { queryResult } = useShow({
    resource: "student_reports",
    id,
    meta: {
      select: "*, students(full_name, nisn), classes(name), report_periods(name), report_templates(*, sections:report_template_sections(*, items:report_template_items(*)))"
    }
  });
  const reportQuery = queryResult;
  const refetchReport = queryResult.refetch;

  const reportData = reportQuery.data?.data as any;
  const template = reportData?.report_templates;

  const { data: scoresData, isLoading: isScoresLoading } = useList({
    resource: "student_report_scores",
    pagination: { mode: "off" },
    filters: [{ field: "report_id", operator: "eq", value: id }],
    queryOptions: { enabled: !!id }
  });

  const { data: notesData } = useList({
    resource: "student_report_notes",
    pagination: { mode: "off" },
    filters: [{ field: "report_id", operator: "eq", value: id }],
    queryOptions: { enabled: !!id }
  });

  const { data: reviewLogs } = useList({
    resource: "report_reviews",
    pagination: { mode: "off" },
    filters: [{ field: "report_id", operator: "eq", value: id }],
    meta: { select: "*, profiles(full_name)" },
    queryOptions: { enabled: !!id },
    sorters: [{ field: "created_at", order: "desc" }]
  });

  const [scoresMap, setScoresMap] = useState<Record<string, any>>({});
  const [homeroomNote, setHomeroomNote] = useState("");
  const [homeAdviceNote, setHomeAdviceNote] = useState("");
  
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionText, setRevisionText] = useState("");
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
      if (hrNote) setHomeroomNote(hrNote.note);
      if (advNote) setHomeAdviceNote(advNote.note);
    }
  }, [notesData?.data]);

  const handleUpdateStatus = async (newStatus: string, actionName: string, comments?: string) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      // Log to report_reviews
      await supabaseClient.from('report_reviews').insert({
        report_id: id,
        reviewer_id: user.id,
        status_from: reportData.status,
        status_to: newStatus,
        comments: comments || `Wakasek Action: ${actionName}`
      });

      // Update main report
      await supabaseClient.from('student_reports').update({ status: newStatus }).eq('id', id);
      
      // If revision, optionally add as an internal note
      if (newStatus === 'revision_needed' && comments) {
        await supabaseClient.from('student_report_notes').insert({
          report_id: id,
          note_type: 'revision_note',
          note: `[Dari Wakasek] ${comments}`,
          parent_visible: false,
          created_by: user.id,
          updated_by: user.id
        });
      }

      await logAudit(
        user.id,
        'status-change',
        'student_reports',
        id || '',
        { status: reportData.status },
        { status: newStatus, comments }
      );

      toast.success(`Rapor berhasil di-${actionName}!`);
      setIsRevisionModalOpen(false);
      refetchReport();
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengubah status rapor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reportQuery.isLoading || isScoresLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reportData) return <div className="p-8 text-center text-red-500 font-bold">Data rapor tidak ditemukan.</div>;

  const sortedSections = [...(template?.sections || [])].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-card border rounded-xl shadow-sm p-4 sticky top-16 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/reports/wakasek-review")} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{reportData.students?.full_name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>NISN: {reportData.students?.nisn || "-"}</span>
              <span>•</span>
              <span>{reportData.classes?.name}</span>
              <span>•</span>
              <span className="uppercase font-bold text-primary">{reportData.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reportData.status === 'wakasek_review' && (
            <>
              <button 
                onClick={() => setIsRevisionModalOpen(true)}
                className="px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-md border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-2 text-sm"
              >
                <AlertTriangle className="w-4 h-4" /> Tolak & Kembalikan
              </button>
              <button 
                onClick={() => handleUpdateStatus('principal_approval', 'Approve')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Setujui Rapor
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Col: Review Teacher Inputs */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm divide-y">
            {sortedSections.map((section: any) => {
              const items = [...(section.items || [])].sort((a: any, b: any) => a.display_order - b.display_order);
              return (
                <div key={section.id} className="p-0">
                  <div className="px-6 py-3 bg-muted/20 font-bold text-sm text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </div>
                  <div className="p-6 space-y-4">
                    {items.length === 0 ? <p className="text-sm text-muted-foreground italic">Tidak ada item penilaian.</p> : null}
                    {items.map((item: any, idx: number) => {
                      const score = scoresMap[item.id];
                      const isEmpty = !score || (!score.score_numeric && !score.score_predicate && !score.score_narrative);
                      
                      return (
                        <div key={item.id} className={`flex flex-col md:flex-row gap-4 p-4 rounded-lg border ${isEmpty ? 'bg-red-50/50 border-red-100' : 'bg-background'} ${item.assessment_type === 'narrative' ? 'bg-blue-50/30' : ''}`}>
                          <div className="md:w-1/3">
                            <p className="font-semibold text-sm">{idx + 1}. {item.name}</p>
                            {!item.parent_visible && <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded">Internal</span>}
                            {isEmpty && <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">Kosong</span>}
                          </div>
                          <div className="md:w-2/3 space-y-2">
                            {score?.score_numeric && <div className="text-sm"><span className="text-muted-foreground">Nilai Angka:</span> <strong className="text-lg">{score.score_numeric}</strong></div>}
                            {score?.score_predicate && <div className="text-sm"><span className="text-muted-foreground">Predikat/Capaian:</span> <strong>{score.score_predicate}</strong></div>}
                            {score?.score_narrative && <div className="text-sm bg-blue-100/50 p-3 rounded-md border border-blue-200"><strong>Catatan Guru:</strong><br/><span className="italic">"{score.score_narrative}"</span></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Notes & Audit */}
        <div className="space-y-6">
          
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-emerald-200 bg-emerald-100/50 font-bold text-emerald-900 flex items-center gap-2">
              Catatan Wali Kelas
            </div>
            <div className="p-5 text-sm text-emerald-900">
              {homeroomNote ? (
                <div className="whitespace-pre-wrap">{homeroomNote}</div>
              ) : (
                <span className="italic opacity-70">Wali kelas belum menambahkan catatan akhir.</span>
              )}
            </div>
          </div>

          <div className="bg-sky-50 rounded-xl border border-sky-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-sky-200 bg-sky-100/50 font-bold text-sky-900 flex items-center gap-2">
              Saran Pendampingan
            </div>
            <div className="p-5 text-sm text-sky-900">
              {homeAdviceNote ? (
                <div className="whitespace-pre-wrap">{homeAdviceNote}</div>
              ) : (
                <span className="italic opacity-70">Belum ada saran pendampingan.</span>
              )}
            </div>
          </div>

          <AuditHistory resourceId={id || ''} />

        </div>

      </div>

      {/* Revision Modal */}
      <Modal isOpen={isRevisionModalOpen} title="Kembalikan ke Wali Kelas (Request Revisi)" onClose={() => setIsRevisionModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm border border-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Rapor ini akan dikembalikan ke Wali Kelas dengan status <strong>"Butuh Revisi"</strong>.
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Instruksi Revisi untuk Wali Kelas/Guru</label>
            <textarea 
              rows={4}
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              placeholder="Contoh: Tolong perbaiki catatan wali kelas agar lebih halus bahasanya..."
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-sm resize-y"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
          <button 
            onClick={() => setIsRevisionModalOpen(false)}
            disabled={isSubmitting}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-background"
          >
            Batal
          </button>
          <button 
            onClick={() => handleUpdateStatus('revision_needed', 'Request Revisi', revisionText)}
            disabled={isSubmitting || !revisionText.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Kirim Request Revisi
          </button>
        </div>
      </Modal>

    </div>
  );
};
