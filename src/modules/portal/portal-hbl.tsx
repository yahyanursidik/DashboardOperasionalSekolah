/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  MessageCircleHeart,
  Radio,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { getDocumentSignedUrl, uploadDocument } from "../../lib/supabase/storage";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import type { ParentPortalContext } from "./portal-context";
import { HblMediaPreview } from "../hbl/hbl-media-preview";
import { formatMeetingDate, HBL_ACTIVITY_TYPES, HBL_ATTENDANCE_STATUSES, HBL_LEVEL_LABELS, HBL_PLATFORMS, meetingTiming } from "../hbl/hbl-config";
import { PAUD_CP_ELEMENTS } from "../paud/paud-config";
import { patternForProgram } from "../hbl/hbl-patterns";

const db = supabaseClient as any;
const WELLBEING = [
  { value: "happy", label: "Senang" },
  { value: "okay", label: "Baik" },
  { value: "challenged", label: "Butuh dukungan" },
  { value: "need_help", label: "Mohon dihubungi" },
];
const TIMING_LABEL: Record<string, { label: string; tone: string }> = {
  today: { label: "Hari ini", tone: "bg-rose-100 text-rose-700" },
  upcoming: { label: "Akan datang", tone: "bg-sky-100 text-sky-700" },
  past: { label: "Selesai", tone: "bg-gray-100 text-gray-600" },
  flexible: { label: "Fleksibel", tone: "bg-violet-100 text-violet-700" },
};

export const PortalHbl: React.FC = () => {
  const { parent, student } = useOutletContext<ParentPortalContext>();
  const { activeSemesterId } = useAcademicYear();
  const [programs, setPrograms] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [themeId, setThemeId] = useState("");
  const [openMeetingId, setOpenMeetingId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [checkinForm, setCheckinForm] = useState({ wellbeing: "happy", favorite_activity: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  const studentId = student?.id as string | undefined;
  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const enrollment = await db.from("hbl_program_students")
      .select("program_id,hbl_programs!inner(id,name,description,status,preschool_level,journey_mode,semester_id,parent_welcome,classes(name),semesters(name,start_date,academic_years(name)))")
      .eq("student_id", studentId);
    if (enrollment.error) {
      toast.error("Program HBL belum dapat dimuat", { description: enrollment.error.message });
      setLoading(false);
      return;
    }
    const all = (enrollment.data || []).map((row: any) => row.hbl_programs).filter(Boolean);
    const current = all.filter((program: any) => program.semester_id === activeSemesterId);
    const programRows = current.length ? current : all.sort((a: any, b: any) => String(b.semesters?.start_date || "").localeCompare(String(a.semesters?.start_date || ""))).slice(0, 1);
    const programIds = programRows.map((program: any) => program.id);
    setPrograms(programRows);
    if (!programIds.length) { setThemes([]); setMeetings([]); setLoading(false); return; }

    const [themeResult, meetingResult] = await Promise.all([
      db.from("hbl_learning_weeks").select("*").in("program_id", programIds).order("week_number"),
      db.from("hbl_meetings").select("*, subjects(name)").in("program_id", programIds).order("meeting_date", { nullsFirst: false }).order("meeting_number"),
    ]);
    const meetingRows = meetingResult.data || [];
    const meetingIds = meetingRows.map((row: any) => row.id);
    const themeIds = (themeResult.data || []).map((row: any) => row.id);
    const dates = [...new Set(meetingRows.map((row: any) => row.meeting_date).filter(Boolean))];
    const [activityResult, submissionResult, projectResult, checkinResult, attendanceResult] = await Promise.all([
      meetingIds.length ? db.from("hbl_activities").select("*").in("meeting_id", meetingIds).order("sort_order") : Promise.resolve({ data: [] }),
      db.from("hbl_activity_submissions").select("*").eq("student_id", studentId),
      meetingIds.length ? db.from("hbl_home_project_submissions").select("*").eq("student_id", studentId).in("meeting_id", meetingIds) : Promise.resolve({ data: [] }),
      themeIds.length ? db.from("hbl_parent_checkins").select("*").eq("student_id", studentId).in("week_id", themeIds) : Promise.resolve({ data: [] }),
      dates.length ? db.from("attendance_records").select("attendance_date,status").eq("student_id", studentId).in("attendance_date", dates) : Promise.resolve({ data: [] }),
    ]);
    const error = themeResult.error || meetingResult.error || activityResult.error || submissionResult.error || projectResult.error || checkinResult.error;
    if (error) toast.error("Sebagian konten HBL belum dapat dimuat", { description: error.message });
    setThemes(themeResult.data || []);
    setMeetings(meetingRows);
    setActivities(activityResult.data || []);
    setSubmissions(submissionResult.data || []);
    setProjects(projectResult.data || []);
    setCheckins(checkinResult.data || []);
    setAttendance(Object.fromEntries((attendanceResult.data || []).map((row: any) => [row.attendance_date, row.status])));
    setLoading(false);
  }, [activeSemesterId, studentId]);
  useEffect(() => { void load(); }, [load]);

  const today = new Date().toLocaleDateString("en-CA");
  const nextMeeting = useMemo(
    () => meetings.find((row) => row.meeting_date === today) || meetings.find((row) => row.meeting_date && row.meeting_date > today) || null,
    [meetings, today],
  );
  // Default to the theme running today, else the theme of the next meeting, else the latest.
  useEffect(() => {
    if (!themes.length) return;
    setThemeId((current) => {
      if (current && themes.some((row) => row.id === current)) return current;
      return themes.find((row) => row.starts_on && row.ends_on && row.starts_on <= today && row.ends_on >= today)?.id
        || (nextMeeting?.week_id && themes.some((row) => row.id === nextMeeting.week_id) ? nextMeeting.week_id : "")
        || themes[themes.length - 1].id;
    });
    setOpenMeetingId((current) => current || nextMeeting?.id || "");
  }, [nextMeeting, themes, today]);

  const theme = themes.find((row) => row.id === themeId) || null;
  const themeMeetings = meetings.filter((row) => row.week_id === themeId);
  const checkin = checkins.find((row) => row.week_id === themeId);
  useEffect(() => {
    setCheckinForm(checkin ? { wellbeing: checkin.wellbeing, favorite_activity: checkin.favorite_activity || "", message: checkin.message || "" } : { wellbeing: "happy", favorite_activity: "", message: "" });
  }, [checkin?.id, themeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submissionFor = (activityId: string) => submissions.find((row) => row.activity_id === activityId);
  const projectFor = (meetingId: string) => projects.find((row) => row.meeting_id === meetingId);
  const attendedCount = meetings.filter((row) => row.meeting_date && attendance[row.meeting_date] === "hadir").length;
  const heldCount = meetings.filter((row) => row.meeting_date && row.meeting_date <= today).length;

  const saveActivity = async (activity: any, file?: File) => {
    const existing = submissionFor(activity.id);
    const note = (notes[activity.id] ?? existing?.parent_note ?? "").trim();
    if (activity.evidence_required && !file && !existing?.evidence_url && activity.evidence_type !== "checklist" && !note) {
      return toast.error("Kegiatan ini memerlukan bukti atau catatan singkat.");
    }
    setSaving(activity.id);
    try {
      const uploaded = file ? await uploadDocument(file, `hbl/${activity.meeting_id}/${student.id}/activities`) : null;
      const { error } = await db.from("hbl_activity_submissions").upsert({
        activity_id: activity.id, student_id: student.id, parent_id: parent.id, checklist_completed: true,
        evidence_url: uploaded?.filePath || existing?.evidence_url || null, evidence_file_name: uploaded?.fileName || existing?.evidence_file_name || null,
        parent_note: note || null, status: "submitted", feedback: null, submitted_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null,
      }, { onConflict: "activity_id,student_id" });
      if (error) throw error;
      toast.success(file ? "Bukti kegiatan terkirim." : "Kegiatan ditandai selesai.");
      await load();
    } catch (error: any) {
      toast.error("Kegiatan belum tersimpan", { description: error?.message });
    } finally {
      setSaving("");
    }
  };

  const submitProject = async (meeting: any, file?: File) => {
    if (!file) return;
    setSaving(`project-${meeting.id}`);
    try {
      const uploaded = await uploadDocument(file, `hbl/${meeting.program_id}/${student.id}/projects`);
      const { error } = await db.from("hbl_home_project_submissions").upsert({
        meeting_id: meeting.id, student_id: student.id, parent_id: parent.id, submission_url: uploaded.filePath, file_name: uploaded.fileName,
        status: "submitted", feedback: null, submitted_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null,
      }, { onConflict: "meeting_id,student_id" });
      if (error) throw error;
      toast.success("Home project terkirim.");
      await load();
    } catch (error: any) {
      toast.error("Home project belum terkirim", { description: error?.message });
    } finally {
      setSaving("");
    }
  };

  const saveCheckin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!theme) return;
    setSaving("checkin");
    const { error } = await db.from("hbl_parent_checkins").upsert({
      week_id: theme.id, student_id: student.id, parent_id: parent.id, wellbeing: checkinForm.wellbeing,
      favorite_activity: checkinForm.favorite_activity.trim() || null, message: checkinForm.message.trim() || null, submitted_at: new Date().toISOString(),
    }, { onConflict: "week_id,student_id" });
    setSaving("");
    if (error) return toast.error("Cerita belum terkirim", { description: error.message });
    toast.success("Terima kasih, cerita keluarga terkirim ke guru.");
    await load();
  };

  const openFile = async (path: string) => {
    try { window.open(await getDocumentSignedUrl(path), "_blank"); } catch { window.open(path, "_blank"); }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;

  const program = programs[0];
  const pattern = patternForProgram(program);
  if (!program) {
    return (
      <div className="rounded-xl border border-dashed bg-white p-10 text-center">
        <GraduationCap className="mx-auto h-10 w-10 text-gray-300" />
        <h2 className="mt-3 font-bold text-gray-700">Belum ada program Homebased Learning</h2>
        <p className="mt-1 text-sm text-gray-500">Program muncul setelah sekolah menerbitkan pertemuan untuk kelas {student?.classes?.name || "ananda"}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Homebased Learning · {HBL_LEVEL_LABELS[program.preschool_level] || program.classes?.name || pattern.audience}</p>
        <h1 className="mt-1 text-2xl font-bold">Ruang Belajar {student.full_name}</h1>
        <p className="mt-1 text-sm text-emerald-50">{program.name} · {program.semesters?.academic_years?.name} Semester {program.semesters?.name}</p>
        {(program.parent_welcome || program.description) && <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">{program.parent_welcome || program.description}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          {nextMeeting ? (
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-xs font-bold uppercase text-emerald-100">{nextMeeting.meeting_date === today ? "Pertemuan hari ini" : "Pertemuan berikutnya"}</p>
              <p className="mt-0.5 font-bold">{nextMeeting.title}</p>
              <p className="text-sm text-emerald-50">{formatMeetingDate(nextMeeting.meeting_date, nextMeeting.start_time, nextMeeting.end_time)}</p>
              {nextMeeting.live_url && (
                <a href={nextMeeting.live_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-bold text-emerald-800">
                  <Radio className="h-4 w-4" /> Masuk {HBL_PLATFORMS[nextMeeting.live_platform] || "live meet"}
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-white/10 p-3 text-sm text-emerald-50">Belum ada jadwal pertemuan berikutnya.</div>
          )}
          <div className="rounded-lg bg-white/10 p-3 text-center">
            <p className="text-2xl font-bold">{attendedCount}/{heldCount}</p>
            <p className="text-xs text-emerald-100">pertemuan dihadiri</p>
          </div>
        </div>
      </section>

      {!themes.length ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-500"><CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-300" />Guru sedang menyiapkan {pattern.group.singular.toLowerCase()} dan pertemuan pertama.</div>
      ) : (
        <>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {themes.map((row) => (
              <button key={row.id} type="button" onClick={() => setThemeId(row.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs ${themeId === row.id ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                <span className="block font-bold">{pattern.group.singular} {row.week_number}{row.theme ? ` · ${row.theme}` : ""}</span>
                <span>{row.title}</span>
              </button>
            ))}
          </nav>

          {theme && (
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{pattern.group.singular} {theme.week_number}{theme.theme ? ` · ${theme.theme}` : ""}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">{theme.title}</h2>
              {theme.starts_on && <p className="text-xs text-gray-500">{formatMeetingDate(theme.starts_on)}{theme.ends_on ? ` s.d. ${formatMeetingDate(theme.ends_on)}` : ""}</p>}
              {theme.description && <p className="mt-2 text-sm text-gray-600">{theme.description}</p>}
              {theme.parent_guide && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-bold text-emerald-900">Panduan orang tua selama {pattern.group.singular.toLowerCase()} ini</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-900/80">{theme.parent_guide}</p>
                </div>
              )}
            </section>
          )}

          <div className="space-y-3">
            {themeMeetings.map((meeting) => {
              const timing = meetingTiming(meeting, today);
              const open = openMeetingId === meeting.id;
              const status = meeting.meeting_date ? attendance[meeting.meeting_date] : undefined;
              const statusInfo = HBL_ATTENDANCE_STATUSES.find((item) => item.value === status);
              const meetingActivities = activities.filter((row) => row.meeting_id === meeting.id);
              const doneCount = meetingActivities.filter((row) => submissionFor(row.id)?.checklist_completed).length;
              const project = projectFor(meeting.id);
              const media = Array.isArray(meeting.media_links) ? meeting.media_links : [];
              return (
                <article key={meeting.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${timing === "today" ? "border-rose-300" : ""}`}>
                  <button type="button" onClick={() => setOpenMeetingId(open ? "" : meeting.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${TIMING_LABEL[timing].tone}`}>{TIMING_LABEL[timing].label}</span>
                        {statusInfo && <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusInfo.tone}`}>{statusInfo.label}</span>}
                        {meetingActivities.length > 0 && <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{doneCount}/{meetingActivities.length} kegiatan</span>}
                      </div>
                      <h3 className="mt-1.5 font-bold text-gray-900">{meeting.title}</h3>
                      <p className="text-xs text-gray-500">{formatMeetingDate(meeting.meeting_date, meeting.start_time, meeting.end_time)}</p>
                    </div>
                    <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="space-y-4 border-t p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {meeting.subjects?.name && <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">{meeting.subjects.name}</span>}
                        {pattern.usesCpElements && (meeting.cp_elements || []).map((id: string) => <span key={id} className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{PAUD_CP_ELEMENTS.find((element) => element.id === id)?.shortTitle}</span>)}
                        {meeting.live_url && timing !== "past" && (
                          <a href={meeting.live_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Radio className="h-3.5 w-3.5" /> Masuk {HBL_PLATFORMS[meeting.live_platform] || "live meet"}</a>
                        )}
                      </div>
                      {meeting.learning_objectives && <p className="text-sm"><strong>Tujuan hari ini:</strong> {meeting.learning_objectives}</p>}
                      {meeting.instructions_for_parent && (
                        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><strong>Persiapan orang tua:</strong><p className="mt-1 whitespace-pre-line">{meeting.instructions_for_parent}</p></div>
                      )}
                      {meeting.description && <p className="whitespace-pre-line text-sm text-gray-600">{meeting.description}</p>}
                      {media.length > 0 && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {media.map((item: any, index: number) => <div key={index}><HblMediaPreview type={item.type} url={item.url} title={item.title} /><p className="mt-1 text-xs font-semibold">{item.title}</p></div>)}
                        </div>
                      )}

                      {meetingActivities.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-bold">{pattern.usesCpElements ? "Kegiatan bersama ananda" : pattern.activity.plural}</p>
                          {meetingActivities.map((activity) => {
                            const submission = submissionFor(activity.id);
                            const done = Boolean(submission?.checklist_completed);
                            const needsUpload = ["photo", "video", "audio", "optional_upload"].includes(activity.evidence_type);
                            return (
                              <div key={activity.id} className={`rounded-lg border p-3 ${submission?.status === "needs_revision" ? "border-amber-300 bg-amber-50/50" : done ? "border-emerald-200 bg-emerald-50/40" : ""}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[11px] font-bold uppercase text-emerald-700">{HBL_ACTIVITY_TYPES[activity.activity_type]}{activity.estimated_minutes ? ` · ${activity.estimated_minutes} menit` : ""}</p>
                                    <p className="font-bold">{activity.title}</p>
                                  </div>
                                  {done && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                                </div>
                                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{activity.instructions}</p>
                                {activity.materials_needed && <p className="mt-1 text-xs text-gray-500"><strong>Bahan:</strong> {activity.materials_needed}</p>}
                                {activity.conversation_prompt && <p className="mt-1 text-xs text-gray-500"><strong>Ajak bercerita:</strong> {activity.conversation_prompt}</p>}
                                {submission?.feedback && <p className="mt-2 rounded bg-white p-2 text-xs"><strong>Tanggapan guru:</strong> {submission.feedback}</p>}
                                <textarea value={notes[activity.id] ?? submission?.parent_note ?? ""} onChange={(event) => setNotes({ ...notes, [activity.id]: event.target.value })} rows={2} placeholder="Cerita singkat: apa yang ananda lakukan atau ucapkan?" className="mt-2 w-full rounded-md border p-2 text-sm" />
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button type="button" disabled={saving === activity.id} onClick={() => void saveActivity(activity)} className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                                    {saving === activity.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {done ? "Perbarui" : "Tandai selesai"}
                                  </button>
                                  {needsUpload && (
                                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-xs font-bold">
                                      <UploadCloud className="h-3.5 w-3.5" /> {submission?.evidence_url ? "Ganti bukti" : "Unggah bukti"}
                                      <input type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf" onChange={(event) => { void saveActivity(activity, event.target.files?.[0]); event.target.value = ""; }} />
                                    </label>
                                  )}
                                  {submission?.evidence_url && <button type="button" onClick={() => void openFile(submission.evidence_url)} className="inline-flex items-center gap-1 px-2 text-xs font-bold text-emerald-700">Lihat bukti <ExternalLink className="h-3 w-3" /></button>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {meeting.worksheet_title && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <p className="flex items-center gap-2 font-bold text-blue-900"><FileText className="h-4 w-4" /> {meeting.worksheet_title}</p>
                          {meeting.worksheet_instructions && <p className="mt-1 text-sm text-blue-800">{meeting.worksheet_instructions}</p>}
                          {meeting.worksheet_url && <a href={meeting.worksheet_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Buka lembar kerja <ExternalLink className="h-3.5 w-3.5" /></a>}
                        </div>
                      )}

                      {meeting.project_title && (
                        <div className={`rounded-lg border p-3 ${project?.status === "reviewed" ? "border-emerald-200 bg-emerald-50" : project?.status === "needs_revision" ? "border-amber-300 bg-amber-50" : "border-violet-200 bg-violet-50"}`}>
                          <p className="font-bold">Home project: {meeting.project_title}</p>
                          {meeting.project_due_date && <p className="text-xs text-gray-600">Kirim sebelum {formatMeetingDate(meeting.project_due_date)}</p>}
                          {meeting.project_instructions && <p className="mt-1 text-sm text-gray-700">{meeting.project_instructions}</p>}
                          {project?.feedback && <p className="mt-2 rounded bg-white/80 p-2 text-sm"><strong>Tanggapan guru:</strong> {project.feedback}</p>}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-violet-700 px-3 py-2 text-xs font-bold text-white">
                              {saving === `project-${meeting.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} {project ? "Perbarui project" : "Unggah project"}
                              <input type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={(event) => { void submitProject(meeting, event.target.files?.[0]); event.target.value = ""; }} />
                            </label>
                            {project?.submission_url && <button type="button" onClick={() => void openFile(project.submission_url)} className="inline-flex items-center gap-1 rounded-md border bg-white px-3 py-2 text-xs font-bold">Lihat kiriman <ExternalLink className="h-3 w-3" /></button>}
                            {project?.status === "reviewed" && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Disetujui</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {theme && !themeMeetings.length && <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-500">Pertemuan untuk {pattern.group.singular.toLowerCase()} ini belum diterbitkan.</div>}
          </div>

          {theme && (
            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={saveCheckin} className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="flex items-center gap-2 font-bold"><MessageCircleHeart className="h-5 w-5 text-rose-600" /> Cerita keluarga · {theme.title}</p>
                <p className="text-xs text-gray-500">Sampaikan pengalaman ananda selama {pattern.group.singular.toLowerCase()} ini kepada guru.</p>
                <select value={checkinForm.wellbeing} onChange={(event) => setCheckinForm({ ...checkinForm, wellbeing: event.target.value })} className="mt-3 h-10 w-full rounded-md border px-3 text-sm">
                  {WELLBEING.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <input value={checkinForm.favorite_activity} onChange={(event) => setCheckinForm({ ...checkinForm, favorite_activity: event.target.value })} placeholder="Kegiatan favorit ananda" className="mt-2 h-10 w-full rounded-md border px-3 text-sm" />
                <textarea value={checkinForm.message} onChange={(event) => setCheckinForm({ ...checkinForm, message: event.target.value })} rows={2} placeholder="Pesan untuk guru (opsional)" className="mt-2 w-full rounded-md border p-2 text-sm" />
                <button disabled={saving === "checkin"} className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-4 text-xs font-bold text-white disabled:opacity-50">{saving === "checkin" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {checkin ? "Perbarui cerita" : "Kirim cerita"}</button>
              </form>
              <Link to={pattern.parentReportPath} className="flex flex-col justify-between rounded-xl border bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm hover:border-amber-300">
                <div>
                  <p className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-amber-600" /> Perkembangan ananda</p>
                  <p className="mt-1 text-sm text-gray-600">{pattern.developmentNotes ? "Catatan guru dari setiap pertemuan serta asesmen awal, tengah, dan akhir semester ada di halaman KB/TK." : "Nilai tugas dan rapor ananda ada di halaman akademik."}</p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-700">{pattern.parentReportLabel} <ArrowRight className="h-4 w-4" /></span>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};
