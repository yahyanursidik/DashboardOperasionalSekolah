import React, { useState, useEffect } from "react";
import { useShow, useList, useGetIdentity } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertTriangle, Send, History } from "lucide-react";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import { useCurrentRoles } from "../../../../hooks/useAuth";
import { hasRole } from "../../../../lib/permissions";
import { Edit3 } from "lucide-react";
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

export const HomeroomReviewForm: React.FC = () => {
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

  const { data: notesData, refetch: refetchNotes } = useList({
    resource: "student_report_notes",
    pagination: { mode: "off" },
    filters: [{ field: "report_id", operator: "eq", value: id }],
    queryOptions: { enabled: !!id }
  });

  const { data: peerReports } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "class_id", operator: "eq", value: reportData?.class_id },
      { field: "report_period_id", operator: "eq", value: reportData?.report_period_id },
      { field: "status", operator: "ne", value: "archived" }
    ],
    meta: { select: "id, students(full_name)" },
    queryOptions: { enabled: !!reportData?.class_id }
  });

  // Derived State
  const sortedPeers = React.useMemo(() => {
    if (!peerReports?.data) return [];
    return [...peerReports.data].sort((a, b) => ((a.students as any)?.full_name || "").localeCompare((b.students as any)?.full_name || ""));
  }, [peerReports?.data]);

  const currentIndex = sortedPeers.findIndex(p => p.id === id);
  const prevPeer = currentIndex > 0 ? sortedPeers[currentIndex - 1] : null;
  const nextPeer = currentIndex < sortedPeers.length - 1 ? sortedPeers[currentIndex + 1] : null;

  const [scoresMap, setScoresMap] = useState<Record<string, any>>({});
  
  // Notes State
  const [homeroomNote, setHomeroomNote] = useState({ id: "", text: "" });
  const [homeAdviceNote, setHomeAdviceNote] = useState({ id: "", text: "" });

  // Modals
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
      if (hrNote) setHomeroomNote({ id: hrNote.id as string, text: hrNote.note });
      if (advNote) setHomeAdviceNote({ id: advNote.id as string, text: advNote.note });
    }
  }, [notesData?.data]);

  // Actions
  const handleSaveNote = async (type: 'homeroom_note' | 'home_advice', text: string, existingId: string) => {
    if (!user?.id) return;
    try {
      if (existingId) {
        await supabaseClient.from('student_report_notes').update({ note: text, updated_by: user.id }).eq('id', existingId);
      } else if (text.trim()) {
        const { data } = await supabaseClient.from('student_report_notes').insert({
          report_id: id,
          note_type: type,
          note: text,
          parent_visible: true,
          created_by: user.id,
          updated_by: user.id
        }).select('id').single();
        
        if (data) {
          if (type === 'homeroom_note') setHomeroomNote({ id: (data as any).id, text });
          if (type === 'home_advice') setHomeAdviceNote({ id: (data as any).id, text });
        }
      }

      await logAudit(
        user.id,
        'update',
        'student_report_notes',
        existingId || 'new',
        null,
        { note_type: type, message: 'Homeroom saved note' }
      );

      toast.success("Catatan berhasil disimpan.");
    } catch (err) {
      toast.error("Gagal menyimpan catatan.");
    }
  };

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
        comments: comments || null
      });

      // Update main report
      await supabaseClient.from('student_reports').update({ status: newStatus }).eq('id', id);
      
      // If revision, optionally add as an internal note
      if (newStatus === 'revision_needed' && comments) {
        await supabaseClient.from('student_report_notes').insert({
          report_id: id,
          note_type: 'revision_note',
          note: comments,
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
      {/* Header & Navigation */}
      <div className="bg-card border rounded-xl shadow-sm p-4 sticky top-16 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/reports/homeroom-review")} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{reportData.students?.full_name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>NISN: {reportData.students?.nisn || "-"}</span>
              <span>•</span>
              <span className="uppercase font-bold text-primary">{reportData.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          {reportData.status !== 'approved' && reportData.status !== 'published' && reportData.status !== 'wakasek_review' && (
            <div className="flex gap-2 mr-4">
              <button 
                onClick={() => setIsRevisionModalOpen(true)}
                className="px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-md border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-2 text-sm"
              >
                <AlertTriangle className="w-4 h-4" /> Request Revisi
              </button>
              <button 
                onClick={() => handleUpdateStatus('wakasek_review', 'Submit ke Wakasek')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit ke Wakasek
              </button>
            </div>
          )}
          
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button 
              onClick={() => prevPeer && navigate(`/reports/homeroom-review/${prevPeer.id}`)}
              disabled={!prevPeer}
              className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-background hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              &laquo; Siswa Sebelumnya
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => nextPeer && navigate(`/reports/homeroom-review/${nextPeer.id}`)}
              disabled={!nextPeer}
              className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-background hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              Selanjutnya &raquo;
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Col: Review Teacher Inputs */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Ringkasan Nilai dari Guru</h2>
          </div>
          
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
                        <div key={item.id} className={`flex flex-col md:flex-row gap-4 p-4 rounded-lg border ${isEmpty ? 'bg-red-50/50 border-red-100' : 'bg-background'}`}>
                          <div className="md:w-1/3">
                            <p className="font-semibold text-sm">{idx + 1}. {item.name}</p>
                            {isEmpty && <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">Belum Diisi</span>}
                          </div>
                          <div className="md:w-2/3 space-y-2">
                            {score?.score_numeric && <div className="text-sm"><span className="text-muted-foreground">Nilai Angka:</span> <strong className="text-lg">{score.score_numeric}</strong></div>}
                            {score?.score_predicate && <div className="text-sm"><span className="text-muted-foreground">Predikat/Capaian:</span> <strong>{score.score_predicate}</strong></div>}
                            {score?.score_narrative && <div className="text-sm bg-muted/30 p-3 rounded-md italic">"{score.score_narrative}"</div>}
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

        {/* Right Col: Homeroom Inputs */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Edit3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Catatan Wali Kelas</h2>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-foreground">Catatan Perkembangan Siswa</label>
                <p className="text-xs text-muted-foreground mt-1">Gunakan bahasa yang menggambarkan proses, bukan melabeli anak.</p>
              </div>
              <textarea 
                rows={5}
                value={homeroomNote.text}
                onChange={(e) => setHomeroomNote(prev => ({ ...prev, text: e.target.value }))}
                onBlur={(e) => handleSaveNote('homeroom_note', e.target.value, homeroomNote.id)}
                placeholder="Ananda menunjukkan perkembangan yang luar biasa pada semester ini dalam hal..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-sm resize-y"
              />
            </div>

            <hr className="border-border" />

            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-foreground">Saran Pendampingan di Rumah</label>
                <p className="text-xs text-muted-foreground mt-1">Saran rumah sebaiknya sederhana dan tidak memberatkan orang tua.</p>
              </div>
              <textarea 
                rows={4}
                value={homeAdviceNote.text}
                onChange={(e) => setHomeAdviceNote(prev => ({ ...prev, text: e.target.value }))}
                onBlur={(e) => handleSaveNote('home_advice', e.target.value, homeAdviceNote.id)}
                placeholder="Mohon ananda dibantu merutinkan muraja'ah surat-surat pendek ba'da Maghrib..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-sm resize-y"
              />
            </div>

            <AuditHistory resourceId={id || ''} />

          </div>
        </div>

      </div>

      {/* Revision Modal */}
      <Modal isOpen={isRevisionModalOpen} title="Kembalikan ke Guru (Request Revisi)" onClose={() => setIsRevisionModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Status rapor akan dikembalikan menjadi <strong>"Butuh Revisi"</strong>. Catatan revisi ini hanya dapat dilihat secara internal oleh guru.
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Catatan Revisi Internal</label>
            <textarea 
              rows={4}
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              placeholder="Sebutkan spesifik guru siapa dan nilai bagian mana yang perlu diperbaiki..."
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
