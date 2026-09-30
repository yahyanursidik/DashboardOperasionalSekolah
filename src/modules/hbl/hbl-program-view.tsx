/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Circle, ClipboardCheck, Radio, Settings, Sparkles, UserCheck } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { formatMeetingDate, HBL_LEVEL_LABELS, HBL_PLATFORMS, HBL_STATUS_LABELS } from "./hbl-config";
import { patternForProgram, type HblPattern } from "./hbl-patterns";
import { isMeetingPublished, jakartaToday, useHblProgram } from "./use-hbl-program";
import { HblDrawer } from "./components/HblDrawer";
import { HblPlanTab } from "./hbl-plan-tab";
import { HblGroupForm, HblMeetingForm } from "./hbl-plan-forms";
import { HblMeetingDetail, type MeetingDetailTab } from "./hbl-meeting-detail";
import { HblAttendanceTab } from "./hbl-attendance-tab";
import { HblFamilyTab } from "./hbl-family-tab";
import { HblSettingsTab } from "./hbl-settings-tab";

const db = supabaseClient as any;
type Tab = "summary" | "plan" | "attendance" | "family" | "settings";

export type HblPlanActions = {
  editGroup: (group: any | null) => void;
  editMeeting: (meeting: any | null, groupId?: string) => void;
  openMeeting: (meetingId: string, tab?: MeetingDetailTab) => void;
};

export const HblProgramView: React.FC<{
  program: any;
  classes: any[];
  canManagePrograms: boolean;
  onBack: () => void;
  onProgramChanged: () => void | Promise<void>;
}> = ({ program, classes, canManagePrograms, onBack, onProgramChanged }) => {
  const pattern = patternForProgram(program);
  const data = useHblProgram(program.id);
  const [tab, setTab] = useState<Tab>("summary");
  const [groupEdit, setGroupEdit] = useState<any | null | undefined>(undefined);
  const [meetingEdit, setMeetingEdit] = useState<{ meeting: any | null; groupId?: string } | null>(null);
  const [detail, setDetail] = useState<{ meetingId: string; tab?: MeetingDetailTab } | null>(null);
  const [attendanceDates, setAttendanceDates] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(0);

  const today = jakartaToday();
  const heldMeetings = useMemo(() => data.meetings.filter((meeting) => isMeetingPublished(meeting) && meeting.meeting_date && meeting.meeting_date <= today), [data.meetings, today]);

  const loadSignals = useCallback(async () => {
    const studentIds = data.roster.map((student) => student.id);
    const dates = [...new Set(heldMeetings.map((meeting) => meeting.meeting_date))];
    const [attendanceResult, overviewResult] = await Promise.all([
      studentIds.length && dates.length ? db.from("attendance_records").select("attendance_date").in("student_id", studentIds).in("attendance_date", dates) : Promise.resolve({ data: [] }),
      db.rpc("hbl_program_overview", { p_semester_id: program.semester_id }),
    ]);
    setAttendanceDates(new Set((attendanceResult.data || []).map((row: any) => row.attendance_date)));
    setPending((overviewResult.data || []).find((row: any) => row.program_id === program.id)?.pending_reports || 0);
  }, [data.roster, heldMeetings, program.id, program.semester_id]);
  useEffect(() => { void loadSignals(); }, [loadSignals]);

  const refresh = async () => { await data.reload(); await loadSignals(); };
  const actions: HblPlanActions = {
    editGroup: (group) => setGroupEdit(group),
    editMeeting: (meeting, groupId) => setMeetingEdit({ meeting, groupId }),
    openMeeting: (meetingId, detailTab) => setDetail({ meetingId, tab: detailTab }),
  };
  const detailMeeting = data.meetings.find((meeting) => meeting.id === detail?.meetingId) || null;
  const level = program.preschool_level ? HBL_LEVEL_LABELS[program.preschool_level] : null;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "summary", label: "Ringkasan" },
    { id: "plan", label: "Rencana Belajar" },
    { id: "attendance", label: "Kehadiran" },
    { id: "family", label: "Laporan Keluarga", badge: pending },
    { id: "settings", label: "Pengaturan" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Semua program</button>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{program.classes?.name || program.name}</h2>
            <p className="text-sm text-muted-foreground">{program.name} · {program.units?.name} · {program.semesters?.academic_years?.name} Semester {program.semesters?.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${pattern.tone}`}>Pola {pattern.label}</span>
              {level && <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold">{level}</span>}
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${program.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{program.status === "published" ? "Terlihat orang tua" : HBL_STATUS_LABELS[program.status]}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold">{data.roster.length} anak</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMeetingEdit({ meeting: null })} disabled={!data.groups.length} title={!data.groups.length ? `Buat ${pattern.group.singular.toLowerCase()} terlebih dahulu` : undefined} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">
              <CalendarDays className="h-4 w-4" /> {pattern.meeting.singular} baru
            </button>
          </div>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto border-b">
          {tabs.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold ${tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {item.label}
              {!!item.badge && <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">{item.badge}</span>}
            </button>
          ))}
        </nav>
      </section>

      {tab === "summary" && (
        <SummaryTab
          program={program}
          pattern={pattern}
          data={data}
          heldMeetings={heldMeetings}
          attendanceDates={attendanceDates}
          pending={pending}
          actions={actions}
          goTo={setTab}
        />
      )}
      {tab === "plan" && <HblPlanTab pattern={pattern} data={data} actions={actions} />}
      {tab === "attendance" && <HblAttendanceTab data={data} heldMeetings={heldMeetings} actions={actions} />}
      {tab === "family" && <HblFamilyTab pattern={pattern} data={data} onChanged={refresh} />}
      {tab === "settings" && <HblSettingsTab program={program} pattern={pattern} classes={classes} roster={data.roster} canManagePrograms={canManagePrograms} onChanged={async () => { await onProgramChanged(); await data.reload(); }} />}

      <HblDrawer open={groupEdit !== undefined} onClose={() => setGroupEdit(undefined)} title={groupEdit ? `Ubah ${pattern.group.singular.toLowerCase()}` : `${pattern.group.singular} baru`} subtitle={pattern.group.example}>
        {groupEdit !== undefined && <HblGroupForm program={program} pattern={pattern} group={groupEdit} groups={data.groups} onSaved={async () => { setGroupEdit(undefined); await refresh(); }} />}
      </HblDrawer>
      <HblDrawer open={Boolean(meetingEdit)} onClose={() => setMeetingEdit(null)} wide title={meetingEdit?.meeting ? `Ubah ${pattern.meeting.singular.toLowerCase()}` : `${pattern.meeting.singular} baru`} subtitle={meetingEdit?.meeting?.title}>
        {meetingEdit && (
          <HblMeetingForm
            program={program}
            pattern={pattern}
            meeting={meetingEdit.meeting}
            defaultGroupId={meetingEdit.groupId}
            groups={data.groups}
            meetings={data.meetings}
            onSaved={async (id) => { setMeetingEdit(null); await refresh(); setDetail({ meetingId: id }); }}
          />
        )}
      </HblDrawer>
      <HblDrawer open={Boolean(detailMeeting)} onClose={() => setDetail(null)} wide title={detailMeeting?.title || ""} subtitle={detailMeeting ? formatMeetingDate(detailMeeting.meeting_date, detailMeeting.start_time, detailMeeting.end_time) : undefined}>
        {detailMeeting && (
          <HblMeetingDetail
            key={detailMeeting.id}
            meeting={detailMeeting}
            program={program}
            pattern={pattern}
            roster={data.roster}
            initialTab={detail?.tab}
            onEdit={() => { setDetail(null); setMeetingEdit({ meeting: detailMeeting }); }}
            onChanged={refresh}
          />
        )}
      </HblDrawer>
    </div>
  );
};

function SummaryTab({ program, pattern, data, heldMeetings, attendanceDates, pending, actions, goTo }: {
  program: any; pattern: HblPattern; data: ReturnType<typeof useHblProgram>; heldMeetings: any[]; attendanceDates: Set<string>; pending: number; actions: HblPlanActions; goTo: (tab: Tab) => void;
}) {
  const today = jakartaToday();
  const next = data.meetings.find((meeting) => meeting.meeting_date === today) || data.meetings.find((meeting) => meeting.meeting_date && meeting.meeting_date > today);
  const missingAttendance = heldMeetings.filter((meeting) => !attendanceDates.has(meeting.meeting_date));
  const soonDrafts = data.meetings.filter((meeting) => !isMeetingPublished(meeting) && meeting.meeting_date && meeting.meeting_date >= today
    && (new Date(`${meeting.meeting_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000 <= 7);
  const draftGroups = data.groups.filter((group) => group.status !== "published" && data.meetings.some((meeting) => meeting.week_id === group.id && isMeetingPublished(meeting)));

  const steps = [
    { label: pattern.steps[0], done: Boolean(program.class_id && data.roster.length), hint: `${data.roster.length} anak terdaftar dari kelas`, action: () => goTo("settings") },
    { label: pattern.steps[1], done: data.groups.length > 0, hint: `${data.groups.length} ${pattern.group.singular.toLowerCase()}`, action: () => actions.editGroup(null) },
    { label: pattern.steps[2], done: data.meetings.length > 0, hint: `${data.meetings.filter(isMeetingPublished).length}/${data.meetings.length} pertemuan terbit`, action: () => goTo("plan") },
    { label: pattern.steps[3], done: program.status === "published", hint: program.status === "published" ? "Program terlihat di portal orang tua" : "Program masih draf", action: () => goTo("settings") },
    { label: pattern.steps[4], done: heldMeetings.length > 0 && missingAttendance.length === 0, hint: `${heldMeetings.length - missingAttendance.length}/${heldMeetings.length} pertemuan tercatat`, action: () => goTo("attendance") },
  ];
  const attention = [
    ...missingAttendance.slice(0, 5).map((meeting) => ({ key: `att-${meeting.id}`, text: `Kehadiran belum dicatat: ${meeting.title} (${formatMeetingDate(meeting.meeting_date)})`, action: () => actions.openMeeting(meeting.id, "attendance") })),
    ...soonDrafts.map((meeting) => ({ key: `draft-${meeting.id}`, text: `Masih draf padahal segera berlangsung: ${meeting.title}`, action: () => actions.editMeeting(meeting) })),
    ...draftGroups.map((group) => ({ key: `grp-${group.id}`, text: `${pattern.group.singular} "${group.title}" masih draf, pertemuannya belum terlihat orang tua`, action: () => actions.editGroup(group) })),
    ...(pending ? [{ key: "pending", text: `${pending} laporan keluarga menunggu tanggapan guru`, action: () => goTo("family") }] : []),
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <section className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" /> Langkah kerja</h3>
          <ol className="mt-4 space-y-2">
            {steps.map((step, index) => (
              <li key={step.label}>
                <button type="button" onClick={step.action} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/40">
                  {step.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{index + 1}. {step.label}</span>
                    <span className="text-xs text-muted-foreground">{step.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section className={`rounded-xl border p-4 text-sm ${pattern.tone}`}>
          <p className="font-bold">Pola {pattern.label}</p>
          <p className="mt-1 text-foreground/80">{pattern.summary}</p>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border bg-card p-5">
          <h3 className="font-bold">{next?.meeting_date === today ? "Pertemuan hari ini" : "Pertemuan berikutnya"}</h3>
          {next ? (
            <div className="mt-3">
              <p className="text-lg font-bold">{next.title}</p>
              <p className="text-sm text-muted-foreground">{formatMeetingDate(next.meeting_date, next.start_time, next.end_time)}{next.subjects?.name ? ` · ${next.subjects.name}` : ""}</p>
              {!isMeetingPublished(next) && <p className="mt-1 text-xs font-semibold text-amber-700">Masih draf — belum terlihat orang tua</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => actions.openMeeting(next.id)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold hover:bg-muted"><ClipboardCheck className="h-3.5 w-3.5" /> Buka pertemuan</button>
                <button type="button" onClick={() => actions.openMeeting(next.id, "attendance")} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold hover:bg-muted"><UserCheck className="h-3.5 w-3.5" /> Catat kehadiran</button>
                {next.live_url && <a href={next.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Radio className="h-3.5 w-3.5" /> {HBL_PLATFORMS[next.live_platform] || "Live meet"}</a>}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada pertemuan terjadwal. Buat dari tab Rencana Belajar.</p>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5 text-amber-600" /> Butuh perhatian</h3>
          <div className="mt-3 space-y-2">
            {attention.map((item) => (
              <button key={item.key} type="button" onClick={item.action} className="block w-full rounded-md border bg-muted/20 p-3 text-left text-sm hover:bg-muted/50">{item.text}</button>
            ))}
            {!attention.length && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Semua beres. Tidak ada yang perlu ditindaklanjuti.</p>}
          </div>
        </section>
        <button type="button" onClick={() => goTo("settings")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><Settings className="h-3.5 w-3.5" /> Pengaturan program</button>
      </div>
    </div>
  );
}
