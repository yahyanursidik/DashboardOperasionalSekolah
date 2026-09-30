/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Edit3, Layers, Loader2, Plus, Radio, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PAUD_CP_ELEMENTS } from "../paud/paud-config";
import { formatMeetingDate, HBL_MEDIA_TYPES, HBL_PLATFORMS, HBL_STATUS_LABELS, meetingTiming, type HblMediaLink } from "./hbl-config";
import { isValidHblResource } from "./hbl-media-preview";
import { HblMeetingDetail } from "./hbl-meeting-detail";

const db = supabaseClient as any;

const emptyTheme = { week_number: "", theme: "", title: "", starts_on: "", ends_on: "", description: "", parent_guide: "", status: "draft" };
const emptyMeeting = {
  title: "", meeting_date: "", start_time: "", end_time: "", estimated_minutes: "", live_platform: "", live_url: "",
  learning_objectives: "", description: "", instructions_for_parent: "", cp_elements: [] as string[], media_links: [] as HblMediaLink[],
  worksheet_title: "", worksheet_url: "", worksheet_instructions: "", project_title: "", project_instructions: "", project_due_date: "", status: "draft",
};
const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

export const HblThemePlanner: React.FC<{ program: any; roster: any[] }> = ({ program, roster }) => {
  const [themes, setThemes] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [themeId, setThemeId] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [themeForm, setThemeForm] = useState<typeof emptyTheme | null>(null);
  const [editingThemeId, setEditingThemeId] = useState("");
  const [meetingForm, setMeetingForm] = useState<typeof emptyMeeting | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [themeResult, meetingResult] = await Promise.all([
      db.from("hbl_learning_weeks").select("*").eq("program_id", program.id).order("week_number"),
      db.from("hbl_meetings").select("*").eq("program_id", program.id).order("meeting_date", { nullsFirst: false }).order("meeting_number"),
    ]);
    const error = themeResult.error || meetingResult.error;
    if (error) toast.error("Rencana tema belum dapat dimuat", { description: error.message });
    const themeRows = themeResult.data || [];
    setThemes(themeRows);
    setMeetings(meetingResult.data || []);
    const today = new Date().toLocaleDateString("en-CA");
    setThemeId((current) => (current && themeRows.some((row: any) => row.id === current) ? current
      : themeRows.find((row: any) => row.starts_on && row.ends_on && row.starts_on <= today && row.ends_on >= today)?.id || themeRows[0]?.id || ""));
    setLoading(false);
  }, [program.id]);
  useEffect(() => { setThemeId(""); setMeetingId(""); void load(); }, [load]);

  const theme = themes.find((item) => item.id === themeId) || null;
  const themeMeetings = useMemo(() => meetings.filter((item) => item.week_id === themeId), [meetings, themeId]);
  const meeting = meetings.find((item) => item.id === meetingId) || null;
  const unthemed = meetings.filter((item) => !item.week_id);

  // Theme ------------------------------------------------------------------
  const openThemeForm = (item?: any) => {
    setEditingThemeId(item?.id || "");
    setThemeForm(item ? {
      week_number: String(item.week_number), theme: item.theme || "", title: item.title, starts_on: item.starts_on || "", ends_on: item.ends_on || "",
      description: item.description || "", parent_guide: item.parent_guide || "", status: item.status,
    } : { ...emptyTheme, week_number: String((themes.at(-1)?.week_number || 0) + 1) });
  };
  const saveTheme = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!themeForm) return;
    setSaving(true);
    const payload = {
      program_id: program.id, week_number: Number(themeForm.week_number), sort_order: Number(themeForm.week_number),
      theme: themeForm.theme.trim() || null, title: themeForm.title.trim(), starts_on: themeForm.starts_on || null, ends_on: themeForm.ends_on || null,
      description: themeForm.description.trim() || null, parent_guide: themeForm.parent_guide.trim() || null, status: themeForm.status,
      release_at: themeForm.status === "published" ? new Date().toISOString() : null,
    };
    const { data, error } = editingThemeId
      ? await db.from("hbl_learning_weeks").update(payload).eq("id", editingThemeId).select("id").single()
      : await db.from("hbl_learning_weeks").insert(payload).select("id").single();
    setSaving(false);
    if (error) return toast.error("Tema belum tersimpan", { description: error.code === "23505" ? "Nomor urut tema sudah dipakai." : error.message });
    toast.success(editingThemeId ? "Tema diperbarui." : "Tema ditambahkan.");
    setThemeForm(null);
    await load();
    setThemeId(data.id);
  };
  const toggleTheme = async (item: any) => {
    const status = item.status === "published" ? "draft" : "published";
    const { error } = await db.from("hbl_learning_weeks").update({ status, release_at: status === "published" ? new Date().toISOString() : null }).eq("id", item.id);
    if (error) return toast.error(error.message);
    await load();
  };
  const deleteTheme = async (item: any) => {
    if (meetings.some((row) => row.week_id === item.id)) return toast.error("Pindahkan atau hapus pertemuan dalam tema ini terlebih dahulu.");
    if (!window.confirm(`Hapus tema "${item.title}"?`)) return;
    const { error } = await db.from("hbl_learning_weeks").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    await load();
  };

  // Meeting -----------------------------------------------------------------
  const openMeetingForm = (item?: any) => {
    setEditingMeetingId(item?.id || "");
    setMeetingForm(item ? {
      title: item.title, meeting_date: item.meeting_date || "", start_time: item.start_time?.slice(0, 5) || "", end_time: item.end_time?.slice(0, 5) || "",
      estimated_minutes: item.estimated_minutes ? String(item.estimated_minutes) : "", live_platform: item.live_platform || "", live_url: item.live_url || "",
      learning_objectives: item.learning_objectives || "", description: item.description || "", instructions_for_parent: item.instructions_for_parent || "",
      cp_elements: item.cp_elements || [], media_links: Array.isArray(item.media_links) ? item.media_links : [],
      worksheet_title: item.worksheet_title || "", worksheet_url: item.worksheet_url || "", worksheet_instructions: item.worksheet_instructions || "",
      project_title: item.project_title || "", project_instructions: item.project_instructions || "", project_due_date: item.project_due_date || "",
      status: item.status || (item.is_published ? "published" : "draft"),
    } : { ...emptyMeeting, title: `Pertemuan ${themeMeetings.length + 1} · ${theme?.title || ""}`.trim() });
  };
  const saveMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meetingForm || !theme) return;
    if (meetingForm.live_url && !/^https:\/\//i.test(meetingForm.live_url)) return toast.error("Tautan live meet harus diawali https://");
    if (meetingForm.worksheet_url && !/^https:\/\//i.test(meetingForm.worksheet_url)) return toast.error("Tautan lembar kerja harus diawali https://");
    const media = meetingForm.media_links.filter((item) => item.url.trim());
    const invalid = media.find((item) => !isValidHblResource(item.type, item.url.trim()));
    if (invalid) return toast.error(`Tautan media "${invalid.title || invalid.url}" tidak sesuai jenisnya.`);
    const publish = meetingForm.status === "published";
    if (publish && theme.status !== "published") toast.info("Tema masih draf: pertemuan baru terlihat orang tua setelah tema diterbitkan.");
    const existing = meetings.find((item) => item.id === editingMeetingId);
    const payload = {
      program_id: program.id, week_id: theme.id,
      meeting_number: existing?.meeting_number || themeMeetings.length + 1, sort_order: existing?.sort_order ?? meetings.length,
      title: meetingForm.title.trim(), meeting_date: meetingForm.meeting_date || null,
      start_time: meetingForm.start_time || null, end_time: meetingForm.end_time || null,
      estimated_minutes: meetingForm.estimated_minutes ? Number(meetingForm.estimated_minutes) : null,
      live_platform: meetingForm.live_platform || null, live_url: meetingForm.live_url.trim() || null,
      learning_objectives: meetingForm.learning_objectives.trim() || null, description: meetingForm.description.trim() || null,
      instructions_for_parent: meetingForm.instructions_for_parent.trim() || null, cp_elements: meetingForm.cp_elements,
      media_links: media.map((item) => ({ title: item.title.trim() || HBL_MEDIA_TYPES[item.type], type: item.type, url: item.url.trim() })),
      worksheet_title: meetingForm.worksheet_title.trim() || null, worksheet_url: meetingForm.worksheet_url.trim() || null,
      worksheet_instructions: meetingForm.worksheet_instructions.trim() || null,
      project_title: meetingForm.project_title.trim() || null, project_instructions: meetingForm.project_instructions.trim() || null,
      project_due_date: meetingForm.project_due_date || null,
      status: meetingForm.status, is_published: publish,
      release_at: publish ? existing?.release_at || new Date().toISOString() : null,
    };
    setSaving(true);
    const { data, error } = editingMeetingId
      ? await db.from("hbl_meetings").update(payload).eq("id", editingMeetingId).select("id").single()
      : await db.from("hbl_meetings").insert(payload).select("id").single();
    setSaving(false);
    if (error) return toast.error("Pertemuan belum tersimpan", { description: error.message });
    toast.success(publish ? "Pertemuan terbit; orang tua mendapat notifikasi." : "Pertemuan disimpan sebagai draf.");
    setMeetingForm(null);
    await load();
    setMeetingId(data.id);
  };
  const toggleMeeting = async (item: any) => {
    const publish = !(item.is_published && item.status === "published");
    const { error } = await db.from("hbl_meetings").update({ status: publish ? "published" : "draft", is_published: publish, release_at: publish ? new Date().toISOString() : null }).eq("id", item.id);
    if (error) return toast.error(error.message);
    await load();
  };
  const deleteMeeting = async (item: any) => {
    if (!window.confirm(`Hapus "${item.title}" beserta kegiatannya?`)) return;
    const { error } = await db.from("hbl_meetings").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    if (meetingId === item.id) setMeetingId("");
    await load();
  };
  const moveToTheme = async (item: any) => {
    if (!themeId) return;
    const { error } = await db.from("hbl_meetings").update({ week_id: themeId }).eq("id", item.id);
    if (error) return toast.error(error.message);
    await load();
  };

  if (loading) return <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold"><Layers className="h-5 w-5 text-primary" /> Tema & Subtema</h3>
          <button type="button" onClick={() => openThemeForm()} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold hover:bg-muted"><Plus className="h-3.5 w-3.5" /> Tema</button>
        </div>
        {themes.map((item) => {
          const count = meetings.filter((row) => row.week_id === item.id).length;
          return (
            <button key={item.id} type="button" onClick={() => { setThemeId(item.id); setMeetingId(""); setMeetingForm(null); }} className={`w-full rounded-xl border p-3 text-left ${themeId === item.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/30"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase text-primary">Tema {item.week_number}{item.theme ? ` · ${item.theme}` : ""}</p>
                  <p className="mt-0.5 font-bold">{item.title}</p>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${item.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{HBL_STATUS_LABELS[item.status]}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.starts_on ? `${new Date(`${item.starts_on}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${item.ends_on ? new Date(`${item.ends_on}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "…"}` : "Tanggal belum diatur"} · {count} pertemuan
              </p>
            </button>
          );
        })}
        {!themes.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Mulai dengan tema pertama, misalnya "Diriku" dengan subtema "Tubuhku".</p>}
        {unthemed.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-bold">{unthemed.length} pertemuan belum masuk tema</p>
            {unthemed.map((item) => (
              <div key={item.id} className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate">{item.title}</span>
                <button type="button" disabled={!themeId} onClick={() => void moveToTheme(item)} className="shrink-0 rounded border border-amber-300 bg-white px-2 py-1 font-bold disabled:opacity-40">Masukkan ke tema terpilih</button>
              </div>
            ))}
          </div>
        )}
      </aside>

      <div className="space-y-4">
        {themeForm && (
          <form onSubmit={saveTheme} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">{editingThemeId ? "Ubah tema" : "Tema baru"}</h3><button type="button" onClick={() => setThemeForm(null)} className="rounded p-1 hover:bg-muted" title="Tutup"><X className="h-4 w-4" /></button></div>
            <div className="grid gap-3 md:grid-cols-[110px_1fr_1fr]">
              <input required type="number" min={1} max={60} value={themeForm.week_number} onChange={(event) => setThemeForm({ ...themeForm, week_number: event.target.value })} placeholder="Urutan" className={inputClass} />
              <input value={themeForm.theme} onChange={(event) => setThemeForm({ ...themeForm, theme: event.target.value })} placeholder="Tema, mis. Diriku" className={inputClass} />
              <input required minLength={3} value={themeForm.title} onChange={(event) => setThemeForm({ ...themeForm, title: event.target.value })} placeholder="Subtema, mis. Tubuhku" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-muted-foreground">Mulai<input type="date" value={themeForm.starts_on} onChange={(event) => setThemeForm({ ...themeForm, starts_on: event.target.value })} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Selesai<input type="date" value={themeForm.ends_on} onChange={(event) => setThemeForm({ ...themeForm, ends_on: event.target.value })} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Status<select value={themeForm.status} onChange={(event) => setThemeForm({ ...themeForm, status: event.target.value })} className={`${inputClass} mt-1`}><option value="draft">Draf</option><option value="published">Terbit</option></select></label>
            </div>
            <textarea value={themeForm.description} onChange={(event) => setThemeForm({ ...themeForm, description: event.target.value })} rows={2} placeholder="Fokus tema: pengalaman belajar dan nilai yang ingin ditumbuhkan" className="w-full rounded-md border bg-background p-3 text-sm" />
            <textarea value={themeForm.parent_guide} onChange={(event) => setThemeForm({ ...themeForm, parent_guide: event.target.value })} rows={3} placeholder="Panduan orang tua selama tema ini: kebiasaan di rumah, bahan sederhana, cara mendampingi" className="w-full rounded-md border bg-background p-3 text-sm" />
            <button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Tema</button>
          </form>
        )}

        {theme ? (
          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Tema {theme.week_number}{theme.theme ? ` · ${theme.theme}` : ""}</p>
                <h3 className="text-lg font-bold">{theme.title}</h3>
                {theme.description && <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openThemeForm(theme)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold"><Edit3 className="h-3.5 w-3.5" /> Ubah</button>
                <button type="button" onClick={() => void toggleTheme(theme)} className="rounded-md border px-2.5 py-1.5 text-xs font-bold">{theme.status === "published" ? "Tarik terbit" : "Terbitkan tema"}</button>
                <button type="button" onClick={() => void deleteTheme(theme)} title="Hapus tema" className="rounded-md border p-1.5 text-rose-600"><Trash2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => openMeetingForm()} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><CalendarPlus className="h-3.5 w-3.5" /> Pertemuan</button>
              </div>
            </div>
            <div className="divide-y">
              {themeMeetings.map((item) => {
                const timing = meetingTiming(item);
                const published = item.is_published && item.status === "published";
                return (
                  <div key={item.id} className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${meetingId === item.id ? "bg-primary/5" : ""}`}>
                    <button type="button" onClick={() => { setMeetingId(item.id); setMeetingForm(null); }} className="min-w-0 flex-1 text-left">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {item.title}
                        {timing === "today" && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Hari ini</span>}
                        {item.live_url && <Radio className="h-3.5 w-3.5 text-emerald-600" />}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{formatMeetingDate(item.meeting_date, item.start_time, item.end_time)}</p>
                    </button>
                    <div className="flex shrink-0 gap-1.5">
                      <span className={`rounded px-2 py-1 text-[10px] font-bold ${published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{published ? "Terbit" : "Draf"}</span>
                      <button type="button" onClick={() => openMeetingForm(item)} title="Ubah pertemuan" className="rounded-md border p-1.5"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void toggleMeeting(item)} className="rounded-md border px-2 py-1 text-[11px] font-bold">{published ? "Tarik" : "Terbitkan"}</button>
                      <button type="button" onClick={() => void deleteMeeting(item)} title="Hapus pertemuan" className="rounded-md border p-1.5 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
              {!themeMeetings.length && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada pertemuan pada tema ini.</p>}
            </div>
          </section>
        ) : !themeForm && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Pilih atau buat tema untuk menyusun pertemuan.</div>
        )}

        {meetingForm && theme && (
          <form onSubmit={saveMeeting} className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">{editingMeetingId ? "Ubah pertemuan" : "Pertemuan baru"} · {theme.title}</h3><button type="button" onClick={() => setMeetingForm(null)} className="rounded p-1 hover:bg-muted" title="Tutup"><X className="h-4 w-4" /></button></div>
            <input required minLength={3} value={meetingForm.title} onChange={(event) => setMeetingForm({ ...meetingForm, title: event.target.value })} placeholder="Judul pertemuan" className={inputClass} />
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs font-semibold text-muted-foreground">Tanggal<input type="date" value={meetingForm.meeting_date} onChange={(event) => setMeetingForm({ ...meetingForm, meeting_date: event.target.value })} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Mulai<input type="time" value={meetingForm.start_time} onChange={(event) => setMeetingForm({ ...meetingForm, start_time: event.target.value })} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Selesai<input type="time" value={meetingForm.end_time} onChange={(event) => setMeetingForm({ ...meetingForm, end_time: event.target.value })} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Durasi (menit)<input type="number" min={1} max={480} value={meetingForm.estimated_minutes} onChange={(event) => setMeetingForm({ ...meetingForm, estimated_minutes: event.target.value })} className={`${inputClass} mt-1`} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <select value={meetingForm.live_platform} onChange={(event) => setMeetingForm({ ...meetingForm, live_platform: event.target.value })} className={inputClass}>
                <option value="">Tanpa live meet</option>
                {Object.entries(HBL_PLATFORMS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input type="url" value={meetingForm.live_url} onChange={(event) => setMeetingForm({ ...meetingForm, live_url: event.target.value })} placeholder="https://meet.google.com/..." className={inputClass} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Elemen Capaian Pembelajaran yang dituju</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PAUD_CP_ELEMENTS.map((element) => {
                  const active = meetingForm.cp_elements.includes(element.id);
                  return (
                    <button key={element.id} type="button" onClick={() => setMeetingForm({ ...meetingForm, cp_elements: active ? meetingForm.cp_elements.filter((id) => id !== element.id) : [...meetingForm.cp_elements, element.id] })} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      {element.shortTitle}
                    </button>
                  );
                })}
              </div>
            </div>
            <textarea value={meetingForm.learning_objectives} onChange={(event) => setMeetingForm({ ...meetingForm, learning_objectives: event.target.value })} rows={2} placeholder="Tujuan pembelajaran pertemuan ini" className="w-full rounded-md border bg-background p-3 text-sm" />
            <textarea value={meetingForm.description} onChange={(event) => setMeetingForm({ ...meetingForm, description: event.target.value })} rows={3} placeholder="Alur pertemuan: pembukaan (salam, doa, lagu), kegiatan inti, penutup (recalling, doa)" className="w-full rounded-md border bg-background p-3 text-sm" />
            <textarea value={meetingForm.instructions_for_parent} onChange={(event) => setMeetingForm({ ...meetingForm, instructions_for_parent: event.target.value })} rows={2} placeholder="Persiapan untuk orang tua: alat dan bahan, posisi duduk, peran pendamping" className="w-full rounded-md border bg-background p-3 text-sm" />

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Media pendukung (lagu, video, cerita)</p><button type="button" onClick={() => setMeetingForm({ ...meetingForm, media_links: [...meetingForm.media_links, { title: "", type: "youtube", url: "" }] })} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Media</button></div>
              {meetingForm.media_links.map((item, index) => (
                <div key={index} className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px_1.4fr_auto]">
                  <input value={item.title} onChange={(event) => setMeetingForm({ ...meetingForm, media_links: meetingForm.media_links.map((row, i) => (i === index ? { ...row, title: event.target.value } : row)) })} placeholder="Judul" className={inputClass} />
                  <select value={item.type} onChange={(event) => setMeetingForm({ ...meetingForm, media_links: meetingForm.media_links.map((row, i) => (i === index ? { ...row, type: event.target.value } : row)) })} className={inputClass}>
                    {Object.entries(HBL_MEDIA_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input type="url" value={item.url} onChange={(event) => setMeetingForm({ ...meetingForm, media_links: meetingForm.media_links.map((row, i) => (i === index ? { ...row, url: event.target.value } : row)) })} placeholder="https://..." className={inputClass} />
                  <button type="button" title="Hapus media" onClick={() => setMeetingForm({ ...meetingForm, media_links: meetingForm.media_links.filter((_, i) => i !== index) })} className="rounded-md border px-2 text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-semibold">Lembar kerja (opsional)</p>
                <input value={meetingForm.worksheet_title} onChange={(event) => setMeetingForm({ ...meetingForm, worksheet_title: event.target.value })} placeholder="Judul lembar kerja" className={inputClass} />
                <input type="url" value={meetingForm.worksheet_url} onChange={(event) => setMeetingForm({ ...meetingForm, worksheet_url: event.target.value })} placeholder="Tautan (Google Drive/PDF)" className={inputClass} />
                <textarea value={meetingForm.worksheet_instructions} onChange={(event) => setMeetingForm({ ...meetingForm, worksheet_instructions: event.target.value })} rows={2} placeholder="Cara mengerjakan" className="w-full rounded-md border bg-background p-2 text-sm" />
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-semibold">Home project (opsional)</p>
                <input value={meetingForm.project_title} onChange={(event) => setMeetingForm({ ...meetingForm, project_title: event.target.value })} placeholder="Judul project" className={inputClass} />
                <input type="date" value={meetingForm.project_due_date} onChange={(event) => setMeetingForm({ ...meetingForm, project_due_date: event.target.value })} className={inputClass} />
                <textarea value={meetingForm.project_instructions} onChange={(event) => setMeetingForm({ ...meetingForm, project_instructions: event.target.value })} rows={2} placeholder="Instruksi project bersama keluarga" className="w-full rounded-md border bg-background p-2 text-sm" />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <select value={meetingForm.status} onChange={(event) => setMeetingForm({ ...meetingForm, status: event.target.value })} className={`${inputClass} sm:max-w-xs`}>
                <option value="draft">Simpan sebagai draf</option>
                <option value="published">Terbitkan ke orang tua</option>
              </select>
              <button disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Pertemuan</button>
            </div>
          </form>
        )}

        {meeting && !meetingForm && <HblMeetingDetail key={meeting.id} meeting={meeting} program={program} roster={roster} />}
      </div>
    </div>
  );
};
