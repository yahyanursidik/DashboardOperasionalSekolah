/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useState } from "react";
import { ClipboardList, Edit3, ExternalLink, FileText, Loader2, MessageSquareText, Plus, Radio, Save, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PAUD_CP_ELEMENTS } from "../paud/paud-config";
import { HBL_ACTIVITY_TYPES, HBL_ATTENDANCE_STATUSES, HBL_EVIDENCE_TYPES, HBL_PLATFORMS } from "./hbl-config";
import type { HblPattern } from "./hbl-patterns";
import { HblMediaPreview } from "./hbl-media-preview";
import { isMeetingPublished } from "./use-hbl-program";
import { HblSubmissionCard } from "./hbl-family-tab";
import { useHblSubmissions } from "./use-hbl-submissions";

const db = supabaseClient as any;
export type MeetingDetailTab = "content" | "attendance" | "family";
const emptyActivity = { title: "", instructions: "", activity_type: "explore", estimated_minutes: "", materials_needed: "", conversation_prompt: "", evidence_type: "none", evidence_required: false };
const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const noteTitle = (meeting: any) => `Pertemuan HBL: ${meeting.title}`.slice(0, 180);

export const HblMeetingDetail: React.FC<{
  meeting: any; program: any; pattern: HblPattern; roster: any[]; initialTab?: MeetingDetailTab; onEdit: () => void; onChanged: () => void | Promise<void>;
}> = ({ meeting, program, pattern, roster, initialTab, onEdit, onChanged }) => {
  const [tab, setTab] = useState<MeetingDetailTab>(initialTab || "content");
  const [activities, setActivities] = useState<any[]>([]);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, { id?: string; text: string; elements: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const family = useHblSubmissions([meeting]);

  const load = useCallback(async () => {
    setLoading(true);
    const studentIds = roster.map((student) => student.id);
    const [activityResult, attendanceResult, noteResult] = await Promise.all([
      db.from("hbl_activities").select("*").eq("meeting_id", meeting.id).order("sort_order"),
      meeting.meeting_date && studentIds.length ? db.from("attendance_records").select("student_id,status").eq("attendance_date", meeting.meeting_date).in("student_id", studentIds) : Promise.resolve({ data: [] }),
      pattern.developmentNotes && meeting.meeting_date && studentIds.length
        ? db.from("paud_activities").select("id,student_id,description,cp_elements").eq("date", meeting.meeting_date).eq("title", noteTitle(meeting)).in("student_id", studentIds)
        : Promise.resolve({ data: [] }),
    ]);
    if (activityResult.error) toast.error("Kegiatan belum dapat dimuat", { description: activityResult.error.message });
    setActivities(activityResult.data || []);
    setAttendance(Object.fromEntries((attendanceResult.data || []).map((row: any) => [row.student_id, row.status])));
    setNotes(Object.fromEntries((noteResult.data || []).map((row: any) => [row.student_id, { id: row.id, text: row.description || "", elements: row.cp_elements || [] }])));
    setLoading(false);
  }, [meeting, pattern.developmentNotes, roster]);
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
    if (error) return toast.error(`${pattern.activity.singular} belum tersimpan`, { description: error.message });
    setActivityForm(emptyActivity);
    toast.success(`${pattern.activity.singular} ditambahkan.`);
    await load();
    await onChanged();
  };
  const deleteActivity = async (activity: any) => {
    if (!window.confirm(`Hapus "${activity.title}"?`)) return;
    const { error } = await db.from("hbl_activities").delete().eq("id", activity.id);
    if (error) return toast.error(error.message);
    await load();
    await onChanged();
  };

  const saveAttendance = async () => {
    if (!meeting.meeting_date) return toast.error("Isi tanggal pertemuan terlebih dahulu.");
    const entries = roster.filter((student) => attendance[student.id]).map((student) => ({ student_id: student.id, status: attendance[student.id] }));
    const noteRows = pattern.developmentNotes ? roster.filter((student) => notes[student.id]?.text?.trim()) : [];
    if (!entries.length && !noteRows.length) return toast.error("Isi kehadiran minimal satu anak.");
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
          const { error } = note.id
            ? await db.from("paud_activities").update({ description: note.text.trim(), cp_elements: note.elements }).eq("id", note.id)
            : await db.from("paud_activities").insert({
                student_id: student.id, class_id: student.class_id, employee_id: employeeId || null,
                academic_year_id: program.academic_year_id, semester_id: program.semester_id, date: meeting.meeting_date,
                title: noteTitle(meeting), description: note.text.trim(), observation_method: "anecdotal",
                learning_mode: "online", evidence_source: "live_meet", cp_elements: note.elements, development_aspects: [], islamic_values: [],
                status: "published", is_parent_visible: true,
              });
          if (error) throw error;
        }
      }
      toast.success(`Tersimpan: ${entries.length} kehadiran${noteRows.length ? `, ${noteRows.length} catatan perkembangan` : ""}.`);
      await load();
      await onChanged();
    } catch (error: any) {
      toast.error("Kehadiran belum tersimpan", { description: error?.message });
    } finally {
      setSaving(false);
    }
  };

  const media = Array.isArray(meeting.media_links) ? meeting.media_links : [];
  const recorded = roster.filter((student) => attendance[student.id]).length;
  const tabs: [MeetingDetailTab, string, React.ComponentType<{ className?: string }>][] = [
    ["content", `Isi & ${pattern.activity.plural.toLowerCase()} (${activities.length})`, ClipboardList],
    ["attendance", `Kehadiran${pattern.developmentNotes ? " & catatan" : ""} (${recorded}/${roster.length})`, UserCheck],
    ["family", `Laporan keluarga${family.pendingCount ? ` · ${family.pendingCount} baru` : ""}`, MessageSquareText],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${isMeetingPublished(meeting) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{isMeetingPublished(meeting) ? "Terbit" : "Draf"}</span>
        {meeting.subjects?.name && <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">{meeting.subjects.name}</span>}
        {pattern.usesCpElements && (meeting.cp_elements || []).map((id: string) => <span key={id} className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{PAUD_CP_ELEMENTS.find((element) => element.id === id)?.shortTitle}</span>)}
        {meeting.live_url && <a href={meeting.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white"><Radio className="h-3 w-3" /> {HBL_PLATFORMS[meeting.live_platform] || "Live meet"}</a>}
        <button type="button" onClick={onEdit} className="ml-auto inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold hover:bg-muted"><Edit3 className="h-3.5 w-3.5" /> Ubah pertemuan</button>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {tabs.map(([value, label, Icon]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold ${tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : tab === "content" ? (
        <div className="space-y-4">
          {(meeting.learning_objectives || meeting.description || meeting.instructions_for_parent) && (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              {meeting.learning_objectives && <p><strong>Tujuan:</strong> {meeting.learning_objectives}</p>}
              {meeting.description && <p className="whitespace-pre-line"><strong>Alur:</strong> {meeting.description}</p>}
              {meeting.instructions_for_parent && <p className="whitespace-pre-line"><strong>Persiapan orang tua:</strong> {meeting.instructions_for_parent}</p>}
            </div>
          )}
          {media.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {media.map((item: any, index: number) => <div key={index}><HblMediaPreview type={item.type} url={item.url} title={item.title} /><p className="mt-1 text-xs font-semibold">{item.title}</p></div>)}
            </div>
          )}
          {(meeting.worksheet_title || meeting.project_title) && (
            <div className="grid gap-2 md:grid-cols-2">
              {meeting.worksheet_title && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><p className="flex items-center gap-1.5 font-bold text-blue-900"><FileText className="h-4 w-4" /> {meeting.worksheet_title}</p>{meeting.worksheet_url && <a href={meeting.worksheet_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Buka <ExternalLink className="h-3 w-3" /></a>}</div>}
              {meeting.project_title && <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm"><p className="font-bold text-violet-900">Home project: {meeting.project_title}</p>{meeting.project_instructions && <p className="mt-1 text-xs text-violet-900/80">{meeting.project_instructions}</p>}</div>}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-bold">{pattern.activity.plural}</p>
              {activities.map((activity, index) => (
                <article key={activity.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-primary">{index + 1} · {HBL_ACTIVITY_TYPES[activity.activity_type]}{activity.estimated_minutes ? ` · ${activity.estimated_minutes} menit` : ""}</p>
                      <h4 className="font-bold">{activity.title}</h4>
                    </div>
                    <button type="button" onClick={() => void deleteActivity(activity)} title="Hapus" className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{activity.instructions}</p>
                  {activity.materials_needed && <p className="mt-1 text-xs"><strong>Bahan:</strong> {activity.materials_needed}</p>}
                  {activity.evidence_type !== "none" && <p className="mt-1 text-xs text-amber-700">Bukti: {HBL_EVIDENCE_TYPES[activity.evidence_type]}{activity.evidence_required ? " (wajib)" : " (opsional)"}</p>}
                </article>
              ))}
              {!activities.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada {pattern.activity.singular.toLowerCase()}.</p>}
            </div>
            <form onSubmit={addActivity} className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-bold">Tambah {pattern.activity.singular.toLowerCase()}</p>
              <input required minLength={3} value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} placeholder={pattern.activity.placeholder} className={inputClass} />
              <textarea required minLength={3} value={activityForm.instructions} onChange={(event) => setActivityForm({ ...activityForm, instructions: event.target.value })} rows={3} placeholder="Langkah yang dilakukan anak bersama pendamping" className="w-full rounded-md border bg-background p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={activityForm.activity_type} onChange={(event) => setActivityForm({ ...activityForm, activity_type: event.target.value })} className={inputClass}>{Object.entries(HBL_ACTIVITY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <input type="number" min={1} max={240} value={activityForm.estimated_minutes} onChange={(event) => setActivityForm({ ...activityForm, estimated_minutes: event.target.value })} placeholder="Menit" className={inputClass} />
              </div>
              <input value={activityForm.materials_needed} onChange={(event) => setActivityForm({ ...activityForm, materials_needed: event.target.value })} placeholder="Alat & bahan (opsional)" className={inputClass} />
              <input value={activityForm.conversation_prompt} onChange={(event) => setActivityForm({ ...activityForm, conversation_prompt: event.target.value })} placeholder="Pertanyaan pemantik (opsional)" className={inputClass} />
              <div className="grid grid-cols-2 gap-2">
                <select value={activityForm.evidence_type} onChange={(event) => setActivityForm({ ...activityForm, evidence_type: event.target.value })} className={inputClass}>{Object.entries(HBL_EVIDENCE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={activityForm.evidence_required} onChange={(event) => setActivityForm({ ...activityForm, evidence_required: event.target.checked })} /> Bukti wajib</label>
              </div>
              <button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Tambah</button>
            </form>
          </div>
        </div>
      ) : tab === "attendance" ? (
        <div className="space-y-3">
          {!meeting.meeting_date && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Isi tanggal pertemuan untuk mencatat kehadiran.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Kehadiran masuk ke presensi harian anak.{pattern.developmentNotes ? " Catatan perkembangan masuk ke Jurnal Observasi PAUD sebagai bukti asesmen." : ""}</p>
            <button type="button" onClick={() => setAttendance(Object.fromEntries(roster.map((student) => [student.id, attendance[student.id] || "hadir"])))} className="rounded-md border px-2.5 py-1.5 text-xs font-bold">Tandai sisanya hadir</button>
          </div>
          <div className="divide-y rounded-lg border">
            {roster.map((student) => {
              const note = notes[student.id] || { text: "", elements: [] };
              return (
                <div key={student.id} className={`grid gap-2 p-3 ${pattern.developmentNotes ? "lg:grid-cols-[170px_auto_1fr]" : "sm:grid-cols-[1fr_auto]"}`}>
                  <p className="font-semibold">{student.full_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {HBL_ATTENDANCE_STATUSES.map((status) => (
                      <button key={status.value} type="button" onClick={() => setAttendance({ ...attendance, [student.id]: status.value })} className={`rounded px-2 py-1 text-xs font-semibold ${attendance[student.id] === status.value ? status.tone : "border hover:bg-muted"}`}>{status.label}</button>
                    ))}
                  </div>
                  {pattern.developmentNotes && (
                    <div className="space-y-1">
                      <textarea value={note.text} onChange={(event) => setNotes({ ...notes, [student.id]: { ...note, text: event.target.value } })} rows={1} placeholder="Catatan perkembangan (opsional)" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
                      {note.text.trim() && (
                        <div className="flex flex-wrap gap-1">
                          {PAUD_CP_ELEMENTS.map((element) => {
                            const active = note.elements.includes(element.id);
                            return <button key={element.id} type="button" onClick={() => setNotes({ ...notes, [student.id]: { ...note, elements: active ? note.elements.filter((id) => id !== element.id) : [...note.elements, element.id] } })} className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${active ? "border-primary bg-primary/10 text-primary" : ""}`}>{element.shortTitle}</button>;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!roster.length && <p className="p-6 text-center text-sm text-muted-foreground">Program belum memiliki peserta.</p>}
          </div>
          <button type="button" disabled={saving || !meeting.meeting_date} onClick={() => void saveAttendance()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {family.items.map((item) => <HblSubmissionCard key={item.key} item={item} onReviewed={async () => { await family.reload(); await onChanged(); }} />)}
          {!family.loading && !family.items.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada laporan dari keluarga untuk pertemuan ini.</p>}
        </div>
      )}
    </div>
  );
};
