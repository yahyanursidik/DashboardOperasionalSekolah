/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { CalendarPlus, ChevronDown, Edit3, Eye, EyeOff, Layers, Plus, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PAUD_CP_ELEMENTS } from "../paud/paud-config";
import { formatMeetingDate, meetingTiming } from "./hbl-config";
import type { HblPattern } from "./hbl-patterns";
import { isMeetingPublished, jakartaToday, type useHblProgram } from "./use-hbl-program";
import type { HblPlanActions } from "./hbl-program-view";

const db = supabaseClient as any;
const shortDate = (value?: string | null) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "");

export const HblPlanTab: React.FC<{ pattern: HblPattern; data: ReturnType<typeof useHblProgram>; actions: HblPlanActions }> = ({ pattern, data, actions }) => {
  const today = jakartaToday();
  const current = data.groups.find((group) => group.starts_on && group.ends_on && group.starts_on <= today && group.ends_on >= today)?.id;
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(data.groups.filter((group) => group.ends_on && group.ends_on < today && group.id !== current).map((group) => group.id)));
  const loose = data.meetings.filter((meeting) => !meeting.week_id || !data.groups.some((group) => group.id === meeting.week_id));

  const toggleGroup = async (group: any) => {
    const status = group.status === "published" ? "draft" : "published";
    const { error } = await db.from("hbl_learning_weeks").update({ status, release_at: status === "published" ? new Date().toISOString() : null }).eq("id", group.id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? `${pattern.group.singular} terbit.` : `${pattern.group.singular} ditarik ke draf.`);
    await data.reload();
  };
  const deleteGroup = async (group: any) => {
    if (data.meetings.some((meeting) => meeting.week_id === group.id)) return toast.error("Hapus atau pindahkan pertemuan di dalamnya terlebih dahulu.");
    if (!window.confirm(`Hapus ${pattern.group.singular.toLowerCase()} "${group.title}"?`)) return;
    const { error } = await db.from("hbl_learning_weeks").delete().eq("id", group.id);
    if (error) return toast.error(error.message);
    await data.reload();
  };
  const toggleMeeting = async (meeting: any) => {
    const publish = !isMeetingPublished(meeting);
    const { error } = await db.from("hbl_meetings").update({ status: publish ? "published" : "draft", is_published: publish, release_at: publish ? new Date().toISOString() : null }).eq("id", meeting.id);
    if (error) return toast.error(error.message);
    toast.success(publish ? "Pertemuan terbit; orang tua mendapat notifikasi." : "Pertemuan ditarik ke draf.");
    await data.reload();
  };
  const deleteMeeting = async (meeting: any) => {
    if (!window.confirm(`Hapus "${meeting.title}" beserta kegiatannya?`)) return;
    const { error } = await db.from("hbl_meetings").delete().eq("id", meeting.id);
    if (error) return toast.error(error.message);
    await data.reload();
  };

  const meetingRow = (meeting: any) => {
    const timing = meetingTiming(meeting, today);
    const published = isMeetingPublished(meeting);
    const activityCount = data.activities.filter((activity) => activity.meeting_id === meeting.id).length;
    return (
      <li key={meeting.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => actions.openMeeting(meeting.id)} className="min-w-0 flex-1 text-left">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold">
            {meeting.title}
            {timing === "today" && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Hari ini</span>}
            {meeting.subjects?.name && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{meeting.subjects.name}</span>}
            {meeting.live_url && <Radio className="h-3.5 w-3.5 text-emerald-600" />}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatMeetingDate(meeting.meeting_date, meeting.start_time, meeting.end_time)} · {activityCount} {pattern.activity.singular.toLowerCase()}
            {pattern.usesCpElements && (meeting.cp_elements || []).length > 0 && ` · ${(meeting.cp_elements || []).map((id: string) => PAUD_CP_ELEMENTS.find((element) => element.id === id)?.shortTitle).join(", ")}`}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded px-2 py-1 text-[10px] font-bold ${published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{published ? "Terbit" : "Draf"}</span>
          <IconButton title={published ? "Tarik ke draf" : "Terbitkan"} onClick={() => void toggleMeeting(meeting)}>{published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</IconButton>
          <IconButton title="Ubah" onClick={() => actions.editMeeting(meeting)}><Edit3 className="h-3.5 w-3.5" /></IconButton>
          <IconButton title="Hapus" danger onClick={() => void deleteMeeting(meeting)}><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Urutan belajar semester ini. Klik pertemuan untuk melihat isi, mencatat kehadiran, dan meninjau laporan keluarga.</p>
        <button type="button" onClick={() => actions.editGroup(null)} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold hover:bg-muted"><Plus className="h-4 w-4" /> {pattern.group.singular}</button>
      </div>

      {!data.groups.length && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Layers className="mx-auto h-9 w-9 text-muted-foreground/40" />
          <p className="mt-2 font-semibold">Mulai dengan {pattern.group.singular.toLowerCase()} pertama</p>
          <p className="mt-1 text-sm text-muted-foreground">Contoh: {pattern.group.example}.</p>
          <button type="button" onClick={() => actions.editGroup(null)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> Buat {pattern.group.singular.toLowerCase()}</button>
        </div>
      )}

      {data.groups.map((group) => {
        const meetings = data.meetings.filter((meeting) => meeting.week_id === group.id);
        const open = !collapsed.has(group.id);
        return (
          <section key={group.id} className={`overflow-hidden rounded-xl border bg-card ${group.id === current ? "border-primary/50" : ""}`}>
            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setCollapsed((set) => { const next = new Set(set); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <ChevronDown className={`mt-1 h-4 w-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase text-primary">
                    {pattern.group.singular} {group.week_number}{group.theme ? ` · ${group.theme}` : ""}{group.id === current ? " · berjalan" : ""}
                  </span>
                  <span className="block font-bold">{group.title}</span>
                  <span className="block text-xs text-muted-foreground">{group.starts_on ? `${shortDate(group.starts_on)} – ${shortDate(group.ends_on) || "…"}` : "Tanggal belum diatur"} · {meetings.length} pertemuan</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`rounded px-2 py-1 text-[10px] font-bold ${group.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{group.status === "published" ? "Terbit" : "Draf"}</span>
                <IconButton title={group.status === "published" ? "Tarik ke draf" : "Terbitkan"} onClick={() => void toggleGroup(group)}>{group.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</IconButton>
                <IconButton title="Ubah" onClick={() => actions.editGroup(group)}><Edit3 className="h-3.5 w-3.5" /></IconButton>
                <IconButton title="Hapus" danger onClick={() => void deleteGroup(group)}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                <button type="button" onClick={() => actions.editMeeting(null, group.id)} className="ml-1 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"><CalendarPlus className="h-3.5 w-3.5" /> Pertemuan</button>
              </div>
            </div>
            {open && (
              <ul className="divide-y border-t">
                {meetings.map(meetingRow)}
                {!meetings.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada pertemuan.</li>}
              </ul>
            )}
          </section>
        );
      })}

      {loose.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40">
          <p className="p-4 text-sm font-bold text-amber-900">Pertemuan tanpa {pattern.group.singular.toLowerCase()} — ubah untuk memilih {pattern.group.singular.toLowerCase()}nya</p>
          <ul className="divide-y border-t bg-card">{loose.map(meetingRow)}</ul>
        </section>
      )}
    </div>
  );
};

function IconButton({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`rounded-md border p-1.5 hover:bg-muted ${danger ? "text-rose-600" : ""}`}>{children}</button>;
}
