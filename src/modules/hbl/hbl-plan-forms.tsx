/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PAUD_CP_ELEMENTS } from "../paud/paud-config";
import { HBL_MEDIA_TYPES, HBL_PLATFORMS, type HblMediaLink } from "./hbl-config";
import type { HblPattern } from "./hbl-patterns";
import { isValidHblResource } from "./hbl-media-preview";

const db = supabaseClient as any;
const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const areaClass = "w-full rounded-md border bg-background p-3 text-sm";

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <p className="text-sm font-bold"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{step}</span>{title}</p>
        {hint && <p className="mt-0.5 pl-7 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-muted-foreground">{text}<div className="mt-1">{children}</div></label>;
}

// Group (Tema / Pekan) ---------------------------------------------------------------------
export const HblGroupForm: React.FC<{ program: any; pattern: HblPattern; group: any | null; groups: any[]; onSaved: () => void }> = ({ program, pattern, group, groups, onSaved }) => {
  const [form, setForm] = useState(() => ({
    week_number: String(group?.week_number ?? (groups.at(-1)?.week_number || 0) + 1),
    theme: group?.theme || "",
    title: group?.title || "",
    starts_on: group?.starts_on || "",
    ends_on: group?.ends_on || "",
    description: group?.description || "",
    parent_guide: group?.parent_guide || "",
    status: group?.status || "published",
  }));
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) return toast.error("Tanggal selesai harus setelah tanggal mulai.");
    setSaving(true);
    const payload = {
      program_id: program.id, week_number: Number(form.week_number), sort_order: Number(form.week_number),
      theme: pattern.group.themeField ? form.theme.trim() || null : null, title: form.title.trim(),
      starts_on: form.starts_on || null, ends_on: form.ends_on || null, description: form.description.trim() || null,
      parent_guide: form.parent_guide.trim() || null, status: form.status,
      release_at: form.status === "published" ? group?.release_at || new Date().toISOString() : null,
    };
    const { error } = group
      ? await db.from("hbl_learning_weeks").update(payload).eq("id", group.id)
      : await db.from("hbl_learning_weeks").insert(payload);
    setSaving(false);
    if (error) return toast.error(`${pattern.group.singular} belum tersimpan`, { description: error.code === "23505" ? "Nomor urut sudah dipakai." : error.message });
    toast.success(`${pattern.group.singular} tersimpan.`);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={`grid gap-3 ${pattern.group.themeField ? "sm:grid-cols-[100px_1fr_1fr]" : "sm:grid-cols-[100px_1fr]"}`}>
        <Label text="Urutan"><input required type="number" min={1} max={60} value={form.week_number} onChange={(event) => setForm({ ...form, week_number: event.target.value })} className={inputClass} /></Label>
        {pattern.group.themeField && <Label text={pattern.group.themeField}><input value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })} placeholder="mis. Diriku" className={inputClass} /></Label>}
        <Label text={pattern.group.themeField ? "Subtema" : "Judul pekan"}><input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={pattern.group.titlePlaceholder} className={inputClass} /></Label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Mulai"><input type="date" value={form.starts_on} onChange={(event) => setForm({ ...form, starts_on: event.target.value })} className={inputClass} /></Label>
        <Label text="Selesai"><input type="date" value={form.ends_on} onChange={(event) => setForm({ ...form, ends_on: event.target.value })} className={inputClass} /></Label>
      </div>
      <Label text={pattern.group.themeField ? "Fokus tema" : "Fokus pekan ini"}>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Pengalaman belajar dan nilai yang ingin ditumbuhkan" className={areaClass} />
      </Label>
      <Label text="Panduan untuk orang tua">
        <textarea value={form.parent_guide} onChange={(event) => setForm({ ...form, parent_guide: event.target.value })} rows={4} placeholder="Kebiasaan di rumah, bahan sederhana yang perlu disiapkan, cara mendampingi" className={areaClass} />
      </Label>
      <Label text="Status">
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={inputClass}>
          <option value="published">Terbit — pertemuan yang terbit di dalamnya terlihat orang tua</option>
          <option value="draft">Draf — seluruh isinya disembunyikan dari orang tua</option>
        </select>
      </Label>
      <button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
    </form>
  );
};

// Meeting -------------------------------------------------------------------------------------
export const HblMeetingForm: React.FC<{
  program: any; pattern: HblPattern; meeting: any | null; defaultGroupId?: string; groups: any[]; meetings: any[]; onSaved: (id: string) => void;
}> = ({ program, pattern, meeting, defaultGroupId, groups, meetings, onSaved }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const groupId = meeting?.week_id || defaultGroupId || groups.at(-1)?.id || "";
    const group = groups.find((item) => item.id === groupId);
    const count = meetings.filter((item) => item.week_id === groupId).length;
    return {
      week_id: groupId,
      subject_id: meeting?.subject_id || "",
      title: meeting?.title || `${pattern.meeting.titlePrefix} ${count + 1}${group ? ` · ${group.title}` : ""}`,
      meeting_date: meeting?.meeting_date || "",
      start_time: meeting?.start_time?.slice(0, 5) || "",
      end_time: meeting?.end_time?.slice(0, 5) || "",
      estimated_minutes: meeting?.estimated_minutes ? String(meeting.estimated_minutes) : "",
      live_platform: meeting?.live_platform || "",
      live_url: meeting?.live_url || "",
      learning_objectives: meeting?.learning_objectives || "",
      description: meeting?.description || "",
      instructions_for_parent: meeting?.instructions_for_parent || "",
      cp_elements: (meeting?.cp_elements || []) as string[],
      media_links: (Array.isArray(meeting?.media_links) ? meeting.media_links : []) as HblMediaLink[],
      worksheet_title: meeting?.worksheet_title || "",
      worksheet_url: meeting?.worksheet_url || "",
      worksheet_instructions: meeting?.worksheet_instructions || "",
      project_title: meeting?.project_title || "",
      project_instructions: meeting?.project_instructions || "",
      project_due_date: meeting?.project_due_date || "",
      publish: meeting ? Boolean(meeting.is_published && meeting.status === "published") : false,
    };
  });

  useEffect(() => {
    if (!pattern.usesSubjects || !program.unit_id) return;
    void db.from("subjects").select("id,name,grade_levels").eq("unit_id", program.unit_id).eq("is_active", true).order("name")
      .then(({ data }: any) => {
        const grade = program.classes?.grade_level;
        setSubjects((data || []).sort((a: any, b: any) => Number((b.grade_levels || []).includes(grade)) - Number((a.grade_levels || []).includes(grade))));
      });
  }, [pattern.usesSubjects, program.classes?.grade_level, program.unit_id]);

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const group = groups.find((item) => item.id === form.week_id);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.week_id) return toast.error(`Pilih ${pattern.group.singular.toLowerCase()}.`);
    if (pattern.usesSubjects && !form.subject_id) return toast.error("Pilih mata pelajaran.");
    if (form.live_url && !/^https:\/\//i.test(form.live_url)) return toast.error("Tautan live meet harus diawali https://");
    if (form.worksheet_url && !/^https:\/\//i.test(form.worksheet_url)) return toast.error("Tautan lembar kerja harus diawali https://");
    if (form.start_time && form.end_time && form.end_time <= form.start_time) return toast.error("Jam selesai harus setelah jam mulai.");
    const media = form.media_links.filter((item) => item.url.trim());
    const invalid = media.find((item) => !isValidHblResource(item.type, item.url.trim()));
    if (invalid) return toast.error(`Tautan media "${invalid.title || invalid.url}" tidak sesuai jenisnya.`);
    if (form.publish && group?.status !== "published") toast.info(`${pattern.group.singular} masih draf: pertemuan baru terlihat orang tua setelah ${pattern.group.singular.toLowerCase()} diterbitkan.`);
    const sameGroup = meetings.filter((item) => item.week_id === form.week_id && item.id !== meeting?.id);
    const payload = {
      program_id: program.id, week_id: form.week_id,
      subject_id: pattern.usesSubjects ? form.subject_id || null : null,
      meeting_number: meeting?.week_id === form.week_id && meeting?.meeting_number ? meeting.meeting_number : sameGroup.length + 1,
      sort_order: meeting?.sort_order ?? meetings.length,
      title: form.title.trim(), meeting_date: form.meeting_date || null, start_time: form.start_time || null, end_time: form.end_time || null,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      live_platform: form.live_platform || null, live_url: form.live_url.trim() || null,
      learning_objectives: form.learning_objectives.trim() || null, description: form.description.trim() || null,
      instructions_for_parent: form.instructions_for_parent.trim() || null,
      cp_elements: pattern.usesCpElements ? form.cp_elements : [],
      media_links: media.map((item) => ({ title: item.title.trim() || HBL_MEDIA_TYPES[item.type], type: item.type, url: item.url.trim() })),
      worksheet_title: form.worksheet_title.trim() || null, worksheet_url: form.worksheet_url.trim() || null, worksheet_instructions: form.worksheet_instructions.trim() || null,
      project_title: form.project_title.trim() || null, project_instructions: form.project_instructions.trim() || null, project_due_date: form.project_due_date || null,
      status: form.publish ? "published" : "draft", is_published: form.publish,
      release_at: form.publish ? meeting?.release_at || new Date().toISOString() : null,
    };
    setSaving(true);
    const { data, error } = meeting
      ? await db.from("hbl_meetings").update(payload).eq("id", meeting.id).select("id").single()
      : await db.from("hbl_meetings").insert(payload).select("id").single();
    setSaving(false);
    if (error) return toast.error("Pertemuan belum tersimpan", { description: error.message });
    toast.success(form.publish ? "Pertemuan terbit; orang tua mendapat notifikasi." : "Pertemuan disimpan sebagai draf.");
    onSaved(data.id);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section step={1} title="Jadwal" hint="Kapan pertemuan berlangsung dan di mana anak bergabung.">
        <div className={`grid gap-3 ${pattern.usesSubjects ? "sm:grid-cols-2" : ""}`}>
          <Label text={pattern.group.singular}>
            <select required value={form.week_id} onChange={(event) => set({ week_id: event.target.value })} className={inputClass}>
              <option value="">Pilih {pattern.group.singular.toLowerCase()}</option>
              {groups.map((item) => <option key={item.id} value={item.id}>{pattern.group.singular} {item.week_number}{item.theme ? ` · ${item.theme}` : ""} · {item.title}</option>)}
            </select>
          </Label>
          {pattern.usesSubjects && (
            <Label text="Mata pelajaran">
              <select required value={form.subject_id} onChange={(event) => set({ subject_id: event.target.value })} className={inputClass}>
                <option value="">Pilih mapel</option>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Label>
          )}
        </div>
        <Label text="Judul pertemuan"><input required minLength={3} value={form.title} onChange={(event) => set({ title: event.target.value })} className={inputClass} /></Label>
        <div className="grid gap-3 sm:grid-cols-4">
          <Label text="Tanggal"><input type="date" value={form.meeting_date} onChange={(event) => set({ meeting_date: event.target.value })} className={inputClass} /></Label>
          <Label text="Mulai"><input type="time" value={form.start_time} onChange={(event) => set({ start_time: event.target.value })} className={inputClass} /></Label>
          <Label text="Selesai"><input type="time" value={form.end_time} onChange={(event) => set({ end_time: event.target.value })} className={inputClass} /></Label>
          <Label text="Durasi (menit)"><input type="number" min={1} max={480} value={form.estimated_minutes} onChange={(event) => set({ estimated_minutes: event.target.value })} className={inputClass} /></Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Label text="Live meet">
            <select value={form.live_platform} onChange={(event) => set({ live_platform: event.target.value })} className={inputClass}>
              <option value="">Tanpa live meet</option>
              {Object.entries(HBL_PLATFORMS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Label>
          <Label text="Tautan"><input type="url" value={form.live_url} onChange={(event) => set({ live_url: event.target.value })} placeholder="https://meet.google.com/..." disabled={!form.live_platform} className={`${inputClass} disabled:opacity-50`} /></Label>
        </div>
      </Section>

      <Section step={2} title="Tujuan & alur" hint="Apa yang ingin dicapai dan bagaimana pertemuan berjalan.">
        {pattern.usesCpElements && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Elemen Capaian Pembelajaran yang dituju</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PAUD_CP_ELEMENTS.map((element) => {
                const active = form.cp_elements.includes(element.id);
                return (
                  <button key={element.id} type="button" onClick={() => set({ cp_elements: active ? form.cp_elements.filter((id) => id !== element.id) : [...form.cp_elements, element.id] })} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                    {element.shortTitle}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Label text="Tujuan pembelajaran"><textarea value={form.learning_objectives} onChange={(event) => set({ learning_objectives: event.target.value })} rows={2} className={areaClass} /></Label>
        <Label text="Alur pertemuan">
          <textarea value={form.description} onChange={(event) => set({ description: event.target.value })} rows={3} placeholder={pattern.usesCpElements ? "Pembukaan (salam, doa, lagu) → kegiatan inti → penutup (recalling, doa)" : "Apersepsi → penjelasan materi → latihan → refleksi"} className={areaClass} />
        </Label>
        <Label text="Persiapan orang tua"><textarea value={form.instructions_for_parent} onChange={(event) => set({ instructions_for_parent: event.target.value })} rows={2} placeholder="Alat dan bahan, posisi belajar, peran pendamping" className={areaClass} /></Label>
      </Section>

      <Section step={3} title={pattern.usesCpElements ? "Media pendukung" : "Materi"} hint={pattern.usesCpElements ? "Lagu, video, atau cerita yang dipakai saat pertemuan." : "Video penjelasan, bahan bacaan, atau presentasi."}>
        {form.media_links.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_150px_1.4fr_auto]">
            <input value={item.title} onChange={(event) => set({ media_links: form.media_links.map((row, i) => (i === index ? { ...row, title: event.target.value } : row)) })} placeholder="Judul" className={inputClass} />
            <select value={item.type} onChange={(event) => set({ media_links: form.media_links.map((row, i) => (i === index ? { ...row, type: event.target.value } : row)) })} className={inputClass}>
              {Object.entries(HBL_MEDIA_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input type="url" value={item.url} onChange={(event) => set({ media_links: form.media_links.map((row, i) => (i === index ? { ...row, url: event.target.value } : row)) })} placeholder="https://..." className={inputClass} />
            <button type="button" title="Hapus" onClick={() => set({ media_links: form.media_links.filter((_, i) => i !== index) })} className="rounded-md border px-2 text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => set({ media_links: [...form.media_links, { title: "", type: "youtube", url: "" }] })} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Tambah {pattern.usesCpElements ? "media" : "materi"}</button>
      </Section>

      <Section step={4} title="Lembar kerja & home project" hint="Opsional. Keluarga mengunggah hasil home project dari portal.">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <input value={form.worksheet_title} onChange={(event) => set({ worksheet_title: event.target.value })} placeholder="Judul lembar kerja" className={inputClass} />
            <input type="url" value={form.worksheet_url} onChange={(event) => set({ worksheet_url: event.target.value })} placeholder="Tautan (Google Drive/PDF)" className={inputClass} />
            <textarea value={form.worksheet_instructions} onChange={(event) => set({ worksheet_instructions: event.target.value })} rows={2} placeholder="Cara mengerjakan" className={areaClass} />
          </div>
          <div className="space-y-2">
            <input value={form.project_title} onChange={(event) => set({ project_title: event.target.value })} placeholder="Judul home project" className={inputClass} />
            <input type="date" value={form.project_due_date} onChange={(event) => set({ project_due_date: event.target.value })} className={inputClass} />
            <textarea value={form.project_instructions} onChange={(event) => set({ project_instructions: event.target.value })} rows={2} placeholder="Instruksi project bersama keluarga" className={areaClass} />
          </div>
        </div>
      </Section>

      <Section step={5} title="Publikasi">
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <input type="checkbox" checked={form.publish} onChange={(event) => set({ publish: event.target.checked })} className="mt-0.5 accent-primary" />
          <span><span className="font-semibold">Terbitkan ke orang tua</span><span className="block text-xs text-muted-foreground">Orang tua mendapat notifikasi. Biarkan tidak dicentang untuk menyimpan sebagai draf.</span></span>
        </label>
        <p className="text-xs text-muted-foreground">{pattern.activity.plural} ditambahkan dari detail pertemuan setelah disimpan.</p>
      </Section>

      <button disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Pertemuan</button>
    </form>
  );
};
