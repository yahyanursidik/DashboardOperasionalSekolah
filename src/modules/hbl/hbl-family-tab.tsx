/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { getDocumentSignedUrl } from "../../lib/supabase/storage";
import type { HblPattern } from "./hbl-patterns";
import type { useHblProgram } from "./use-hbl-program";
import { useHblSubmissions, type HblSubmissionItem } from "./use-hbl-submissions";

const db = supabaseClient as any;
const WELLBEING_LABELS: Record<string, { label: string; tone: string }> = {
  happy: { label: "Senang", tone: "bg-emerald-50 text-emerald-700" },
  okay: { label: "Baik", tone: "bg-sky-50 text-sky-700" },
  challenged: { label: "Butuh dukungan", tone: "bg-amber-50 text-amber-700" },
  need_help: { label: "Mohon dihubungi", tone: "bg-rose-50 text-rose-700" },
};

export const HblSubmissionCard: React.FC<{ item: HblSubmissionItem; showMeeting?: boolean; onReviewed: () => void | Promise<void> }> = ({ item, showMeeting, onReviewed }) => {
  const [feedback, setFeedback] = useState(item.row.feedback || "");
  const [saving, setSaving] = useState(false);
  const status = item.row.status;

  const review = async (next: "reviewed" | "needs_revision") => {
    if (next === "needs_revision" && !feedback.trim()) return toast.error("Tuliskan arahan perbaikan untuk keluarga.");
    setSaving(true);
    const { data } = await supabaseClient.auth.getUser();
    const { error } = await db.from(item.table).update({ status: next, feedback: feedback.trim() || null, reviewed_by: data.user?.id || null, reviewed_at: new Date().toISOString() }).eq("id", item.row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(next === "reviewed" ? "Disetujui." : "Arahan perbaikan dikirim ke keluarga.");
    await onReviewed();
  };
  const open = async () => {
    if (!item.file) return;
    try { window.open(await getDocumentSignedUrl(item.file), "_blank"); } catch { window.open(item.file, "_blank"); }
  };

  return (
    <article className={`grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_1.1fr] ${status === "submitted" ? "border-sky-200 bg-sky-50/40" : ""}`}>
      <div>
        <p className="font-bold">{item.studentName}</p>
        <p className="text-xs text-muted-foreground">{item.label}{showMeeting && item.meetingTitle ? ` · ${item.meetingTitle}` : ""}</p>
        <p className="text-xs text-muted-foreground">{item.parentName} · {new Date(item.row.submitted_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
        {item.row.checklist_completed && <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Ditandai selesai</p>}
        {item.note && <p className="mt-1 rounded bg-muted/50 p-2 text-xs">{item.note}</p>}
        {item.file && <button type="button" onClick={() => void open()} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">Buka bukti <ExternalLink className="h-3.5 w-3.5" /></button>}
      </div>
      <div>
        <p className={`text-xs font-bold ${status === "reviewed" ? "text-emerald-700" : status === "needs_revision" ? "text-amber-700" : "text-sky-700"}`}>{status === "reviewed" ? "Disetujui" : status === "needs_revision" ? "Menunggu perbaikan keluarga" : "Menunggu tanggapan guru"}</p>
        <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={2} placeholder="Tanggapan guru untuk keluarga" className="mt-1 w-full rounded-md border bg-background p-2 text-xs" />
        <div className="mt-1 flex gap-2">
          <button type="button" disabled={saving} onClick={() => void review("reviewed")} className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Setujui</button>
          <button type="button" disabled={saving} onClick={() => void review("needs_revision")} className="rounded border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 disabled:opacity-50">Minta perbaikan</button>
        </div>
      </div>
    </article>
  );
};

export const HblFamilyTab: React.FC<{ pattern: HblPattern; data: ReturnType<typeof useHblProgram>; onChanged: () => void | Promise<void> }> = ({ pattern, data, onChanged }) => {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [checkins, setCheckins] = useState<any[]>([]);
  const family = useHblSubmissions(data.meetings);
  const groupIds = data.groups.map((group) => group.id).join(",");

  useEffect(() => {
    if (!groupIds) { setCheckins([]); return; }
    void db.from("hbl_parent_checkins").select("*, students(full_name), parents(full_name)").in("week_id", groupIds.split(",")).order("submitted_at", { ascending: false })
      .then(({ data: rows }: any) => setCheckins(rows || []));
  }, [groupIds]);

  const shown = useMemo(() => family.items.filter((item) => filter === "all" || item.row.status === "submitted"), [family.items, filter]);
  const groupTitle = (id: string) => { const group = data.groups.find((item) => item.id === id); return group ? `${pattern.group.singular} ${group.week_number} · ${group.title}` : ""; };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">Kiriman kegiatan & home project</h3>
          <div className="inline-flex rounded-md border bg-muted/40 p-1 text-xs">
            {([["pending", `Menunggu (${family.pendingCount})`], ["all", `Semua (${family.items.length})`]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded px-3 py-1 font-semibold ${filter === value ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>{label}</button>
            ))}
          </div>
        </div>
        {family.loading ? (
          <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : shown.length ? (
          shown.map((item) => <HblSubmissionCard key={item.key} item={item} showMeeting onReviewed={async () => { await family.reload(); await onChanged(); }} />)
        ) : (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{filter === "pending" ? "Tidak ada kiriman yang menunggu tanggapan." : "Belum ada kiriman dari keluarga."}</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-bold"><Heart className="h-4 w-4 text-rose-600" /> Cerita keluarga</h3>
        {checkins.map((checkin) => {
          const mood = WELLBEING_LABELS[checkin.wellbeing] || WELLBEING_LABELS.okay;
          return (
            <article key={checkin.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{checkin.students?.full_name}</p>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${mood.tone}`}>{mood.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{groupTitle(checkin.week_id)} · {checkin.parents?.full_name || "Orang tua"}</p>
              {checkin.favorite_activity && <p className="mt-1 text-xs"><strong>Favorit:</strong> {checkin.favorite_activity}</p>}
              {checkin.message && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{checkin.message}</p>}
            </article>
          );
        })}
        {!checkins.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada cerita keluarga.</p>}
      </section>
    </div>
  );
};
