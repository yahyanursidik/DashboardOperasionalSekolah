import React, { useState, useEffect } from "react";
import { useShow, useList, useGetIdentity } from "@refinedev/core";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import { useCurrentRoles } from "../../../../hooks/useAuth";
import { hasRole } from "../../../../lib/permissions";
import { logAudit } from "../../../../lib/audit";

export const TeacherInputForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const listPath = location.pathname.startsWith("/teacher/") ? "/teacher/reports" : "/reports/teacher-input";
  const { data: user } = useGetIdentity<any>();
  const { roles } = useCurrentRoles();
  const isHomeroom = hasRole(roles, 'homeroom' as any) || hasRole(roles, 'wali_kelas' as any);

  // Fetch Report Data + Template
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

  // Fetch Existing Scores
  const { data: scoresData, isLoading: isScoresLoading, refetch: refetchScores } = useList({
    resource: "student_report_scores",
    pagination: { mode: "off" },
    filters: [
      { field: "report_id", operator: "eq", value: id }
    ],
    queryOptions: { enabled: !!id }
  });

  // Fetch other students in the same class for quick navigation
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

  const sortedPeers = React.useMemo(() => {
    if (!peerReports?.data) return [];
    return [...peerReports.data].sort((a, b) => ((a.students as any)?.full_name || "").localeCompare((b.students as any)?.full_name || ""));
  }, [peerReports?.data]);

  const currentIndex = sortedPeers.findIndex(p => p.id === id);
  const prevPeer = currentIndex > 0 ? sortedPeers[currentIndex - 1] : null;
  const nextPeer = currentIndex < sortedPeers.length - 1 ? sortedPeers[currentIndex + 1] : null;

  // Local State for Scores
  // Map of item_id -> score record
  const [scoresMap, setScoresMap] = useState<Record<string, any>>({});
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (scoresData?.data) {
      const map: Record<string, any> = {};
      scoresData.data.forEach(s => {
        map[s.item_id] = s;
      });
      setScoresMap(map);
    }
  }, [scoresData?.data]);

  useEffect(() => {
    if (template?.sections?.length > 0 && !activeSectionId) {
      // Sort sections by display_order
      const sorted = [...template.sections].sort((a, b) => a.display_order - b.display_order);
      setActiveSectionId(sorted[0].id);
    }
  }, [template, activeSectionId]);

  const handleScoreChange = (itemId: string, field: 'score_numeric' | 'score_predicate' | 'score_narrative', value: any) => {
    setScoresMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_id: itemId,
        report_id: id,
        [field]: value
      }
    }));
  };

  const handleSaveItem = async (itemId: string) => {
    const scoreRow = scoresMap[itemId];
    if (!scoreRow || !user?.id) return;

    setIsSaving(true);
    try {
      const payload = {
        report_id: id,
        item_id: itemId,
        score_numeric: scoreRow.score_numeric ?? null,
        score_predicate: scoreRow.score_predicate ?? null,
        score_narrative: scoreRow.score_narrative ?? null,
        updated_by: user.id
      };

      if (scoreRow.id) {
        // Update
        await supabaseClient.from('student_report_scores').update(payload).eq('id', scoreRow.id);
      } else {
        // Insert
        const payloadToInsert = { ...payload, created_by: user.id };
        const { data, error } = await supabaseClient.from('student_report_scores').insert(payloadToInsert).select('id').single();
        if (error) throw error;
        // Update local map with new ID
        setScoresMap(prev => ({
          ...prev,
          [itemId]: { ...prev[itemId], id: (data as any).id }
        }));
      }

      // Automatically update the main report status to teacher_input if it was draft
      if (reportData.status === 'draft') {
        await supabaseClient.from('student_reports').update({ status: 'teacher_input' }).eq('id', id);
        reportData.status = 'teacher_input';
      }

      // Log audit
      await logAudit(
        user.id,
        'update',
        'student_report_scores',
        id || '',
        null,
        { item_id: itemId, message: 'Teacher saved score' }
      );

      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Gagal menyimpan nilai secara otomatis.");
    } finally {
      setIsSaving(false);
    }
  };

  if (reportQuery.isLoading || isScoresLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Memuat form rapor siswa...</p>
        </div>
      </div>
    );
  }

  if (!reportData) return <div className="p-8 text-center text-red-500 font-bold">Data rapor tidak ditemukan.</div>;

  const sortedSections = [...(template?.sections || [])].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Quick Navigation */}
      <div className="bg-card border rounded-xl shadow-sm p-4 sticky top-16 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(listPath)} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{reportData.students?.full_name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>NISN: {reportData.students?.nisn || "-"}</span>
              <span>•</span>
              <span>{reportData.classes?.name}</span>
              <span>•</span>
              <span className="capitalize">{reportData.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving && <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</span>}
            {!isSaving && lastSaved && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan {lastSaved.toLocaleTimeString()}</span>}
          </div>
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button 
              onClick={() => prevPeer && navigate(`${listPath}/${prevPeer.id}`)}
              disabled={!prevPeer}
              className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-background hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            >
              &laquo; Siswa Sebelumnya
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => nextPeer && navigate(`${listPath}/${nextPeer.id}`)}
              disabled={!nextPeer}
              className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-background hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            >
              Selanjutnya &raquo;
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Sections */}
        <div className="lg:w-64 shrink-0 space-y-2">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 px-2">Komponen Rapor</div>
          {sortedSections.map((section: any) => (
            <button
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                activeSectionId === section.id 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-card border hover:bg-muted/50 text-foreground'
              }`}
            >
              <span className="truncate pr-2">{section.title}</span>
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden">
          {sortedSections.map((section: any) => {
            if (section.id !== activeSectionId) return null;
            
            const items = [...(section.items || [])].sort((a: any, b: any) => a.display_order - b.display_order);

            return (
              <div key={section.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="px-6 py-4 bg-muted/20 border-b flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                    {section.description && <p className="text-sm text-muted-foreground mt-1">{section.description}</p>}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {items.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                      Tidak ada item penilaian di bagian ini.
                    </div>
                  ) : (
                    items.map((item: any, index: number) => {
                      const scoreRow = scoresMap[item.id] || {};
                      
                      return (
                        <div key={item.id} className="bg-background border rounded-lg p-5 space-y-4 shadow-sm relative">
                          {scoreRow.id && <div className="absolute top-4 right-4 text-emerald-500" title="Sudah Diisi"><CheckCircle2 className="w-5 h-5" /></div>}
                          
                          <div>
                            <h3 className="font-bold text-base">{index + 1}. {item.name}</h3>
                            {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
                            {!item.parent_visible && <span className="inline-flex mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Internal Hanya Guru</span>}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* NUMERIC INPUT */}
                            {item.assessment_type === 'numeric' && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Nilai Angka (Maks: {item.max_score || 100})</label>
                                <input 
                                  type="number" 
                                  max={item.max_score || 100}
                                  min={0}
                                  value={scoreRow.score_numeric || ''}
                                  onChange={(e) => handleScoreChange(item.id, 'score_numeric', e.target.value)}
                                  onBlur={() => handleSaveItem(item.id)}
                                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-lg font-bold"
                                />
                              </div>
                            )}

                            {/* PREDICATE INPUT */}
                            {item.assessment_type === 'predicate' && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Predikat (A/B/C/D)</label>
                                <select
                                  value={scoreRow.score_predicate || ''}
                                  onChange={(e) => handleScoreChange(item.id, 'score_predicate', e.target.value)}
                                  onBlur={() => handleSaveItem(item.id)}
                                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 font-medium"
                                >
                                  <option value="">-- Pilih Predikat --</option>
                                  <option value="A">A (Sangat Baik)</option>
                                  <option value="B">B (Baik)</option>
                                  <option value="C">C (Cukup)</option>
                                  <option value="D">D (Kurang)</option>
                                </select>
                              </div>
                            )}

                            {/* RUBRIC INPUT */}
                            {item.assessment_type === 'rubric' && (
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Capaian Kompetensi / Rubrik</label>
                                <div className="flex flex-wrap gap-2">
                                  {['BSB (Berkembang Sangat Baik)', 'BSH (Berkembang Sesuai Harapan)', 'MB (Mulai Berkembang)', 'BB (Belum Berkembang)'].map(opt => {
                                    const val = opt.split(' ')[0];
                                    return (
                                      <button
                                        key={val}
                                        onClick={() => {
                                          handleScoreChange(item.id, 'score_predicate', val);
                                          // Small delay to let state update before saving
                                          setTimeout(() => handleSaveItem(item.id), 50);
                                        }}
                                        className={`px-4 py-2 text-sm border rounded-md font-medium transition-colors ${scoreRow.score_predicate === val ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-muted'}`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* CHECKLIST INPUT */}
                            {item.assessment_type === 'checklist' && (
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Ketercapaian</label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`check_${item.id}`} 
                                      checked={scoreRow.score_predicate === 'Ya'}
                                      onChange={() => {
                                        handleScoreChange(item.id, 'score_predicate', 'Ya');
                                        setTimeout(() => handleSaveItem(item.id), 50);
                                      }}
                                      className="w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium">Ya / Tuntas</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`check_${item.id}`} 
                                      checked={scoreRow.score_predicate === 'Tidak'}
                                      onChange={() => {
                                        handleScoreChange(item.id, 'score_predicate', 'Tidak');
                                        setTimeout(() => handleSaveItem(item.id), 50);
                                      }}
                                      className="w-4 h-4 text-destructive focus:ring-destructive"
                                    />
                                    <span className="text-sm font-medium text-destructive">Tidak / Belum Tuntas</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* NARRATIVE / DESCRIPTION INPUT */}
                            {(item.assessment_type === 'narrative' || item.assessment_type === 'numeric' || item.assessment_type === 'predicate') && (
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-muted-foreground" /> Catatan / Deskripsi (Opsional)
                                </label>
                                <textarea 
                                  rows={2}
                                  value={scoreRow.score_narrative || ''}
                                  onChange={(e) => handleScoreChange(item.id, 'score_narrative', e.target.value)}
                                  onBlur={() => handleSaveItem(item.id)}
                                  placeholder="Tulis catatan perkembangan spesifik untuk item ini..."
                                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-sm resize-y"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
