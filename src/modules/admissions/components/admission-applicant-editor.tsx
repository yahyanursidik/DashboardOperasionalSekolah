/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { isOnlinePreschoolProgram } from "../../../lib/timezones";
import { getAdmissionProfileFields } from "../admission-program-profile";
import { IndonesiaDomicileSuggest } from "./indonesia-domicile-suggest";

const db = supabaseClient as any;

const parentEducationOptions = [
  "Tidak/belum sekolah", "SD/sederajat", "SMP/sederajat", "SMA/SMK/sederajat", "Diploma I/II/III", "Diploma IV/Sarjana (S1)", "Profesi", "Magister (S2)", "Doktor (S3)", "Lainnya",
];

const editableFields = [
  "name", "child_nickname", "nik", "nisn", "gender", "birth_place", "dob", "previous_school",
  "parent_name", "parent_phone", "parent_email", "parent_occupation", "parent_education_level",
  "second_parent_name", "second_parent_phone", "second_parent_occupation", "second_parent_education_level",
  "family_card_number", "address", "domicile_regency", "domicile_province",
  "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation", "home_language", "allergies", "medical_notes",
  "toilet_independence", "onsite_transport_plan", "pickup_contact_name", "pickup_contact_phone", "pickup_contact_relation",
  "residence_country", "learning_timezone", "hbl_facilitator_name", "hbl_facilitator_relation", "hbl_preferred_session", "learning_support_notes",
] as const;

const blankToNull = (value: unknown) => String(value ?? "").trim() || null;

export const AdmissionApplicantEditor = ({ applicant, onClose, onSaved }: { applicant: any; onClose: () => void; onSaved: () => Promise<void> | void }) => {
  const [form, setForm] = useState(() => Object.fromEntries(editableFields.map((field) => [field, applicant[field] ?? ""])) as Record<string, string>);
  const [profile, setProfile] = useState<Record<string, string>>(() => applicant.admission_profile && typeof applicant.admission_profile === "object" ? applicant.admission_profile : {});
  const [saving, setSaving] = useState(false);
  const isHbl = isOnlinePreschoolProgram(applicant);
  const profileFields = useMemo(() => getAdmissionProfileFields(applicant), [applicant]);
  const inputClass = "mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500";
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!form.name.trim() || !form.nik.trim() || !form.dob || !form.parent_name.trim() || !form.parent_phone.trim()) {
      toast.error("Nama calon murid, NIK, tanggal lahir, dan kontak utama orang tua wajib diisi.");
      return;
    }
    if (form.second_parent_name.trim() && !form.second_parent_education_level) {
      toast.error("Pilih pendidikan terakhir orang tua kedua atau kosongkan namanya.");
      return;
    }
    setSaving(true);
    const payload = Object.fromEntries(editableFields.map((field) => [field, blankToNull(form[field])])) as Record<string, unknown>;
    payload.gender = form.gender || "L";
    payload.admission_profile = profile;
    const { error } = await db.from("admissions_applicants").update(payload).eq("id", applicant.id);
    setSaving(false);
    if (error) {
      toast.error(`Data belum dapat diperbarui: ${error.message}`);
      return;
    }
    toast.success("Perbaikan data pendaftaran tersimpan dan tercatat di riwayat.");
    await onSaved();
    onClose();
  };

  const field = (key: string, label: string, type = "text") => <label className="text-sm font-semibold" key={key}>{label}<input type={type} value={form[key] || ""} onChange={(event) => set(key, event.target.value)} className={inputClass} /></label>;
  return <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/45 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Edit data pendaftaran">
    <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-xl bg-slate-50 shadow-2xl sm:rounded-xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Editor panitia</p><h2 className="mt-1 text-xl font-bold">Perbaiki Data Pendaftaran</h2><p className="mt-1 text-sm text-slate-600">Perubahan data inti dicatat tanpa menyalin nilai identitas sensitif ke riwayat.</p></div><button type="button" onClick={onClose} disabled={saving} className="grid h-10 w-10 place-items-center rounded-md border hover:bg-slate-50" title="Tutup"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 p-5 sm:p-6">
        <section className="rounded-lg border bg-white p-5"><h3 className="font-bold">Identitas Calon Murid</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{field("name", "Nama lengkap *")}{field("child_nickname", "Nama panggilan")}{field("nik", "NIK *")}{field("nisn", "NISN")}{field("birth_place", "Tempat lahir")}{field("dob", "Tanggal lahir *", "date")}<label className="text-sm font-semibold">Jenis kelamin<select value={form.gender || "L"} onChange={(event) => set("gender", event.target.value)} className={inputClass}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>{field("previous_school", "Asal sekolah / lembaga")}</div></section>
        <section className="rounded-lg border bg-white p-5"><h3 className="font-bold">Orang Tua dan Domisili</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{field("parent_name", "Nama orang tua / wali *")}{field("parent_phone", "WhatsApp utama *", "tel")}{field("parent_email", "Email", "email")}{field("parent_occupation", "Pekerjaan orang tua / wali")}{field("second_parent_name", "Nama orang tua kedua")}{field("second_parent_phone", "WhatsApp orang tua kedua", "tel")}{field("second_parent_occupation", "Pekerjaan orang tua kedua")}{field("family_card_number", "Nomor kartu keluarga")}<label className="text-sm font-semibold">Pendidikan terakhir orang tua / wali<select value={form.parent_education_level || ""} onChange={(event) => set("parent_education_level", event.target.value)} className={inputClass}><option value="">Pilih pendidikan</option>{parentEducationOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="text-sm font-semibold">Pendidikan orang tua kedua<select value={form.second_parent_education_level || ""} onChange={(event) => set("second_parent_education_level", event.target.value)} className={inputClass}><option value="">Pilih pendidikan</option>{parentEducationOptions.map((option) => <option key={option}>{option}</option>)}</select></label><IndonesiaDomicileSuggest cityRegency={form.domicile_regency || ""} province={form.domicile_province || ""} inputClassName={inputClass.replace("mt-1.5 ", "")} onCityRegencyChange={(value) => set("domicile_regency", value)} onProvinceChange={(value) => set("domicile_province", value)} /><label className="text-sm font-semibold sm:col-span-2">Alamat lengkap<textarea value={form.address || ""} onChange={(event) => set("address", event.target.value)} className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></label></div></section>
        <section className="rounded-lg border bg-white p-5"><h3 className="font-bold">Kesehatan dan Kontak Darurat</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{field("emergency_contact_name", "Nama kontak darurat")}{field("emergency_contact_phone", "Telepon kontak darurat", "tel")}{field("emergency_contact_relation", "Hubungan dengan anak")}{field("home_language", "Bahasa di rumah")}{field("allergies", "Alergi")}{field("pickup_contact_name", "Penjemput yang diizinkan")}{field("pickup_contact_phone", "Telepon penjemput", "tel")}{field("pickup_contact_relation", "Hubungan penjemput")}<label className="text-sm font-semibold sm:col-span-2">Catatan kesehatan / kebutuhan dukungan<textarea value={form.medical_notes || ""} onChange={(event) => set("medical_notes", event.target.value)} className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></label></div></section>
        {isHbl ? <section className="rounded-lg border border-blue-200 bg-blue-50 p-5"><h3 className="font-bold text-blue-950">Kesiapan Homebased Learning</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{field("residence_country", "Negara domisili")}{field("learning_timezone", "Zona waktu IANA, contoh Asia/Jakarta")}{field("hbl_facilitator_name", "Nama pendamping belajar")}{field("hbl_facilitator_relation", "Hubungan pendamping")}{field("hbl_preferred_session", "Preferensi sesi belajar")}<label className="text-sm font-semibold sm:col-span-2">Catatan kebutuhan belajar<textarea value={form.learning_support_notes || ""} onChange={(event) => set("learning_support_notes", event.target.value)} className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></label></div></section> : <section className="rounded-lg border bg-white p-5"><h3 className="font-bold">Kesiapan Onsite</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Kemandirian toilet<select value={form.toilet_independence || ""} onChange={(event) => set("toilet_independence", event.target.value)} className={inputClass}><option value="">Belum diisi</option><option value="independent">Sudah mandiri</option><option value="with_support">Perlu pendampingan</option><option value="not_applicable">Tidak relevan</option></select></label><label className="text-sm font-semibold">Transportasi<select value={form.onsite_transport_plan || ""} onChange={(event) => set("onsite_transport_plan", event.target.value)} className={inputClass}><option value="">Belum diisi</option><option value="parent">Diantar orang tua / wali</option><option value="school_transport">Transport sekolah</option><option value="other">Lainnya</option></select></label></div></section>}
        {profileFields.length > 0 && <section className="rounded-lg border bg-white p-5"><h3 className="font-bold">Informasi Program</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{profileFields.map((item) => <label key={item.key} className={`text-sm font-semibold ${item.type === "textarea" ? "sm:col-span-2" : ""}`}>{item.label}{item.type === "select" ? <select value={profile[item.key] || ""} onChange={(event) => setProfile((current) => ({ ...current, [item.key]: event.target.value }))} className={inputClass}><option value="">Pilih jawaban</option>{item.options?.map((option) => <option key={option}>{option}</option>)}</select> : item.type === "textarea" ? <textarea value={profile[item.key] || ""} onChange={(event) => setProfile((current) => ({ ...current, [item.key]: event.target.value }))} className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" /> : <input value={profile[item.key] || ""} onChange={(event) => setProfile((current) => ({ ...current, [item.key]: event.target.value }))} className={inputClass} />}</label>)}</div></section>}
      </div>
      <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-5 py-4 sm:px-6"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button type="button" onClick={() => void save()} disabled={saving} className="flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Perbaikan</button></div>
    </div>
  </div>;
};
