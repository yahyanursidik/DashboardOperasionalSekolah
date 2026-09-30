/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, ExternalLink, Loader2, MessageSquareText, Plus, Save, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { getDocumentSignedUrl } from "../../lib/supabase/storage";
import { PAUD_CP_ELEMENTS } from "../paud/paud-config";
import { formatMeetingDate, HBL_ACTIVITY_TYPES, HBL_ATTENDANCE_STATUSES, HBL_EVIDENCE_TYPES } from "./hbl-config";
import { HblMediaPreview } from "./hbl-media-preview";

const db = supabaseClient as any;
type Tab = "activities" | "attendance" | "family";
const emptyActivity = { title: "", instructions: "", activity_type: "explore", estimated_minutes: "", materials_needed: "", conversation_prompt: "", evidence_type: "none", evidence_required: false };
const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const noteTitle = (meeting: any) => `Pertemuan HBL: ${meeting.title}`.slice(0, 180);

export const HblMeetingDetail: React.FC<{ meeting: any; program: any; roster: any[] }> = ({ meeting, program, roster }) => {
  const [tab, setTab] = useState<Tab>("activities");
  const [activities, setActivities] = useState<any[]>([]);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, { id?: string; text: string; elements: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const studentIds = roster.map((student) => student.id);
    const { data: activityRows, error } = await db.from("hbl_activities").select("*").eq("meeting_id", meeting.id).order("sort_order");
    if (error) toast.error("Kegiatan belum dapat dimuat", { description: error.message });
    const activityIds = (activityRows || []).map((row: any) => row.id);
    const [submissionResult, projectResult, attendanceResult, noteResult] = await Promise.all([
      activityIds.length ? db.from("hbl_activity_submissions").select("*, students(full_name), parents(full_name)").in("activity_id", activityIds).order("submitted_at", { ascending: false }) : Promise.resolve({ data: [] }),
      db.from("hbl_home_project_submissions").select("*, students(full_name), parents(full_name)").eq("meeting_id", meeting.id).order("submitted_at", { ascending: false }),
      meeting.meeting_date && studentIds.length ? db.from("attendance_records").select("student_id,status").eq("attendance_date", meeting.meeting_date).in("student_id", studentIds) : Promise.resolve({ data: [] }),
      meeting.meeting_date && studentIds.length ? db.from("paud_activities").select("id,student_id,description,cp_elements").eq("date", meeting.meeting_date).eq("title", noteTitle(meeting)).in("student_id", studentIds) : Promise.resolve({ data: [] }),
    ]);
    setActivities(activityRows || []);
    setSubmissions(submissionResult.data || []);
    setProjects(projectResult.data || []);
    setAttendance(Object.fromEntries((attendanceResult.data || []).map((row: any) => [row.student_id, row.status])));
    setNotes(Object.fromEntries((noteResult.data || []).map((row: any) => [row.student_id, { id: row.id, text: row.description || "", elements: row.cp_elements || [] }])));
    setLoading(false);
  }, [meeting, roster]);
  useEffect(() => { void load(); }, [load]);

  const addActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (activityForm.evidence_required && activityForm.evidence_type === "none") return toast.error("Pilih bentuk bukti bila bukti diwajibkan.");
    setSaving(true);
    const { error } = await db.from("hbl_activities").insert({
      meeting_id: meeting.id, title: activityForm.title.trim(), instructions: activityForm.instructions.trim(), activity_type: activityForm.activity_type,
      estimated_minutes: activityForm.estimated_minutes ? Number(activityForm.estimated_minutes) : null,
      materials_needed: activityForm.materials_needed.trim() || null, conversation_prompt: activityForm.conversation_prompt.trim() || null,
      evidence_type: activityForm.evidence_type, evidence_required: activityForm.evidence_required,
      status: "published", release_at: new Date().toISOString(), sort_order: activities.length,
    });
    setSaving(false);
    if (error) return toast.error("Kegiatan belum tersimpan", { description: error.message });
    setActivityForm(emptyActivity);
    toast.success("Kegiatan ditambahkan.");
    await load();
  };
  const deleteActivity = async (activity: any) => {
    if (!window.confirm(`Hapus kegiatan "${activity.title}"?`)) return;
    const { error } = await db.from("hbl_activities").delete().eq("id", activity.id);
    if (error) return toast.error(error.message);
    await load();
  };

  const saveAttendance = async () => {
    if (!meeting.meeting_date) return toast.error("Isi tanggal pertemuan terlebih dahulu.");
    const entries = roster.filter((student) => attendance[student.id]).map((student) => ({ student_id: student.id, status: attendance[student.id] }));
    const noteRows = roster.filter((student) => notes[student.id]?.text?.trim());
    if (!entries.length && !noteRows.length) return toast.error("Isi kehadiran atau catatan minimal satu anak.");
    setSaving(true);
    try {
      if (entries.length) {
        const { error } = await db.rpc("hbl_record_meeting_attendance", { p_meeting_id: meeting.id, p_entries: entries });
        if (error) throw error;
      }
      if (noteRows.length) {
        const { data: employeeId } = await db.rpc("current_employee_id");
        for (const student of noteRows) {
          const note = notes[student.id];
          const payload = {
            student_id: student.id, class_id: student.class_id, employee_id: employeeId || null,
            academic_year_id: program.academic_year_id, semester_id: program.semester_id, date: meeting.meeting_date,
            title: noteTitle(meeting), description: note.text.trim(), observation_method: "anecdotal",
            learning_mode: "online", evidence_source: "live_meet", cp_elements: note.elements, development_aspects: [], islamic_values: [],
            status: "published", is_parent_visible: true,
          };
          const { error } = note.id
            ? await db.from("paud_activities").update({ description: payload.description, cp_elements: payload.cp_elements }).eq("id", note.id)
            : await db.from("paud_activities").insert(payload);
          if (error) throw error;
        }
      }
      toast.success(`Tersimpan: ${entries.length} kehadiran, ${noteRows.length} catatan perkembangan.`);
      await load();
    } catch (error: any) {
      toast.error("Kehadiran/catatan belum tersimpan", { description: error?.message });
    } finally {
      setSaving(false);
    }
  };

  const reviewSubmission = async (table: "hbl_activity_submissions" | "hbl_home_project_submissions", row: any, status: "reviewed" | "needs_revision") => {
    const note = (feedback[row.id] ?? row.feedback ?? "").trim();
    if (status === "needs_revision" && !note) return toast.error("Tuliskan arahan untuk keluarga.");
    const { data } = await supabaseClient.auth.getUser();
    const { error } = await db.from(table).update({ status, feedback: note || null, reviewed_by: data.user?.id || null, reviewed_at: new Date().toISOString() }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(status === "reviewed" ? "Disetujui." : "Arahan revisi dikirim.");
    await load();
  };
  const openFile = async (path: string) => {
    try { window.open(await getDocumentSignedUrl(path), "_blank"); } catch { window.open(path, "_blank"); }
  };

  const media = Array.isArray(meeting.media_links) ? meeting.media_links : [];
  const presentCount = roster.filter((student) => attendance[student.id] === "hadir").length;
  const pendingFamily = [...submissions, ...projects].filter((row) => row.status === "submitted").length;

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <p className="text-xs font-bold uppercase text-primary">{formatMeetingDate(meeting.meeting_date, meeting.start_time, meeting.end_time)}</p>
        <h3 className="mt-1 text-lg font-bold">{meeting.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(meeting.cp_elements || []).map((id: string) => <span key={id} className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{PAUD_CP_ELEMENTS.find((element) => element.id === id)?.shortTitle}</span>)}
          {meeting.live_url && <a href={meeting.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Live meet <ExternalLink className="h-3 w-3" /></a>}
        </div>
        {meeting.learning_objectives && <p className="mt-3 text-sm"><span className="font-semibold">Tujuan:</span> {meeting.learning_objectives}</p>}
        {meeting.description && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{meeting.description}</p>}
        {media.length > 0 && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {media.map((item: any, index: number) => <div key={index}><HblMediaPreview type={item.type} url={item.url} title={item.title} /><p className="mt-1 text-xs font-semibold">{item.title}</p></div>)}
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b px-3 pt-3 text-sm">
        {([["activities", `Kegiatan anak (${activities.length})`, ClipboardList], ["attendance", `Kehadiran & catatan (${presentCount}/${roster.length})`, UserCheck], ["family", `Laporan keluarga${pendingFamily ? ` · ${pendingFamily} baru` : ""}`, MessageSquareText]] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`-mb-px inline-flex items-center gap-1.5 rounded-t-md border-x border-t px-3 py-2 font-semibold ${tab === value ? "bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : tab === "activities" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {activities.map((activity, index) => (
                <article key={activity.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-primary">Kegiatan {index + 1} · {HBL_ACTIVITY_TYPES[activity.activity_type]}{activity.estimated_minutes ? ` · ${activity.estimated_minutes} menit` : ""}</p>
                      <h4 className="font-bold">{activity.title}</h4>
                    </div>
                    <button type="button" onClick={() => void deleteActivity(activity)} title="Hapus kegiatan" className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{activity.instructions}</p>
                  {activity.materials_needed && <p className="mt-1 text-xs"><strong>Bahan:</strong> {activity.materials_needed}</p>}
                  {activity.evidence_type !== "none" && <p className="mt-1 text-xs text-amber-700">Bukti: {HBL_EVIDENCE_TYPES[activity.evidence_type]}{activity.evidence_required ? " (wajib)" : " (opsional)"}</p>}
                </article>
              ))}
              {!activities.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada kegiatan. Tambahkan kegiatan main yang dilakukan anak bersama orang tua.</p>}
            </div>
            <form onSubmit={addActivity} className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-bold">Tambah kegiatan</p>
              <input required minLength={3} value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} placeholder="Contoh: Menempel gambar anggota keluarga" className={inputClass} />
              <textarea required minLength={3} value={activityForm.instructions} onChange={(event) => setActivityForm({ ...activityForm, instructions: event.target.value })} rows={3} placeholder="Langkah sederhana untuk anak dan pendamping" className="w-full rounded-md border bg-background p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={activityForm.activity_type} onChange={(event) => setActivityForm({ ...activityForm, activity_type: event.target.value })} className={inputClass}>{Object.entries(HBL_ACTIVITY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <input type="number" min={1} max={240} value={activityForm.estimated_minutes} onChange={(event) => setActivityForm({ ...activityForm, estimated_minutes: event.target.value })} placeholder="Menit" className={inputClass} />
              </div>
              <input value={activityForm.materials_needed} onChange={(event) => setActivityForm({ ...activityForm, materials_needed: event.target.value })} placeholder="Alat & bahan (opsional)" className={inputClass} />
              <input value={activityForm.conversation_prompt} onChange={(event) => setActivityForm({ ...activityForm, conversation_prompt: event.target.value })} placeholder="Pertanyaan pemantik untuk anak (opsional)" className={inputClass} />
              <div className="grid grid-cols-2 gap-2">
                <select value={activityForm.evidence_type} onChange={(event) => setActivityForm({ ...activityForm, evidence_type: event.target.value })} className={inputClass}>{Object.entries(HBL_EVIDENCE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={activityForm.evidence_required} onChange={(event) => setActivityForm({ ...activityForm, evidence_required: event.target.checked })} /> Bukti wajib</label>
              </div>
              <button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Tambah Kegiatan</button>
            </form>
          </div>
        ) : tab === "attendance" ? (
          <div className="space-y-3">
            {!meeting.meeting_date && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Isi tanggal pertemuan untuk mencatat kehadiran.</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Kehadiran tersimpan ke presensi harian anak. Catatan perkembangan masuk ke Jurnal Observasi PAUD dan menjadi bukti asesmen.</p>
              <button type="button" onClick={() => setAttendance(Object.fromEntries(roster.map((student) => [student.id, attendance[student.id] || "hadir"])))} className="rounded-md border px-2.5 py-1.5 text-xs font-bold">Tandai semua hadir</button>
            </div>
            <div className="divide-y rounded-lg border">
              {roster.map((student) => {
                const note = notes[student.id] || { text: "", elements: [] };
                return (
                  <div key={student.id} className="grid gap-2 p-3 lg:grid-cols-[200px_auto_1fr]">
                    <p className="font-semibold">{student.full_name}</p>
                    <div className="flex flex-wrap gap-1">
                      {HBL_ATTENDANCE_STATUSES.map((status) => (
                        <button key={status.value} type="button" onClick={() => setAttendance({ ...attendance, [student.id]: status.value })} className={`rounded px-2 py-1 text-xs font-semibold ${attendance[student.id] === status.value ? status.tone : "border hover:bg-muted"}`}>{status.label}</button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <textarea value={note.text} onChange={(event) => setNotes({ ...notes, [student.id]: { ...note, text: event.target.value } })} rows={1} placeholder="Catatan perkembangan (opsional): apa yang ananda lakukan/ucapkan" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
                      {note.text.trim() && (
                        <div className="flex flex-wrap gap-1">
                          {PAUD_CP_ELEMENTS.map((element) => {
                            const active = note.elements.includes(element.id);
                            return <button key={element.id} type="button" onClick={() => setNotes({ ...notes, [student.id]: { ...note, elements: active ? note.elements.filter((id) => id !== element.id) : [...note.elements, element.id] } })} className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${active ? "border-primary bg-primary/10 text-primary" : ""}`}>{element.shortTitle}</button>;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!roster.length && <p className="p-6 text-center text-sm text-muted-foreground">Program belum memiliki peserta.</p>}
            </div>
            <button type="button" disabled={saving || !meeting.meeting_date} onClick={() => void saveAttendance()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan kehadiran & catatan
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {[...submissions.map((row) => ({ ...row, _table: "hbl_activity_submissions", _label: activities.find((activity) => activity.id === row.activity_id)?.title || "Kegiatan", _file: row.evidence_url, _note: row.parent_note })),
              ...projects.map((row) => ({ ...row, _table: "hbl_home_project_submissions", _label: `Home project: ${meeting.project_title || "project"}`, _file: row.submission_url, _note: row.notes }))]
              .map((row: any) => (
                <div key={`${row._table}-${row.id}`} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_1.2fr]">
                  <div>
                    <p className="font-bold">{row.students?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row._label} · {row.parents?.full_name || "Orang tua"} · {new Date(row.submitted_at).toLocaleDateString("id-ID")}</p>
                    {row.checklist_completed && <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Ditandai selesai</p>}
                    {row._note && <p className="mt-1 rounded bg-muted/40 p-2 text-xs">{row._note}</p>}
                    {row._file && <button type="button" onClick={() => void openFile(row._file)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">Buka bukti <ExternalLink className="h-3.5 w-3.5" /></button>}
                    <p className={`mt-1 text-xs font-bold ${row.status === "reviewed" ? "text-emerald-700" : row.status === "needs_revision" ? "text-amber-700" : "text-sky-700"}`}>{row.status === "reviewed" ? "Disetujui" : row.status === "needs_revision" ? "Perlu perbaikan" : "Menunggu tanggapan guru"}</p>
                  </div>
                  <div>
                    <textarea value={feedback[row.id] ?? row.feedback ?? ""} onChange={(event) => setFeedback({ ...feedback, [row.id]: event.target.value })} rows={2} placeholder="Tanggapan guru untuk keluarga" className="w-full rounded-md border p-2 text-xs" />
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => void reviewSubmission(row._table, row, "reviewed")} className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">Setujui</button>
                      <button type="button" onClick={() => void reviewSubmission(row._table, row, "needs_revision")} className="rounded border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800">Minta perbaikan</button>
                    </div>
                  </div>
                </div>
              ))}
            {!submissions.length && !projects.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada laporan dari keluarga untuk pertemuan ini.</p>}
          </div>
        )}
      </div>
    </section>
  );
};
