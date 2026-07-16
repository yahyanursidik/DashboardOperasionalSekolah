/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileUp, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";
import { isMissingSupabaseColumn } from "../../lib/supabase/schema-errors";
import { useCurrentRoles } from "../../hooks/useAuth";
import { hasAnyRole } from "../../lib/permissions";
import {
  onboardingAudiences,
  onboardingCategories,
  onboardingMaterialTypes,
  toDateTimeLocal,
  type OnboardingMaterial,
} from "./onboarding-config";
import { OnboardingViewer } from "./onboarding-viewer";

type FormState = {
  title: string;
  description: string;
  material_type: string;
  file_url: string;
  status: "draft" | "published";
  order_index: number;
  unit_id: string;
  category: string;
  audience: string[];
  is_required: boolean;
  estimated_minutes: number;
  version_label: string;
  publish_start_at: string;
  publish_end_at: string;
  acknowledgement_required: boolean;
  acknowledgement_text: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  material_type: "pdf",
  file_url: "",
  status: "draft",
  order_index: 0,
  unit_id: "",
  category: "orientation",
  audience: ["parents"],
  is_required: false,
  estimated_minutes: 5,
  version_label: "1.0",
  publish_start_at: "",
  publish_end_at: "",
  acknowledgement_required: false,
  acknowledgement_text: "Saya telah membaca, memahami, dan bersedia mengikuti panduan sekolah ini.",
};

const fileRules: Record<string, { accept: string; maxMb: number }> = {
  pdf: { accept: ".pdf,application/pdf", maxMb: 25 },
  image: { accept: "image/jpeg,image/png,image/webp", maxMb: 10 },
  audio: { accept: "audio/*", maxMb: 50 },
  video: { accept: "video/mp4,video/webm", maxMb: 250 },
};

export const OnboardingMaterialForm: React.FC<{ mode: "create" | "edit" }> = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles } = useCurrentRoles();
  const [form, setForm] = useState<FormState>(initialForm);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [legacySchema, setLegacySchema] = useState(false);

  const isUpload = Boolean(fileRules[form.material_type]);
  const canManageGlobal = hasAnyRole(roles, ["super_admin", "ketua_yayasan", "kepsek", "kepala_tu", "admin_tu", "admin_sekolah", "admin_dokumen", "hrd"]);
  const materialPreview = useMemo(() => ({ title: form.title || "Pratinjau materi", material_type: form.material_type, file_url: form.file_url }), [form.file_url, form.material_type, form.title]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(mode === "edit");
      const unitResult = await supabaseClient.from("units").select("id,name").eq("is_active", true).order("name");
      setUnits(unitResult.data || []);
      if (mode === "edit" && id) {
        const { data, error } = await supabaseClient.from("onboarding_materials").select("*").eq("id", id).single();
        if (error) {
          toast.error(`Materi tidak dapat dimuat: ${error.message}`);
          navigate("/onboarding", { replace: true });
          return;
        }
        const record = data as unknown as OnboardingMaterial;
        setForm({
          title: record.title || "",
          description: record.description || "",
          material_type: record.material_type || "pdf",
          file_url: record.file_url || "",
          status: record.status || "draft",
          order_index: Number(record.order_index || 0),
          unit_id: record.unit_id || "",
          category: record.category || "orientation",
          audience: record.audience?.length ? record.audience : ["parents"],
          is_required: Boolean(record.is_required),
          estimated_minutes: Number(record.estimated_minutes || 5),
          version_label: record.version_label || "1.0",
          publish_start_at: toDateTimeLocal(record.publish_start_at),
          publish_end_at: toDateTimeLocal(record.publish_end_at),
          acknowledgement_required: Boolean(record.acknowledgement_required),
          acknowledgement_text: record.acknowledgement_text || initialForm.acknowledgement_text,
        });
        setLegacySchema(record.audience === undefined);
      }
      setIsLoading(false);
    };
    void load();
  }, [id, mode, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const toggleAudience = (value: string) => {
    setForm((current) => {
      if (value === "all") return { ...current, audience: current.audience.includes("all") ? ["parents"] : ["all"] };
      const withoutAll = current.audience.filter((item) => item !== "all");
      const next = withoutAll.includes(value) ? withoutAll.filter((item) => item !== value) : [...withoutAll, value];
      return { ...current, audience: next.length ? next : ["parents"] };
    });
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    const rule = fileRules[form.material_type];
    if (!rule) return;
    if (file.size > rule.maxMb * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${rule.maxMb} MB untuk tipe ini.`);
      return;
    }
    setIsUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const safePath = `${form.unit_id || "global"}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await supabaseClient.storage.from("onboarding_materials").upload(safePath, file, { upsert: false, contentType: file.type || undefined });
      if (error) throw error;
      const publicUrl = supabaseClient.storage.from("onboarding_materials").getPublicUrl(data.path).data.publicUrl;
      set("file_url", publicUrl);
      toast.success("File berhasil diunggah dan siap dipratinjau.");
    } catch (error: any) {
      toast.error(error.message || "File gagal diunggah.");
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.file_url.trim()) return toast.error("Judul dan file/tautan materi wajib diisi.");
    if (!canManageGlobal && !form.unit_id) return toast.error("Admin unit wajib memilih unit materi.");
    if (!form.audience.length) return toast.error("Pilih minimal satu sasaran portal.");
    if (form.publish_start_at && form.publish_end_at && new Date(form.publish_end_at) <= new Date(form.publish_start_at)) return toast.error("Akhir periode tayang harus setelah waktu mulai.");
    if (form.acknowledgement_required && !form.acknowledgement_text.trim()) return toast.error("Teks persetujuan wajib diisi.");

    setIsSaving(true);
    const { data: authData } = await supabaseClient.auth.getUser();
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null, material_type: form.material_type,
      file_url: form.file_url.trim(), status: form.status, order_index: Number(form.order_index || 0),
      unit_id: form.unit_id || null, category: form.category, audience: form.audience,
      is_required: form.is_required, estimated_minutes: Number(form.estimated_minutes || 5), version_label: form.version_label.trim() || "1.0",
      publish_start_at: form.publish_start_at ? new Date(form.publish_start_at).toISOString() : null,
      publish_end_at: form.publish_end_at ? new Date(form.publish_end_at).toISOString() : null,
      acknowledgement_required: form.acknowledgement_required,
      acknowledgement_text: form.acknowledgement_required ? form.acknowledgement_text.trim() : null,
      ...(mode === "create" ? { created_by: authData.user?.id || null } : {}),
    };

    const save = (value: Record<string, unknown>) => mode === "edit" && id
      ? supabaseClient.from("onboarding_materials").update(value).eq("id", id)
      : supabaseClient.from("onboarding_materials").insert(value);
    let result = await save(payload);
    if (result.error && ["unit_id", "category", "audience", "is_required", "estimated_minutes", "version_label", "publish_start_at", "publish_end_at", "acknowledgement_required", "acknowledgement_text", "created_by"].some((column) => isMissingSupabaseColumn(result.error, column, "onboarding_materials"))) {
      result = await save({ title: payload.title, description: payload.description, material_type: payload.material_type, file_url: payload.file_url, status: payload.status, order_index: payload.order_index });
      if (!result.error) {
        setLegacySchema(true);
        toast.warning("Materi tersimpan dalam format lama. Terapkan migrasi onboarding agar target unit, portal, dan persetujuan aktif.");
      }
    }
    setIsSaving(false);
    if (result.error) return toast.error(`Materi gagal disimpan: ${result.error.message}`);
    toast.success(mode === "create" ? "Materi onboarding berhasil dibuat." : "Materi onboarding berhasil diperbarui.");
    navigate("/onboarding");
  };

  if (isLoading) return <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat materi...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={mode === "create" ? "Tambah Materi Panduan" : "Ubah Materi Panduan"} description="Atur isi, sasaran portal, unit, periode tayang, dan bukti pemahaman dalam satu workflow." action={<Link to="/onboarding" className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Kembali</Link>} />
      {legacySchema ? <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Database masih memakai struktur onboarding lama</p><p className="mt-1">Terapkan migrasi <code>20260716080000_onboarding_quality_portals.sql</code> untuk mengaktifkan pengaturan di bawah secara penuh.</p></div></div> : null}
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-6">
          <FormSection title="Identitas materi" description="Judul yang mudah dipahami dan konteks singkat materi.">
            <Field label="Judul materi" required><input required maxLength={255} value={form.title} onChange={(event) => set("title", event.target.value)} className="h-11 w-full rounded-md border px-3" placeholder="Contoh: SOP Penjemputan Siswa" /></Field>
            <Field label="Deskripsi"><textarea rows={4} value={form.description} onChange={(event) => set("description", event.target.value)} className="w-full rounded-md border p-3" placeholder="Tujuan, isi utama, dan pihak yang perlu mempelajari materi." /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Kategori"><select value={form.category} onChange={(event) => set("category", event.target.value)} className="h-11 w-full rounded-md border bg-background px-3">{onboardingCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="Versi"><input value={form.version_label} onChange={(event) => set("version_label", event.target.value)} className="h-11 w-full rounded-md border px-3" placeholder="1.0" /></Field></div>
          </FormSection>

          <FormSection title="Sasaran & cakupan" description="Materi hanya muncul pada portal dan unit yang dipilih.">
            <Field label="Unit sekolah" required={!canManageGlobal}><select value={form.unit_id} onChange={(event) => set("unit_id", event.target.value)} className="h-11 w-full rounded-md border bg-background px-3">{canManageGlobal ? <option value="">Lintas unit / seluruh sekolah</option> : <option value="">Pilih unit yang dikelola</option>}{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
            <div><p className="mb-2 text-sm font-semibold">Sasaran portal <span className="text-red-600">*</span></p><div className="grid gap-2 sm:grid-cols-2">{onboardingAudiences.map((item) => <label key={item.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-semibold ${form.audience.includes(item.value) ? "border-primary bg-primary/5 text-primary" : "bg-card"}`}><input type="checkbox" checked={form.audience.includes(item.value)} onChange={() => toggleAudience(item.value)} />{item.label}</label>)}</div></div>
            <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3"><input type="checkbox" checked={form.is_required} onChange={(event) => set("is_required", event.target.checked)} className="mt-1" /><span><span className="block text-sm font-bold">Materi wajib</span><span className="text-xs text-muted-foreground">Ditandai sebagai prioritas dan masuk monitoring penyelesaian.</span></span></label>
          </FormSection>

          <FormSection title="Publikasi & bukti pemahaman" description="Kontrol kapan materi tampil dan apakah pengguna wajib menyetujui.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><select value={form.status} onChange={(event) => set("status", event.target.value as FormState["status"])} className="h-11 w-full rounded-md border bg-background px-3"><option value="draft">Draf</option><option value="published">Publikasikan</option></select></Field><Field label="Estimasi belajar (menit)"><input type="number" min={1} max={600} value={form.estimated_minutes} onChange={(event) => set("estimated_minutes", Number(event.target.value))} className="h-11 w-full rounded-md border px-3" /></Field><Field label="Mulai tayang"><input type="datetime-local" value={form.publish_start_at} onChange={(event) => set("publish_start_at", event.target.value)} className="h-11 w-full rounded-md border px-3" /></Field><Field label="Akhir tayang"><input type="datetime-local" value={form.publish_end_at} onChange={(event) => set("publish_end_at", event.target.value)} className="h-11 w-full rounded-md border px-3" /></Field></div>
            <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3"><input type="checkbox" checked={form.acknowledgement_required} onChange={(event) => { set("acknowledgement_required", event.target.checked); if (event.target.checked) set("is_required", true); }} className="mt-1" /><ShieldCheck className="h-5 w-5 text-primary" /><span><span className="block text-sm font-bold">Wajib persetujuan pengguna</span><span className="text-xs text-muted-foreground">Simpan akun, waktu, dan versi yang telah disetujui.</span></span></label>
            {form.acknowledgement_required ? <Field label="Pernyataan persetujuan" required><textarea required rows={3} value={form.acknowledgement_text} onChange={(event) => set("acknowledgement_text", event.target.value)} className="w-full rounded-md border p-3" /></Field> : null}
          </FormSection>
        </div>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <FormSection title="Media materi" description="Unggah file atau masukkan tautan yang dapat diakses pengguna.">
            <Field label="Tipe media"><select value={form.material_type} onChange={(event) => { set("material_type", event.target.value); set("file_url", ""); }} className="h-11 w-full rounded-md border bg-background px-3">{onboardingMaterialTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            {isUpload ? <div className="rounded-md border border-dashed bg-muted/20 p-5 text-center"><FileUp className="mx-auto h-8 w-8 text-primary" /><p className="mt-2 text-sm font-bold">Pilih file {onboardingMaterialTypes.find((item) => item.value === form.material_type)?.label}</p><p className="mt-1 text-xs text-muted-foreground">Maksimal {fileRules[form.material_type].maxMb} MB</p><label className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{isUploading ? "Mengunggah..." : "Pilih File"}<input type="file" className="hidden" disabled={isUploading} accept={fileRules[form.material_type].accept} onChange={(event) => void uploadFile(event.target.files?.[0])} /></label></div> : <Field label="Tautan materi" required><input type="url" required value={form.file_url} onChange={(event) => set("file_url", event.target.value)} className="h-11 w-full rounded-md border px-3" placeholder="https://..." /></Field>}
            {isUpload && form.file_url ? <Field label="URL file"><input readOnly value={form.file_url} className="h-10 w-full truncate rounded-md border bg-muted/30 px-3 text-xs" /></Field> : null}
            <Field label="Urutan tampil"><input type="number" min={0} value={form.order_index} onChange={(event) => set("order_index", Number(event.target.value))} className="h-11 w-full rounded-md border px-3" /></Field>
          </FormSection>
          <section className="overflow-hidden rounded-md border bg-card"><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-sm font-bold">Pratinjau</h2><p className="text-xs text-muted-foreground">Tampilan media sebelum dipublikasikan.</p></div>{form.file_url ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}</div><OnboardingViewer material={materialPreview} compact /></section>
          <button disabled={isSaving || isUploading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? "Menyimpan..." : "Simpan Materi"}</button>
        </div>
      </form>
    </div>
  );
};

const FormSection = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => <section className="rounded-md border bg-card"><div className="border-b px-5 py-4"><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="space-y-4 p-5">{children}</div></section>;
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}{required ? <span className="text-red-600"> *</span> : null}</span>{children}</label>;
