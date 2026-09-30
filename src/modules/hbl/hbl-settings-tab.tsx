/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { HBL_STATUS_LABELS, normalizePreschoolLevel } from "./hbl-config";
import { patternForUnit, type HblPattern } from "./hbl-patterns";

const db = supabaseClient as any;
const inputClass = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground disabled:opacity-60";

export const HblSettingsTab: React.FC<{
  program: any; pattern: HblPattern; classes: any[]; roster: any[]; canManagePrograms: boolean; onChanged: () => void | Promise<void>;
}> = ({ program, pattern, classes, roster, canManagePrograms, onChanged }) => {
  const [form, setForm] = useState({ name: program.name || "", parent_welcome: program.parent_welcome || "", description: program.description || "" });
  const [saving, setSaving] = useState(false);

  const saveInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await db.from("hbl_programs").update({ name: form.name.trim(), parent_welcome: form.parent_welcome.trim() || null, description: form.description.trim() || null }).eq("id", program.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Informasi program disimpan.");
    await onChanged();
  };
  const setStatus = async (status: string) => {
    const { error } = await db.from("hbl_programs").update({ status }).eq("id", program.id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Program terlihat di portal orang tua." : `Program menjadi ${HBL_STATUS_LABELS[status].toLowerCase()}.`);
    await onChanged();
  };
  const linkClass = async (classId: string) => {
    const classItem = classes.find((item) => item.id === classId);
    const nextPattern = classItem ? patternForUnit(classItem.units) : pattern;
    if (classItem && nextPattern.id !== pattern.id && !window.confirm(`Kelas ini memakai pola ${nextPattern.label}. Ubah pola program?`)) return;
    const { error } = await db.from("hbl_programs").update({
      class_id: classId || null,
      ...(classItem ? {
        unit_id: classItem.unit_id,
        journey_mode: nextPattern.journeyMode,
        preschool_level: nextPattern.id === "preschool_thematic" ? normalizePreschoolLevel(classItem.level, classItem.name) || null : null,
      } : {}),
    }).eq("id", program.id);
    if (error) return toast.error(error.message);
    toast.success(classId ? "Kelas ditautkan; peserta mengikuti daftar kelas." : "Tautan kelas dilepas.");
    await onChanged();
  };
  const sync = async () => {
    const { data, error } = await db.rpc("hbl_sync_program_students", { p_program_id: program.id });
    if (error) return toast.error(error.message);
    toast.success(`Peserta disinkronkan: +${data?.added ?? 0} / -${data?.removed ?? 0}.`);
    await onChanged();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={saveInfo} className="space-y-3 rounded-xl border bg-card p-5">
        <h3 className="font-bold">Informasi program</h3>
        <label className="block text-xs font-semibold text-muted-foreground">Nama program<input required minLength={3} disabled={!canManagePrograms} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></label>
        <label className="block text-xs font-semibold text-muted-foreground">Sambutan untuk orang tua
          <textarea disabled={!canManagePrograms} value={form.parent_welcome} onChange={(event) => setForm({ ...form, parent_welcome: event.target.value })} rows={3} placeholder="Tampil di bagian atas halaman Homebased Learning orang tua" className="mt-1 w-full rounded-md border bg-background p-3 text-sm font-normal text-foreground disabled:opacity-60" />
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">Catatan internal
          <textarea disabled={!canManagePrograms} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} className="mt-1 w-full rounded-md border bg-background p-3 text-sm font-normal text-foreground disabled:opacity-60" />
        </label>
        {canManagePrograms ? (
          <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan</button>
        ) : (
          <p className="text-xs text-muted-foreground">Informasi program diatur oleh admin sekolah.</p>
        )}
      </form>

      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="font-bold">Kelas & visibilitas</h3>
          <label className="block text-xs font-semibold text-muted-foreground">Kelas peserta
            <select disabled={!canManagePrograms} value={program.class_id || ""} onChange={(event) => void linkClass(event.target.value)} className={inputClass}>
              <option value="">Belum ditautkan</option>
              {(canManagePrograms ? classes : program.classes ? [{ ...program.classes, units: program.units }] : []).map((item: any) => <option key={item.id} value={item.id}>{item.name} · {item.units?.name}</option>)}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">Pola belajar: <strong>{pattern.label}</strong> (mengikuti jenjang unit kelas).</p>
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-semibold">Status: {program.status === "published" ? "Terlihat di portal orang tua" : HBL_STATUS_LABELS[program.status]}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Orang tua melihat program terbit beserta {pattern.group.plural.toLowerCase()} dan pertemuan yang juga terbit.</p>
            {canManagePrograms && (
              <div className="mt-2 flex flex-wrap gap-2">
                {program.status !== "published" && <button type="button" onClick={() => void setStatus("published")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Terbitkan ke orang tua</button>}
                {program.status === "published" && <button type="button" onClick={() => void setStatus("draft")} className="rounded-md border px-3 py-1.5 text-xs font-bold">Sembunyikan (draf)</button>}
                {program.status !== "archived" && <button type="button" onClick={() => void setStatus("archived")} className="rounded-md border px-3 py-1.5 text-xs font-bold text-muted-foreground">Arsipkan</button>}
              </div>
            )}
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Peserta ({roster.length})</h3>
            {program.class_id && <button type="button" onClick={() => void sync()} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /> Sinkronkan</button>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Otomatis mengikuti siswa aktif di kelas {program.classes?.name || "yang ditautkan"}.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {roster.map((student) => <span key={student.id} className="rounded bg-muted px-2 py-1 text-xs">{student.full_name}</span>)}
            {!roster.length && <span className="text-xs text-muted-foreground">Belum ada peserta.</span>}
          </div>
        </section>
      </div>
    </div>
  );
};
