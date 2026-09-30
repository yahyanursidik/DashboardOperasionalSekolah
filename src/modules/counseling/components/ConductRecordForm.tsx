/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { kindLabels, type ConductKind } from "../conduct-config";

const db = supabaseClient as any;

interface ConductRecordFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Restrict selectable classes (teacher portal); all classes when omitted. */
  classIds?: string[] | null;
}

const inputClass = "mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";
const CUSTOM = "__custom__";

export const ConductRecordForm: React.FC<ConductRecordFormProps> = ({ open, onClose, onSaved, classIds }) => {
  const [kind, setKind] = useState<ConductKind>("violation");
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("0");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [shareWithParents, setShareWithParents] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      let classQuery = db.from("classes").select("id, name, units(name)").order("name");
      if (classIds) classQuery = classQuery.in("id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);
      const [classResult, ruleResult] = await Promise.all([
        classQuery,
        db.from("conduct_rules").select("id, kind, category, name, points, severity").eq("is_active", true).order("category").order("points"),
      ]);
      if (cancelled) return;
      setClasses(classResult.data || []);
      setRules(ruleResult.data || []);
    })();
    return () => { cancelled = true; };
  }, [open, classIds]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void db.from("students").select("id, full_name, nis").eq("class_id", classId).eq("status", "active").order("full_name")
      .then(({ data }: any) => { if (!cancelled) setStudents(data || []); });
    return () => { cancelled = true; };
  }, [classId]);

  const kindRules = useMemo(() => rules.filter((rule) => rule.kind === kind), [rules, kind]);
  const selectedRule = kindRules.find((rule) => rule.id === ruleId);
  const isCustom = ruleId === CUSTOM;

  const reset = () => {
    setStudentId(""); setRuleId(""); setTitle(""); setPoints("0"); setDescription(""); setShareWithParents(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalTitle = isCustom ? title.trim() : selectedRule?.name;
    const finalPoints = isCustom ? Number(points) : Number(selectedRule?.points || 0);
    if (!studentId || !finalTitle) return toast.error("Pilih siswa dan jenis kejadian.");
    if (!Number.isFinite(finalPoints) || finalPoints < 0 || finalPoints > 1000) return toast.error("Poin harus 0–1000.");
    setSaving(true);
    const { error } = await db.from("conduct_records").insert({
      student_id: studentId,
      class_id: classId || null,
      rule_id: isCustom ? null : ruleId,
      kind,
      title: finalTitle,
      points: finalPoints,
      incident_date: incidentDate,
      description: description.trim() || null,
      visibility: shareWithParents ? "parents" : "internal",
    });
    setSaving(false);
    if (error) return toast.error("Catatan belum tersimpan", { description: error.message });
    toast.success(shareWithParents ? "Catatan tersimpan dan orang tua diberi notifikasi." : "Catatan internal tersimpan.");
    reset();
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="conduct-form-title">
      <form onSubmit={(event) => void submit(event)} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="conduct-form-title" className="text-lg font-semibold">Catat Kejadian Siswa</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(kindLabels) as ConductKind[]).map((value) => (
              <button key={value} type="button" onClick={() => { setKind(value); setRuleId(""); }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${kind === value ? (value === "violation" ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-800") : "text-muted-foreground"}`}>
                {kindLabels[value]}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Kelas
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className={inputClass} required>
                <option value="">Pilih kelas</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.units?.name ? ` · ${item.units.name}` : ""}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Siswa
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass} required disabled={!classId}>
                <option value="">{classId ? "Pilih siswa" : "Pilih kelas dulu"}</option>
                {students.map((item) => <option key={item.id} value={item.id}>{item.full_name}{item.nis ? ` (${item.nis})` : ""}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">Jenis {kind === "violation" ? "pelanggaran" : "prestasi"}
            <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className={inputClass} required>
              <option value="">Pilih dari katalog</option>
              {kindRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.category} · {rule.name} ({rule.points} poin)</option>)}
              <option value={CUSTOM}>Lainnya (isi manual)</option>
            </select>
          </label>
          {isCustom && (
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <label className="text-sm font-medium">Uraian singkat<input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required maxLength={200} /></label>
              <label className="text-sm font-medium">Poin<input type="number" min={0} max={1000} value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass} required /></label>
            </div>
          )}
          <label className="block text-sm font-medium">Tanggal kejadian
            <input type="date" value={incidentDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setIncidentDate(e.target.value)} className={inputClass} required />
          </label>
          <label className="block text-sm font-medium">Kronologi / keterangan
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} placeholder="Apa yang terjadi, di mana, dan siapa saksi (opsional)" />
          </label>
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={shareWithParents} onChange={(e) => setShareWithParents(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span><span className="font-medium">Bagikan ke orang tua</span><span className="mt-0.5 block text-xs text-muted-foreground">Tampil di portal orang tua dan dikirim sebagai notifikasi. Matikan untuk catatan internal BK.</span></span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium">Batal</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </button>
        </div>
      </form>
    </div>
  );
};
