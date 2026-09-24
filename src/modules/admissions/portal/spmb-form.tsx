/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, Save, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabaseClient, supabasePublicClient } from "../../../lib/supabase/client";
import { detectBrowserTimeZone, isOnlinePreschoolProgram, isValidTimeZone } from "../../../lib/timezones";
import { getAdmissionStatus } from "../admissions-config";
import { getAdmissionProgramProfile, getAdmissionProfileFields, type AdmissionProfileField } from "../admission-program-profile";
import { LearningTimezoneFields } from "../components/learning-timezone-fields";
import { IndonesiaDomicileSuggest } from "../components/indonesia-domicile-suggest";
import { admissionEntryTypeMeta, entryTypeLabel, isAdmissionQuotaSchemaError } from "../quota-utils";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;
const publicDb = supabasePublicClient as any;
const REQUEST_TIMEOUT_MS = 15000;
type SupabaseResult<T = any> = { data: T | null; error: any };
const withTimeout = async <T,>(promise: Promise<T>, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const nullIfBlank = (value?: string | null) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};
const loadQuotaOptions = async (): Promise<SupabaseResult<any[]>> => {
  try {
    return await withTimeout<SupabaseResult<any[]>>(publicDb.rpc("admission_public_quota_options"), "Layanan SPMB terlalu lama merespons. Silakan coba lagi.");
  } catch (publicError) {
    const fallback = await withTimeout<SupabaseResult<any[]>>(db.rpc("admission_public_quota_options"), "Layanan SPMB terlalu lama merespons. Silakan coba lagi.");
    if (fallback.error && !isAdmissionQuotaSchemaError(fallback.error)) {
      fallback.error.message = `${fallback.error.message} (public client: ${getErrorMessage(publicError, "gagal memuat")})`;
    }
    return fallback;
  }
};
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
  child_nickname: "",
  dob: "",
  desired_grade: "",
  previous_school: "",
  parent_name: "",
  parent_phone: "",
  parent_email: "",
  parent_occupation: "",
  parent_education_level: "",
  second_parent_name: "",
  second_parent_phone: "",
  second_parent_occupation: "",
  second_parent_education_level: "",
  family_card_number: "",
  address: "",
  domicile_regency: "",
  domicile_province: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  home_language: "",
  allergies: "",
  medical_notes: "",
  toilet_independence: "",
  pickup_contact_name: "",
  pickup_contact_phone: "",
  pickup_contact_relation: "",
  onsite_transport_plan: "",
  residence_country: "Indonesia",
  learning_timezone: detectBrowserTimeZone(),
  hbl_facilitator_name: "",
  hbl_facilitator_relation: "",
  hbl_device_ready: "",
  hbl_internet_ready: "",
  hbl_preferred_session: "",
  learning_support_notes: "",
  registration_fee_category: "regular",
  staff_employee_nik: "",
  admission_profile: {} as Record<string, string>,
};

const getInitialForm = (applicant: any | null, user: any) => {
  if (applicant) {
    const values = Object.fromEntries(
      Object.keys(emptyForm).map((key) => [key, applicant[key] ?? (emptyForm as any)[key]]),
    ) as typeof emptyForm;
    return {
      ...values,
      hbl_device_ready: applicant.hbl_device_ready === true ? "ready" : applicant.hbl_device_ready === false ? "need_support" : values.hbl_device_ready,
      hbl_internet_ready: applicant.hbl_internet_ready === true ? "ready" : applicant.hbl_internet_ready === false ? "need_support" : values.hbl_internet_ready,
      admission_profile: applicant.admission_profile && typeof applicant.admission_profile === "object" && !Array.isArray(applicant.admission_profile) ? applicant.admission_profile : {},
    };
  }

  return {
    ...emptyForm,
    parent_name: user.user_metadata?.full_name || "",
    parent_phone: user.user_metadata?.phone || "",
    parent_email: user.email || "",
  };
};

const parentEducationOptions = [
  "Tidak/belum sekolah", "SD/sederajat", "SMP/sederajat", "SMA/SMK/sederajat", "Diploma I/II/III", "Diploma IV/Sarjana (S1)", "Profesi", "Magister (S2)", "Doktor (S3)", "Lainnya",
];

export const SpmbForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, applicant, refreshApplicants } = useSpmbPortal();
  // The form is initialized once when the page opens. Auth token refreshes may
  // replace the user object, but must never overwrite data currently being typed.
  const [form, setForm] = useState(() => getInitialForm(applicant, user));
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [referenceTime, setReferenceTime] = useState(0);
  const [saving, setSaving] = useState<"draft" | "continue" | null>(null);
  const status = applicant ? getAdmissionStatus(applicant) : "draft";
  const editable = !applicant || ["draft", "documents_review"].includes(status);

  const loadOptions = async () => {
    setLoading(true);
    setOptionsError("");
    setReferenceTime(Date.now());
    try {
      const { data, error } = await loadQuotaOptions();
      const missing = isAdmissionQuotaSchemaError(error);
      setOptions(error ? [] : data || []);
      setSchemaMissing(missing);
      setOptionsError(error && !missing ? error.message || "Layanan SPMB tidak dapat dihubungi." : "");
    } catch (error) {
      setOptions([]);
      setSchemaMissing(false);
      setOptionsError(getErrorMessage(error, "Layanan SPMB tidak dapat dihubungi."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  const activeOptions = useMemo(() => options.filter((row) => referenceTime > 0 && new Date(row.registration_start_at).getTime() <= referenceTime && new Date(row.registration_end_at).getTime() >= referenceTime), [options, referenceTime]);
  const units = useMemo(() => Array.from(new Map(activeOptions.map((row) => [row.unit_id, row])).values()).sort((a: any, b: any) => String(a.unit_name).localeCompare(String(b.unit_name))), [activeOptions]);
  const batches = useMemo(() => Array.from(new Map(activeOptions.filter((row) => row.unit_id === form.unit_id).map((row) => [row.batch_id, row])).values()), [activeOptions, form.unit_id]);
  const entryTypes = useMemo(() => Array.from(new Set(activeOptions.filter((row) => row.batch_id === form.batch_id).map((row) => row.entry_type || "new"))), [activeOptions, form.batch_id]);
  const targets = useMemo(() => activeOptions.filter((row) => row.unit_id === form.unit_id && row.batch_id === form.batch_id && row.entry_type === form.entry_type), [activeOptions, form.unit_id, form.batch_id, form.entry_type]);
  const selectedOption = useMemo(() => options.find((row) => row.batch_id === form.batch_id && row.class_id === form.desired_class_id && row.entry_type === form.entry_type), [options, form]);
  const selectedUnit = units.find((row: any) => row.unit_id === form.unit_id);
  const requiresLearningTimezone = isOnlinePreschoolProgram(selectedOption || applicant || selectedUnit);
  const programProfile = getAdmissionProgramProfile(selectedOption || applicant || selectedUnit);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setAdmissionProfile = (key: string, value: string) => setForm((current) => ({ ...current, admission_profile: { ...current.admission_profile, [key]: value } }));

  const save = async (target: "draft" | "continue") => {
    if (!form.unit_id || !form.batch_id || !form.desired_class_id || !form.name || !form.nik || !form.dob || !form.parent_name || !form.parent_phone || !form.parent_education_level || !form.address || !form.domicile_regency || !form.domicile_province) {
      toast.error("Lengkapi seluruh kolom wajib sebelum menyimpan.");
      return;
    }
    if (form.second_parent_name.trim() && !form.second_parent_education_level) {
      toast.error("Pilih pendidikan terakhir orang tua kedua atau kosongkan nama orang tua kedua.");
      return;
    }
    if (form.entry_type === "transfer" && !form.previous_school.trim()) {
      toast.error("Asal sekolah wajib diisi untuk siswa pindahan.");
      return;
    }
    if (form.entry_type === "transfer" && !form.admission_profile.transfer_reason?.trim()) {
      toast.error("Isi alasan perpindahan sekolah untuk siswa pindahan.");
      return;
    }
    if (form.registration_fee_category === "foundation_staff" && !form.staff_employee_nik.trim()) {
      toast.error("Masukkan NIK pegawai yayasan untuk pengajuan tarif staf.");
      return;
    }
    if (requiresLearningTimezone && (!form.residence_country.trim() || !isValidTimeZone(form.learning_timezone))) {
      toast.error("Lengkapi negara domisili dan zona waktu siswa untuk penyesuaian pembelajaran online.");
      return;
    }
    if (requiresLearningTimezone && (!form.hbl_facilitator_name.trim() || !form.hbl_facilitator_relation.trim() || form.hbl_device_ready !== "ready" || form.hbl_internet_ready !== "ready")) {
      toast.error("Lengkapi pendamping belajar, kesiapan perangkat, dan koneksi internet untuk program HBL.");
      return;
    }
    if (!selectedOption) {
      toast.error("Pilih kelas tujuan yang masih dibuka pada gelombang ini.");
      return;
    }
    const missingProfileField = programProfile.fields.find((field) => field.required && !form.admission_profile[field.key]?.trim());
    if (missingProfileField) {
      toast.error(`Lengkapi ${missingProfileField.label.toLocaleLowerCase("id-ID")}.`);
      return;
    }
    if (Number(selectedOption.remaining_count) <= 0 && !selectedOption.allow_waitlist) {
      toast.error("Kuota tujuan sudah penuh dan tidak membuka daftar tunggu.");
      return;
    }
    setSaving(target);
    try {
      const payload = {
        ...form,
        residence_country: requiresLearningTimezone ? nullIfBlank(form.residence_country) : null,
        learning_timezone: requiresLearningTimezone ? nullIfBlank(form.learning_timezone) : null,
        toilet_independence: nullIfBlank(form.toilet_independence),
        onsite_transport_plan: nullIfBlank(form.onsite_transport_plan),
        registration_fee_category: form.registration_fee_category,
        staff_employee_nik: form.registration_fee_category === "foundation_staff" ? nullIfBlank(form.staff_employee_nik) : null,
        desired_grade: Number(selectedOption.grade_level),
        user_id: user.id,
        unit_id: selectedOption.unit_id,
        academic_year_id: selectedOption.academic_year_id,
        unit: selectedOption.unit_name,
        academic_year: selectedOption.academic_year_name,
        hbl_device_ready: requiresLearningTimezone ? form.hbl_device_ready === "ready" : null,
        hbl_internet_ready: requiresLearningTimezone ? form.hbl_internet_ready === "ready" : null,
        workflow_status: applicant?.workflow_status === "documents_review" ? "documents_review" : "draft",
        submitted_at: applicant?.submitted_at || null,
      };
      const query = applicant
        ? db.from("admissions_applicants").update(payload).eq("id", applicant.id).select("id").single()
        : db.from("admissions_applicants").insert(payload).select("id").single();
      const { data: savedApplicant, error } = await withTimeout<SupabaseResult<{ id: string }>>(query, "Formulir terlalu lama merespons saat disimpan. Silakan coba lagi.");
      if (error) {
        toast.error(`Formulir belum dapat disimpan: ${error.message}`);
        return;
      }
      const savedApplicantId = savedApplicant?.id || applicant?.id;
      await withTimeout(refreshApplicants(savedApplicantId), "Formulir tersimpan, tetapi ringkasan belum dapat dimuat ulang. Silakan refresh halaman.");
      toast.success(target === "continue" ? "Data awal tersimpan. Lanjutkan unggah berkas." : "Draf pendaftaran tersimpan.");
      navigate(target === "continue" ? "/spmb/documents" : "/spmb");
    } catch (error) {
      toast.error(getErrorMessage(error, "Formulir belum dapat disimpan."));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="py-24 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  const inputClass = "w-full h-11 px-3 border rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500";
  return <div className="max-w-4xl mx-auto space-y-6">
    <div>
      <p className="text-sm font-semibold text-emerald-700">SPMB</p>
      <h1 className="text-2xl sm:text-3xl font-bold">{applicant ? `Data awal ${applicant.name}` : "Data Awal Calon Murid"}</h1>
      <p className="text-slate-600 mt-2">Tahap 1 dari 4. Simpan data ini, unggah berkas dan bukti pembayaran, lalu kirim pendaftaran untuk diproses panitia.</p>
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

      {requiresLearningTimezone && <LearningTimezoneFields
        idPrefix="spmb-learning"
        country={form.residence_country}
        timeZone={form.learning_timezone}
        disabled={!editable}
        onCountryChange={(value) => set("residence_country", value)}
        onTimeZoneChange={(value) => set("learning_timezone", value)}
      />}
    </section>

    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5"><div><h2 className="font-bold text-lg">Identitas Calon Murid</h2><p className="mt-1 text-sm text-slate-600">Gunakan data yang sama dengan dokumen resmi yang akan diunggah pada tahap berikutnya.</p></div><div className="grid sm:grid-cols-2 gap-4">
      {([["name", "Nama lengkap *", "text"], ["child_nickname", "Nama panggilan", "text"], ["nik", "NIK *", "text"], ["nisn", "NISN (bila sudah ada)", "text"], ["birth_place", "Tempat lahir", "text"], ["dob", "Tanggal lahir *", "date"], ["previous_school", form.entry_type === "transfer" ? "Asal sekolah *" : "Asal sekolah / lembaga", "text"]] as const).map(([key, label, type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={!editable} /></label>)}
      <label className="text-sm font-semibold">Jenis kelamin *<select className={`${inputClass} mt-2`} value={form.gender} onChange={(e) => set("gender", e.target.value)} disabled={!editable}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
    </div></section>
    {form.entry_type === "transfer" && <ProgramProfileDetails title="Riwayat Perpindahan Sekolah" detail="Informasi ini membantu panitia menyiapkan proses pindahan dan menentukan kebutuhan penyesuaian anak." fields={getAdmissionProfileFields("transfer")} values={form.admission_profile} onChange={setAdmissionProfile} inputClass={inputClass} disabled={!editable} />}
    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5"><div><h2 className="font-bold text-lg">Orang Tua / Wali dan Domisili</h2><p className="mt-1 text-sm text-slate-600">Nomor WhatsApp utama dipakai panitia untuk pemberitahuan berkas, jadwal, dan hasil seleksi. Data domisili membantu penyesuaian layanan sekolah.</p></div><div className="grid sm:grid-cols-2 gap-4">{([["parent_name", "Nama orang tua / wali *", "text"], ["parent_phone", "Nomor WhatsApp utama *", "tel"], ["parent_email", "Email", "email"], ["parent_occupation", "Pekerjaan orang tua / wali", "text"], ["second_parent_name", "Nama orang tua kedua", "text"], ["second_parent_phone", "WhatsApp orang tua kedua", "tel"], ["second_parent_occupation", "Pekerjaan orang tua kedua", "text"], ["family_card_number", "Nomor Kartu Keluarga", "text"]] as const).map(([key, label, type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={!editable} /></label>)}<label className="text-sm font-semibold">Pendidikan terakhir orang tua / wali *<select className={`${inputClass} mt-2`} value={form.parent_education_level} onChange={(event) => set("parent_education_level", event.target.value)} disabled={!editable}><option value="">Pilih pendidikan terakhir</option>{parentEducationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="text-sm font-semibold">Pendidikan terakhir orang tua kedua {form.second_parent_name.trim() && "*"}<select className={`${inputClass} mt-2`} value={form.second_parent_education_level} onChange={(event) => set("second_parent_education_level", event.target.value)} disabled={!editable}><option value="">Pilih pendidikan terakhir</option>{parentEducationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><IndonesiaDomicileSuggest cityRegency={form.domicile_regency} province={form.domicile_province} inputClassName={inputClass} disabled={!editable} onCityRegencyChange={(value) => set("domicile_regency", value)} onProvinceChange={(value) => set("domicile_province", value)} /><label className="text-sm font-semibold sm:col-span-2">Alamat lengkap *<textarea className="w-full min-h-24 mt-2 p-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100" value={form.address} onChange={(e) => set("address", e.target.value)} disabled={!editable} /></label></div></section>
    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5"><div><h2 className="font-bold text-lg">Kesiapan, Kesehatan, dan Kontak Darurat</h2><p className="mt-1 text-sm text-slate-600">Informasi ini membantu sekolah menyiapkan pendampingan yang tepat dan tidak digunakan untuk keputusan seleksi.</p></div><div className="grid sm:grid-cols-2 gap-4">{([["emergency_contact_name", "Nama kontak darurat *", "text"], ["emergency_contact_phone", "Telepon kontak darurat *", "tel"], ["emergency_contact_relation", "Hubungan dengan anak *", "text"], ["home_language", "Bahasa yang biasa digunakan di rumah", "text"], ["allergies", "Alergi (tulis “Tidak ada” bila tidak ada)", "text"]] as const).map(([key,label,type]) => <label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e)=>set(key,e.target.value)} disabled={!editable} /></label>)}<label className="text-sm font-semibold sm:col-span-2">Catatan kesehatan / kebutuhan dukungan belajar<textarea className="w-full min-h-20 mt-2 p-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100" value={form.medical_notes} onChange={(e)=>set("medical_notes",e.target.value)} disabled={!editable} placeholder="Contoh: kebutuhan pendampingan, terapi rutin, atau tulis Tidak ada." /></label></div></section>
    {selectedOption && (isOnlinePreschoolProgram(selectedOption || applicant || selectedUnit) ? <section className="bg-blue-50/60 border border-blue-200 rounded-lg p-5 sm:p-6 space-y-5"><div><h2 className="font-bold text-lg text-blue-950">Kesiapan Preschool Homebased Learning</h2><p className="mt-1 text-sm text-blue-900">Diperlukan agar guru dapat menyesuaikan waktu dan pendampingan pembelajaran di rumah.</p></div><div className="grid sm:grid-cols-2 gap-4">{([["hbl_facilitator_name","Nama pendamping belajar di rumah *","text"],["hbl_facilitator_relation","Hubungan pendamping dengan anak *","text"],["hbl_preferred_session","Preferensi sesi belajar","text"],["learning_support_notes","Catatan kebutuhan belajar anak","text"]] as const).map(([key,label,type])=><label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e)=>set(key,e.target.value)} disabled={!editable} /></label>)}<label className="text-sm font-semibold">Perangkat video-call *<select className={`${inputClass} mt-2`} value={form.hbl_device_ready} onChange={(e)=>set("hbl_device_ready",e.target.value)} disabled={!editable}><option value="">Pilih kesiapan</option><option value="ready">Tersedia dan siap digunakan</option><option value="need_support">Belum tersedia / perlu konsultasi</option></select></label><label className="text-sm font-semibold">Internet stabil untuk video-call *<select className={`${inputClass} mt-2`} value={form.hbl_internet_ready} onChange={(e)=>set("hbl_internet_ready",e.target.value)} disabled={!editable}><option value="">Pilih kesiapan</option><option value="ready">Tersedia dan stabil</option><option value="need_support">Belum stabil / perlu konsultasi</option></select></label></div></section> : <section className="bg-amber-50/60 border border-amber-200 rounded-lg p-5 sm:p-6 space-y-5"><div><h2 className="font-bold text-lg text-amber-950">Kesiapan Kehadiran Onsite</h2><p className="mt-1 text-sm text-amber-900">Isi rencana antar-jemput agar sekolah dapat menghubungi orang yang tepat dan menyiapkan kebutuhan kehadiran anak.</p></div><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Kemandirian ke toilet {programProfile.requiresToiletReadiness && "*"}<select className={`${inputClass} mt-2`} value={form.toilet_independence} onChange={(e)=>set("toilet_independence",e.target.value)} disabled={!editable}><option value="">Pilih kondisi</option><option value="independent">Sudah mandiri</option><option value="with_support">Masih perlu pendampingan</option><option value="not_applicable">Tidak relevan</option></select></label><label className="text-sm font-semibold">Rencana transportasi / antar-jemput<select className={`${inputClass} mt-2`} value={form.onsite_transport_plan} onChange={(e)=>set("onsite_transport_plan",e.target.value)} disabled={!editable}><option value="">Pilih rencana</option><option value="parent">Diantar orang tua / wali</option><option value="school_transport">Transport sekolah</option><option value="other">Lainnya</option></select></label>{([["pickup_contact_name","Nama penjemput yang diizinkan","text"],["pickup_contact_phone","Telepon penjemput","tel"],["pickup_contact_relation","Hubungan penjemput dengan anak","text"]] as const).map(([key,label,type])=><label key={key} className="text-sm font-semibold">{label}<input className={`${inputClass} mt-2`} type={type} value={form[key]} onChange={(e)=>set(key,e.target.value)} disabled={!editable}/></label>)}</div></section>)}
    {selectedOption && <ProgramProfileDetails title={`Penyesuaian ${programProfile.label}`} detail={programProfile.kind === "preschool_hbl" ? "Lengkapi kondisi belajar di rumah agar guru dapat menyiapkan kegiatan dan komunikasi yang sesuai." : programProfile.kind === "preschool_onsite" ? "Jawaban ini membantu guru menyiapkan proses adaptasi anak di lingkungan sekolah." : programProfile.kind === "elementary" ? "Informasi ini membantu guru memahami kebutuhan dan kekuatan belajar anak sejak awal." : "Tambahkan konteks yang membantu panitia menyiapkan layanan program yang dipilih."} fields={programProfile.fields} values={form.admission_profile} onChange={setAdmissionProfile} inputClass={inputClass} disabled={!editable} />}
    <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-4"><div><h2 className="font-bold text-lg">Kategori Biaya Pendaftaran</h2><p className="text-sm text-slate-600 mt-1">Pilih tarif umum atau tarif staf yayasan. Tarif yang telah ditetapkan untuk gelombang akan langsung menjadi tagihan.</p></div><label className="flex gap-3 rounded-md border p-4 cursor-pointer"><input type="radio" name="registration_fee_category" value="regular" checked={form.registration_fee_category === "regular"} onChange={() => setForm((current) => ({ ...current, registration_fee_category: "regular", staff_employee_nik: "" }))} disabled={!editable} /><span><span className="font-bold block">Pendaftar umum</span><span className="text-sm text-slate-600">Tagihan mengikuti tarif unit dan gelombang yang dipilih.</span></span></label><label className="flex gap-3 rounded-md border p-4 cursor-pointer"><input type="radio" name="registration_fee_category" value="foundation_staff" checked={form.registration_fee_category === "foundation_staff"} onChange={() => set("registration_fee_category", "foundation_staff")} disabled={!editable} /><span><span className="font-bold block">Tarif staf yayasan</span><span className="text-sm text-slate-600">Bila tarif staf gelombang sudah ditetapkan, nominal dan rekening pembayaran akan langsung ditampilkan.</span></span></label>{form.registration_fee_category === "foundation_staff" && <label className="text-sm font-semibold block">NIK pegawai yayasan *<input className={`${inputClass} mt-2`} value={form.staff_employee_nik} onChange={(e) => set("staff_employee_nik", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Masukkan NIK pegawai aktif" disabled={!editable} /><span className="block text-xs font-normal text-slate-500 mt-2">NIK dicatat sebagai referensi administrasi tarif staf, bukan NIK calon murid.</span></label>}</section>
    {editable && <div className="sticky bottom-3 z-20 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-xs text-slate-600">Data disimpan sebagai draf. Pengiriman ke panitia dilakukan setelah berkas dan pembayaran lengkap.</p><div className="flex flex-col-reverse sm:flex-row gap-3"><button type="button" onClick={() => save("draft")} disabled={Boolean(saving) || schemaMissing} className="h-11 px-5 border rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />Simpan Draf</button><button type="button" onClick={() => save("continue")} disabled={Boolean(saving) || schemaMissing} className="h-11 px-5 bg-emerald-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{saving === "continue" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}Simpan & Lanjut Berkas</button></div></div>}
  </div>;
};

const Notice = ({ tone, icon: Icon, children }: { tone: "blue" | "amber"; icon: React.ElementType; children: React.ReactNode }) => <div className={`flex gap-3 border p-4 rounded-md text-sm ${tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><Icon className="w-5 h-5 shrink-0" />{children}</div>;

const ProgramProfileDetails = ({ title, detail, fields, values, onChange, inputClass, disabled }: { title: string; detail: string; fields: AdmissionProfileField[]; values: Record<string, string>; onChange: (key: string, value: string) => void; inputClass: string; disabled: boolean }) => <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-5"><div><h2 className="font-bold text-lg">{title}</h2><p className="mt-1 text-sm text-slate-600">{detail}</p></div><div className="grid sm:grid-cols-2 gap-4">{fields.map((field) => <label key={field.key} className={`text-sm font-semibold ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>{field.label} {field.required && <span className="text-rose-600">*</span>}{field.type === "select" ? <select className={`${inputClass} mt-2`} value={values[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} disabled={disabled}><option value="">Pilih jawaban</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === "textarea" ? <textarea className="mt-2 min-h-24 w-full rounded-md border p-3 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100" value={values[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} disabled={disabled} /> : <input className={`${inputClass} mt-2`} value={values[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} disabled={disabled} />}</label>)}</div></section>;
