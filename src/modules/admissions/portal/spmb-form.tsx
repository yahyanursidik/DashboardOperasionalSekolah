/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Loader2, Save, Send, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabaseClient, supabasePublicClient } from "../../../lib/supabase/client";
import { getAdmissionStatus } from "../admissions-config";
import { admissionEntryTypeMeta, entryTypeLabel, isAdmissionQuotaSchemaError } from "../quota-utils";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;
const publicDb = supabasePublicClient as any;
const emptyForm = {
  unit_id: "",
  batch_id: "",
  desired_class_id: "",
  entry_type: "new",
  name: "",
  nik: "",
  nisn: "",
  gender: "L",
  birth_place: "",
  dob: "",
  desired_grade: "",
  previous_school: "",
  parent_name: "",
  parent_phone: "",
  parent_email: "",
  family_card_number: "",
  address: "",
};

export const SpmbForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, applicant, refreshApplicant } = useSpmbPortal();
  const [form, setForm] = useState(emptyForm);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [referenceTime, setReferenceTime] = useState(0);
  const [saving, setSaving] = useState<"draft" | "submitted" | null>(null);
  const status = applicant ? getAdmissionStatus(applicant) : "draft";
  const editable = !applicant || ["draft", "submitted", "documents_review"].includes(status);

  const loadOptions = async () => {
    setLoading(true);
    setOptionsError("");
    setReferenceTime(Date.now());
    const { data, error } = await publicDb.rpc("admission_public_quota_options");
    setOptions(error ? [] : data || []);
    setSchemaMissing(isAdmissionQuotaSchemaError(error));
    setOptionsError(error && !isAdmissionQuotaSchemaError(error) ? error.message || "Layanan SPMB tidak dapat dihubungi." : "");
    setLoading(false);
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    if (!applicant) {
      setForm((value) => ({
        ...value,
        parent_name: user.user_metadata?.full_name || "",
        parent_phone: user.user_metadata?.phone || "",
        parent_email: user.email || "",
      }));
      return;
    }
    setForm(Object.fromEntries(Object.keys(emptyForm).map((key) => [key, applicant[key] ?? (emptyForm as any)[key]])) as typeof emptyForm);
  }, [applicant, user]);

  const activeOptions = useMemo(() => options.filter((row) => referenceTime > 0 && new Date(row.registration_start_at).getTime() <= referenceTime && new Date(row.registration_end_at).getTime() >= referenceTime), [options, referenceTime]);
  const units = useMemo(() => Array.from(new Map(activeOptions.map((row) => [row.unit_id, row])).values()).sort((a: any, b: any) => String(a.unit_name).localeCompare(String(b.unit_name))), [activeOptions]);
  const batches = useMemo(() => Array.from(new Map(activeOptions.filter((row) => row.unit_id === form.unit_id).map((row) => [row.batch_id, row])).values()), [activeOptions, form.unit_id]);
  const entryTypes = useMemo(() => Array.from(new Set(activeOptions.filter((row) => row.batch_id === form.batch_id).map((row) => row.entry_type || "new"))), [activeOptions, form.batch_id]);
  const targets = useMemo(() => activeOptions.filter((row) => row.unit_id === form.unit_id && row.batch_id === form.batch_id && row.entry_type === form.entry_type), [activeOptions, form.unit_id, form.batch_id, form.entry_type]);
  const selectedOption = useMemo(() => options.find((row) => row.batch_id === form.batch_id && row.class_id === form.desired_class_id && row.entry_type === form.entry_type), [options, form]);
  const selectedUnit = units.find((row: any) => row.unit_id === form.unit_id);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (target: "draft" | "submitted") => {
    if (!form.unit_id || !form.batch_id || !form.desired_class_id || !form.name || !form.nik || !form.dob || !form.parent_name || !form.parent_phone || !form.address) {
      toast.error("Lengkapi seluruh kolom wajib sebelum menyimpan.");
      return;
    }
    if (form.entry_type === "transfer" && !form.previous_school.trim()) {
      toast.error("Asal sekolah wajib diisi untuk siswa pindahan.");
      return;
    }
    if (!selectedOption) {
      toast.error("Pilih kelas tujuan yang masih dibuka pada gelombang ini.");
      return;
    }
    if (Number(selectedOption.remaining_count) <= 0 && !selectedOption.allow_waitlist) {
      toast.error("Kuota tujuan sudah penuh dan tidak membuka daftar tunggu.");
      return;
    }
    setSaving(target);
    const payload = {
      ...form,
      desired_grade: Number(selectedOption.grade_level),
      user_id: user.id,
      unit_id: selectedOption.unit_id,
      academic_year_id: selectedOption.academic_year_id,
      unit: selectedOption.unit_name,
      academic_year: selectedOption.academic_year_name,
      workflow_status: target,
      submitted_at: target === "submitted" ? new Date().toISOString() : applicant?.submitted_at || null,
    };
    const query = applicant ? db.from("admissions_applicants").update(payload).eq("id", applicant.id) : db.from("admissions_applicants").insert(payload);
    const { error } = await query;
    setSaving(null);
    if (error) {
      toast.error(`Formulir belum dapat disimpan: ${error.message}`);
      return;
    }
    await refreshApplicant();
    toast.success(target === "submitted" ? "Pendaftaran dikirim ke panitia." : "Draf pendaftaran tersimpan.");
    navigate("/spmb");
  };

  if (loading) return <div className="py-24 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  const inputClass = "w-full h-11 px-3 border rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500";
  return <div className="max-w-4xl mx-auto space-y-6">
    <div>
      <p className="text-sm font-semibold text-emerald-700">SPMB</p>
      <h1 className="text-2xl sm:text-3xl font-bold">Formulir Calon Murid</h1>
      <p className="text-slate-600 mt-2">Pilih unit tujuan terlebih dahulu agar gelombang, kelas, dan kuota yang tampil sesuai layanan sekolah.</p>
    </div>
    {!editable && <Notice tone="blue" icon={CheckCircle2}>Formulir telah dikunci karena proses verifikasi berlangsung. Hubungi panitia bila ada data yang perlu dikoreksi.</Notice>}
    {schemaMissing && <Notice tone="amber" icon={AlertCircle}>Layanan kuota kelas belum aktif. Panitia perlu menyelesaikan pembaruan sistem SPMB.</Notice>}
    {optionsError && <div className="flex flex-col gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"><span className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0" />Data tujuan pendaftaran belum dapat dimuat: {optionsError}</span><button type="button" onClick={() => void loadOptions()} className="h-9 shrink-0 rounded-md border border-rose-300 bg-white px-3 font-semibold">Coba lagi</button></div>}
    {activeOptions.length === 0 && !applicant && !schemaMissing && !optionsError && <Notice tone="amber" icon={AlertCircle}>Belum ada unit, kelas, dan kuota pendaftaran yang dibuka. Panitia perlu membagi kuota pada Pengaturan SPMB.</Notice>}

    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="font-bold text-lg">Tujuan Pendaftaran</h2>
        <p className="text-sm text-slate-600 mt-1">Satu formulir untuk seluruh unit. Pilihan berikutnya mengikuti unit dan gelombang yang dipilih.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-semibold sm:col-span-2">
          Unit tujuan *
          <select className={`${inputClass} mt-2`} value={form.unit_id} onChange={(e) => setForm((value) => ({ ...value, unit_id: e.target.value, batch_id: "", desired_class_id: "" }))} disabled={!editable || Boolean(applicant)}>
            <option value="">Pilih unit tujuan</option>
            {units.map((unit: any) => <option key={unit.unit_id} value={unit.unit_id}>{unit.unit_name}</option>)}
          </select>
        </label>

        {form.unit_id && <label className="text-sm font-semibold sm:col-span-2">
          Tahun ajaran dan gelombang *
          <select className={`${inputClass} mt-2`} value={form.batch_id} onChange={(e) => {
            const firstOption = activeOptions.find((row) => row.batch_id === e.target.value);
            setForm((value) => ({ ...value, batch_id: e.target.value, desired_class_id: "", entry_type: firstOption?.entry_type || value.entry_type }));
          }} disabled={!editable || Boolean(applicant)}>
            <option value="">Pilih gelombang aktif</option>
            {batches.map((batch: any) => <option key={batch.batch_id} value={batch.batch_id}>{batch.academic_year_name} - {batch.batch_name}</option>)}
          </select>
        </label>}

        {form.unit_id && batches.length === 0 && <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Unit ini belum memiliki gelombang dan kuota aktif. Panitia perlu menerbitkan konfigurasi pada Pengaturan SPMB.</div>}

        {form.batch_id && <label className="text-sm font-semibold">
          Jalur masuk *
          <select className={`${inputClass} mt-2`} value={form.entry_type} onChange={(e) => setForm((value) => ({ ...value, entry_type: e.target.value, desired_class_id: "" }))} disabled={!editable}>
            {entryTypes.includes("new") && <option value="new">Siswa baru</option>}
            {entryTypes.includes("transfer") && <option value="transfer">Siswa pindahan</option>}
          </select>
          <span className="block text-xs font-normal text-slate-500 mt-2">{admissionEntryTypeMeta[form.entry_type as "new" | "transfer"].description}</span>
        </label>}

        {form.batch_id && <label className="text-sm font-semibold">
          Kelas tujuan *
          <select className={`${inputClass} mt-2`} value={form.desired_class_id} onChange={(e) => set("desired_class_id", e.target.value)} disabled={!editable || !form.batch_id}>
            <option value="">Pilih kelas tujuan</option>
            {targets.map((target) => {
              const full = Number(target.remaining_count) <= 0;
              return <option key={target.quota_id} value={target.class_id} disabled={full && !target.allow_waitlist}>{target.class_name} - {full ? target.allow_waitlist ? "penuh, daftar tunggu" : "penuh" : `${target.remaining_count} kursi tersisa`}</option>;
            })}
          </select>
        </label>}
      </div>

      {form.unit_id && !form.batch_id && <div className="rounded-md border bg-slate-50 p-4 flex gap-3 text-sm text-slate-700">
        <Building2 className="w-5 h-5 shrink-0 text-emerald-700" />
        <div>
          <p className="font-bold text-slate-900">{selectedUnit?.unit_name || "Unit dipilih"}</p>
          <p className="mt-1">Lanjutkan dengan memilih gelombang aktif agar sistem dapat menampilkan kelas dan kuota yang benar.</p>
        </div>
      </div>}

      {selectedOption && <div className={`rounded-md border p-4 flex gap-3 ${Number(selectedOption.remaining_count) > 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <UsersRound className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold">{selectedOption.unit_name} - {selectedOption.class_name} - {entryTypeLabel(form.entry_type)}</p>
          <p className="text-sm mt-1">{selectedOption.remaining_count} dari {selectedOption.quota} kursi masih tersedia.{Number(selectedOption.remaining_count) <= 0 && selectedOption.allow_waitlist ? " Formulir tetap dapat dikirim sebagai antrean; penerimaan menunggu kursi tersedia." : ""}</p>
        </div>
      </div>}
    </section>

    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5"><h2 className="font-bold text-lg">Identitas Calon Murid</h2><div className="grid sm:grid-cols-2 gap-4">
      {([["name", "Nama lengkap *", "text"], ["nik", "NIK *", "text"], ["nisn", "NISN (bila sudah ada)", "text"], ["birth_place", "Tempat lahir", "text"], ["dob", "Tanggal lahir *", "date"], ["previous_school", form.entry_type === "transfer" ? "Asal sekolah *" : "Asal sekolah / lembaga", "text"]] as const).map(([key, label, type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={!editable} /></label>)}
      <label className="text-sm font-semibold">Jenis kelamin *<select className={`${inputClass} mt-2`} value={form.gender} onChange={(e) => set("gender", e.target.value)} disabled={!editable}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
    </div></section>
    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5"><h2 className="font-bold text-lg">Orang Tua / Wali dan Domisili</h2><div className="grid sm:grid-cols-2 gap-4">{([["parent_name", "Nama orang tua / wali *", "text"], ["parent_phone", "Nomor WhatsApp *", "tel"], ["parent_email", "Email", "email"], ["family_card_number", "Nomor Kartu Keluarga", "text"]] as const).map(([key, label, type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={!editable} /></label>)}<label className="text-sm font-semibold sm:col-span-2">Alamat lengkap *<textarea className="w-full min-h-24 mt-2 p-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100" value={form.address} onChange={(e) => set("address", e.target.value)} disabled={!editable} /></label></div></section>
    {editable && <div className="flex flex-col-reverse sm:flex-row justify-end gap-3"><button type="button" onClick={() => save("draft")} disabled={Boolean(saving) || schemaMissing} className="h-11 px-5 border rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />Simpan Draf</button><button type="button" onClick={() => save("submitted")} disabled={Boolean(saving) || schemaMissing} className="h-11 px-5 bg-emerald-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{saving === "submitted" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Kirim ke Panitia</button></div>}
  </div>;
};

const Notice = ({ tone, icon: Icon, children }: { tone: "blue" | "amber"; icon: React.ElementType; children: React.ReactNode }) => <div className={`flex gap-3 border p-4 rounded-md text-sm ${tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><Icon className="w-5 h-5 shrink-0" />{children}</div>;
