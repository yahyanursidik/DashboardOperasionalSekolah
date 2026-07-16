/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { getAdmissionStatus } from "../admissions-config";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;
const emptyForm = { batch_id: "", name: "", nik: "", nisn: "", gender: "L", birth_place: "", dob: "", desired_grade: "1", previous_school: "", parent_name: "", parent_phone: "", parent_email: "", family_card_number: "", address: "" };

export const SpmbForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, applicant, refreshApplicant } = useSpmbPortal();
  const [form, setForm] = useState(emptyForm);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "submitted" | null>(null);
  const status = applicant ? getAdmissionStatus(applicant) : "draft";
  const editable = !applicant || ["draft", "submitted", "documents_review"].includes(status);

  useEffect(() => {
    Promise.all([
      db.from("admission_batches").select("*, units(id,name), academic_years(id,name)").eq("status", "published").lte("registration_start_at", new Date().toISOString()).gte("registration_end_at", new Date().toISOString()).order("registration_end_at"),
    ]).then(([batchResult]) => { setBatches(batchResult.data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!applicant) {
      setForm((value) => ({ ...value, parent_name: user.user_metadata?.full_name || "", parent_phone: user.user_metadata?.phone || "", parent_email: user.email || "" }));
      return;
    }
    setForm(Object.fromEntries(Object.keys(emptyForm).map((key) => [key, applicant[key] ?? (emptyForm as any)[key]])) as typeof emptyForm);
  }, [applicant, user]);

  const selectedBatch = useMemo(() => batches.find((batch) => batch.id === form.batch_id), [batches, form.batch_id]);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (target: "draft" | "submitted") => {
    if (!form.batch_id || !form.name || !form.nik || !form.dob || !form.parent_name || !form.parent_phone || !form.address) {
      toast.error("Lengkapi seluruh kolom wajib sebelum menyimpan."); return;
    }
    if (!selectedBatch) { toast.error("Pilih gelombang pendaftaran yang masih aktif."); return; }
    setSaving(target);
    const payload = {
      ...form,
      desired_grade: Number(form.desired_grade),
      user_id: user.id,
      unit_id: selectedBatch.unit_id,
      academic_year_id: selectedBatch.academic_year_id,
      unit: selectedBatch.units?.name || "",
      academic_year: selectedBatch.academic_years?.name || "",
      workflow_status: target,
      submitted_at: target === "submitted" ? new Date().toISOString() : applicant?.submitted_at || null,
    };
    const query = applicant ? db.from("admissions_applicants").update(payload).eq("id", applicant.id) : db.from("admissions_applicants").insert(payload);
    const { error } = await query;
    setSaving(null);
    if (error) { toast.error(`Formulir belum dapat disimpan: ${error.message}`); return; }
    await refreshApplicant();
    toast.success(target === "submitted" ? "Pendaftaran dikirim ke panitia." : "Draf pendaftaran tersimpan.");
    navigate("/spmb");
  };

  if (loading) return <div className="py-24 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;

  const inputClass = "w-full h-11 px-3 border rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500";
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><p className="text-sm font-semibold text-emerald-700">SPMB</p><h1 className="text-2xl sm:text-3xl font-bold">Formulir Calon Murid</h1><p className="text-slate-600 mt-2">Data ini menjadi dasar verifikasi, seleksi, dan pembentukan profil siswa saat diterima.</p></div>
      {!editable && <div className="flex gap-3 border border-blue-200 bg-blue-50 p-4 rounded-md text-sm text-blue-900"><CheckCircle2 className="w-5 h-5 shrink-0" />Formulir telah dikunci karena proses verifikasi berlangsung. Hubungi panitia bila ada data yang perlu dikoreksi.</div>}
      {batches.length === 0 && !applicant && <div className="flex gap-3 border border-amber-200 bg-amber-50 p-4 rounded-md text-sm text-amber-900"><AlertCircle className="w-5 h-5 shrink-0" />Belum ada gelombang pendaftaran aktif. Panitia perlu menerbitkan gelombang pada Pengaturan SPMB.</div>}

      <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5">
        <h2 className="font-bold text-lg">Tujuan Pendaftaran</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Unit, tahun ajaran, dan gelombang *<select className={`${inputClass} mt-2`} value={form.batch_id} onChange={(e) => set("batch_id", e.target.value)} disabled={!editable || Boolean(applicant)} required><option value="">Pilih gelombang aktif</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.units?.name} · {batch.academic_years?.name} · {batch.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Tingkat kelas tujuan *<input className={`${inputClass} mt-2`} type="number" min="0" max="12" value={form.desired_grade} onChange={(e) => set("desired_grade", e.target.value)} disabled={!editable} required /></label>
        </div>
      </section>

      <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5">
        <h2 className="font-bold text-lg">Identitas Calon Murid</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {([ ["name","Nama lengkap *","text"], ["nik","NIK *","text"], ["nisn","NISN (bila sudah ada)","text"], ["birth_place","Tempat lahir","text"], ["dob","Tanggal lahir *","date"], ["previous_school","Asal sekolah / lembaga","text"] ] as const).map(([key,label,type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e) => set(key,e.target.value)} disabled={!editable} required={label.includes("*")} /></label>)}
          <label className="text-sm font-semibold">Jenis kelamin *<select className={`${inputClass} mt-2`} value={form.gender} onChange={(e) => set("gender",e.target.value)} disabled={!editable}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
        </div>
      </section>

      <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5">
        <h2 className="font-bold text-lg">Orang Tua / Wali dan Domisili</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {([ ["parent_name","Nama orang tua / wali *","text"], ["parent_phone","Nomor WhatsApp *","tel"], ["parent_email","Email","email"], ["family_card_number","Nomor Kartu Keluarga","text"] ] as const).map(([key,label,type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e) => set(key,e.target.value)} disabled={!editable} required={label.includes("*")} /></label>)}
          <label className="text-sm font-semibold sm:col-span-2">Alamat lengkap *<textarea className="w-full min-h-24 mt-2 p-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100" value={form.address} onChange={(e) => set("address",e.target.value)} disabled={!editable} required /></label>
        </div>
      </section>

      {editable && <div className="flex flex-col-reverse sm:flex-row justify-end gap-3"><button type="button" onClick={() => save("draft")} disabled={Boolean(saving)} className="h-11 px-5 border rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-slate-50"><Save className="w-4 h-4" />Simpan Draf</button><button type="button" onClick={() => save("submitted")} disabled={Boolean(saving)} className="h-11 px-5 bg-emerald-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-emerald-800">{saving === "submitted" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Kirim ke Panitia</button></div>}
    </div>
  );
};
