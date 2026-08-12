/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import { useForm, useSelect } from "@refinedev/core";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { uploadDocument } from "../../lib/supabase/storage";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import {
  PAUD_ASPECTS,
  PAUD_ISLAMIC_VALUES,
  PAUD_OBSERVATION_METHODS,
} from "./paud-config";

export const PaudActivityForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "paud_activities",
    action: isEdit ? "edit" : "create",
    id,
  });
  const record = queryResult?.data?.data as any;

  React.useEffect(() => {
    if (!record) return;
    setSelectedClassId(record.class_id || "");
    setSelectedStudentId(record.student_id || "");
    setPhotoUrl(record.photo_url || "");
  }, [record]);

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
  });
  const { options: studentOptions, queryResult: studentQuery } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedClassId
      ? [
          { field: "class_id", operator: "eq", value: selectedClassId },
          { field: "status", operator: "eq", value: "active" },
        ]
      : [],
    queryOptions: { enabled: Boolean(selectedClassId) },
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Berkas harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadDocument(file, `paud/activities/${selectedStudentId || "unassigned"}`);
      setPhotoUrl(uploaded.filePath);
      toast.success("Foto berhasil diunggah.");
    } catch (error: any) {
      toast.error(`Foto gagal diunggah: ${error.message || "periksa konfigurasi penyimpanan"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeYearId || !activeSemesterId) {
      toast.error("Tahun ajaran dan semester aktif wajib dipilih.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const values = {
      student_id: selectedStudentId,
      class_id: selectedClassId,
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      date: formData.get("date"),
      title: formData.get("title"),
      description: formData.get("description"),
      observation_method: formData.get("observation_method"),
      development_aspects: formData.getAll("development_aspects"),
      islamic_values: formData.getAll("islamic_values"),
      follow_up: formData.get("follow_up") || null,
      photo_url: photoUrl || null,
      status: formData.get("status"),
      is_parent_visible: formData.get("is_parent_visible") === "true",
    };
    try {
      await onFinish(values);
      toast.success(isEdit ? "Jurnal observasi diperbarui." : "Jurnal observasi disimpan.");
    } catch (error: any) {
      toast.error(`Jurnal gagal disimpan: ${error.message || "periksa kelengkapan data"}`);
    }
  };

  const isReady = Boolean(activeYearId && activeSemesterId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex items-start gap-3">
        <button title="Kembali" onClick={() => navigate("/paud-activities")} className="mt-1 rounded-full border p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={isEdit ? "Ubah Jurnal Observasi" : "Catat Observasi Anak"}
          description="Tuliskan perilaku yang terlihat, hubungkan dengan aspek perkembangan, lalu tentukan tindak lanjutnya."
        />
      </div>

      {!isReady && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tahun ajaran atau semester aktif belum tersedia. Atur konteks akademik sebelum mencatat observasi.
        </div>
      )}

      <form key={record?.updated_at || "new"} onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="font-bold">1. Anak dan konteks observasi</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kelas dan anak dibatasi oleh unit serta tahun ajaran aktif.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Kelas" required>
              <select
                value={selectedClassId}
                onChange={(event) => {
                  setSelectedClassId(event.target.value);
                  setSelectedStudentId("");
                }}
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Pilih kelas</option>
                {classOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Anak" required>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                disabled={!selectedClassId || studentQuery.isLoading}
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">{selectedClassId ? "Pilih anak" : "Pilih kelas terlebih dahulu"}</option>
                {studentOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Tanggal" required>
              <input type="date" name="date" required defaultValue={record?.date || new Date().toLocaleDateString("en-CA")} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </Field>
            <Field label="Metode bukti" required>
              <select name="observation_method" required defaultValue={record?.observation_method || "photo"} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {PAUD_OBSERVATION_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="font-bold">2. Bukti belajar autentik</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hindari label pribadi. Catat situasi, tindakan atau ucapan anak, dan respons guru.</p>
          <div className="mt-5 space-y-4">
            <Field label="Judul kegiatan" required>
              <input name="title" required defaultValue={record?.title || ""} placeholder="Contoh: Berbagi alat main saat membuat masjid dari balok" className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </Field>
            <Field label="Narasi observasi" required>
              <textarea
                name="description"
                required
                rows={5}
                defaultValue={record?.description || ""}
                placeholder="Tuliskan apa yang benar-benar terlihat atau terdengar, konteks kegiatan, serta dukungan yang diberikan guru."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-6"
              />
            </Field>
            <Field label="Foto atau hasil karya">
              <div className="rounded-md border border-dashed bg-muted/20 p-4">
                {photoUrl ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <img src={photoUrl} alt="Bukti observasi" className="h-28 w-40 rounded-md object-cover" />
                    <div>
                      <p className="text-sm font-semibold">Bukti visual siap disimpan</p>
                      <button type="button" onClick={() => setPhotoUrl("")} className="mt-2 text-sm font-semibold text-rose-700 hover:underline">Hapus foto</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center py-3 text-center">
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-sm font-semibold">{isUploading ? "Mengunggah..." : "Pilih gambar maksimal 5 MB"}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} className="sr-only" />
                  </label>
                )}
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="font-bold">3. Makna perkembangan dan nilai Islam</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pilih hanya aspek yang benar-benar didukung oleh bukti observasi.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {PAUD_ASPECTS.map((aspect) => (
              <label key={aspect.id} className="flex cursor-pointer gap-3 rounded-md border p-3 hover:bg-muted/30">
                <input type="checkbox" name="development_aspects" value={aspect.id} defaultChecked={record?.development_aspects?.includes(aspect.id)} className="mt-1 accent-primary" />
                <span><span className="block text-sm font-semibold">{aspect.title}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{aspect.description}</span></span>
              </label>
            ))}
          </div>
          <div className="mt-5 border-t pt-5">
            <p className="text-sm font-semibold">Nilai Islam dan karakter yang tampak</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAUD_ISLAMIC_VALUES.map((value) => (
                <label key={value} className="cursor-pointer">
                  <input type="checkbox" name="islamic_values" value={value} defaultChecked={record?.islamic_values?.includes(value)} className="peer sr-only" />
                  <span className="inline-flex rounded-md border px-3 py-2 text-sm peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800">{value}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="font-bold">4. Tindak lanjut dan publikasi</h2>
          <div className="mt-5 space-y-4">
            <Field label="Rencana tindak lanjut">
              <textarea name="follow_up" rows={3} defaultValue={record?.follow_up || ""} placeholder="Contoh: Sediakan permainan berpasangan dan berikan kesempatan anak memimpin pembagian alat." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Status">
                <select name="status" defaultValue={record?.status || "published"} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="draft">Draf internal</option>
                  <option value="published">Terbit</option>
                </select>
              </Field>
              <Field label="Akses orang tua">
                <select name="is_parent_visible" defaultValue={String(record?.is_parent_visible ?? true)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="true">Tampilkan di portal orang tua</option>
                  <option value="false">Simpan untuk internal sekolah</option>
                </select>
              </Field>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link to="/paud-activities" className="inline-flex h-11 items-center justify-center rounded-md border px-5 text-sm font-semibold hover:bg-muted">Batal</Link>
          <button type="submit" disabled={formLoading || isUploading || !isReady} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Save className="h-4 w-4" /> {formLoading ? "Menyimpan..." : "Simpan Observasi"}
          </button>
        </div>
      </form>
    </div>
  );
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold">{label}{required && <span className="ml-1 text-rose-600">*</span>}</span>
      {children}
    </label>
  );
}
