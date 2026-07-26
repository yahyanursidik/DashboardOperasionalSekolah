/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import { useForm, useSelect } from "@refinedev/core";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HeartHandshake, Ruler, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import {
  PAUD_ASPECTS,
  PAUD_SCALES,
  PAUD_SCALE_LABELS,
  PAUD_SCALE_TONES,
} from "./paud-config";

export const StppaAssessmentForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState("");

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "paud_stppa_assessments",
    action: isEdit ? "edit" : "create",
    id,
  });
  const record = queryResult?.data?.data as any;

  React.useEffect(() => {
    if (!record) return;
    setSelectedClassId(record.class_id || "");
    setSelectedStudentId(record.student_id || "");
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeYearId || !activeSemesterId) {
      toast.error("Tahun ajaran dan semester aktif wajib tersedia.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {
      student_id: selectedStudentId,
      class_id: selectedClassId,
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      period_name: formData.get("period_name"),
      date: formData.get("date"),
      strengths: formData.get("strengths") || null,
      follow_up: formData.get("follow_up") || null,
      parent_partnership: formData.get("parent_partnership") || null,
      growth_weight: numberOrNull(formData.get("growth_weight")),
      growth_height: numberOrNull(formData.get("growth_height")),
      growth_head: numberOrNull(formData.get("growth_head")),
      status: formData.get("status"),
      is_parent_visible: formData.get("is_parent_visible") === "true",
    };
    PAUD_ASPECTS.forEach((aspect) => {
      values[`${aspect.id}_scale`] = formData.get(`${aspect.id}_scale`);
      values[`${aspect.id}_desc`] = formData.get(`${aspect.id}_desc`);
    });
    try {
      await onFinish(values);
      toast.success(isEdit ? "Asesmen perkembangan diperbarui." : "Asesmen perkembangan disimpan.");
    } catch (error: any) {
      toast.error(`Asesmen gagal disimpan: ${error.message || "periksa kelengkapan data"}`);
    }
  };

  const isReady = Boolean(activeYearId && activeSemesterId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-start gap-3">
        <button title="Kembali" onClick={() => navigate("/stppa-assessments")} className="mt-1 rounded-full border p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={isEdit ? "Ubah Asesmen Perkembangan" : "Isi Asesmen Perkembangan Anak"}
          description="Gunakan kumpulan bukti observasi, bukan satu kejadian tunggal, untuk menentukan capaian STPPA."
        />
      </div>

      {!isReady && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tahun ajaran atau semester aktif belum tersedia. Atur konteks akademik terlebih dahulu.
        </div>
      )}

      <form key={record?.updated_at || "new"} onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="font-bold">1. Identitas asesmen</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Kelas" required>
              <select
                required
                value={selectedClassId}
                onChange={(event) => {
                  setSelectedClassId(event.target.value);
                  setSelectedStudentId("");
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Pilih kelas</option>
                {classOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Anak" required>
              <select
                required
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                disabled={!selectedClassId || studentQuery.isLoading}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">{selectedClassId ? "Pilih anak" : "Pilih kelas terlebih dahulu"}</option>
                {studentOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Nama periode" required>
              <input name="period_name" required defaultValue={record?.period_name || ""} placeholder="Contoh: Tengah Semester Ganjil" className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </Field>
            <Field label="Tanggal asesmen" required>
              <input name="date" type="date" required defaultValue={record?.date || new Date().toLocaleDateString("en-CA")} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </Field>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b p-5 sm:p-6">
            <h2 className="font-bold">2. Enam aspek perkembangan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih skala dan tulis narasi yang menunjukkan kemampuan, proses, serta konteks dukungan.</p>
          </div>
          <div className="divide-y">
            {PAUD_ASPECTS.map((aspect, index) => (
              <div key={aspect.id} className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[300px_1fr]">
                <div>
                  <p className="text-xs font-bold text-primary">ASPEK {index + 1}</p>
                  <h3 className="mt-1 font-bold">{aspect.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{aspect.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {PAUD_SCALES.map((scale) => (
                      <label key={scale} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`${aspect.id}_scale`}
                          value={scale}
                          required
                          defaultChecked={(record?.[`${aspect.id}_scale`] || "BSH") === scale}
                          className="peer sr-only"
                        />
                        <span className={`flex rounded-md border px-2 py-2 text-xs font-semibold peer-checked:ring-2 peer-checked:ring-primary ${PAUD_SCALE_TONES[scale]}`}>
                          {scale} · {PAUD_SCALE_LABELS[scale]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label={`Narasi ${aspect.shortTitle}`} required>
                  <textarea
                    name={`${aspect.id}_desc`}
                    required
                    rows={7}
                    defaultValue={record?.[`${aspect.id}_desc`] || ""}
                    placeholder="Tuliskan kemampuan yang sudah tampak, contoh buktinya, serta dukungan yang masih diperlukan."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-6"
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h2 className="font-bold">3. Rangkuman dan kemitraan keluarga</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Field label="Kekuatan dan minat anak">
              <textarea name="strengths" rows={4} defaultValue={record?.strengths || ""} placeholder="Kemampuan, minat, atau kebiasaan positif yang paling menonjol." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </Field>
            <Field label="Tindak lanjut sekolah">
              <textarea name="follow_up" rows={4} defaultValue={record?.follow_up || ""} placeholder="Stimulasi atau dukungan berikutnya di kelas." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </Field>
            <Field label="Kemitraan dengan orang tua">
              <textarea name="parent_partnership" rows={4} defaultValue={record?.parent_partnership || ""} placeholder="Kegiatan sederhana yang dapat dilanjutkan secara konsisten di rumah." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            <h2 className="font-bold">4. Pertumbuhan dan publikasi</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Berat badan (kg)"><input type="number" min="0" step="0.1" name="growth_weight" defaultValue={record?.growth_weight ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
            <Field label="Tinggi badan (cm)"><input type="number" min="0" step="0.1" name="growth_height" defaultValue={record?.growth_height ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
            <Field label="Lingkar kepala (cm)"><input type="number" min="0" step="0.1" name="growth_head" defaultValue={record?.growth_head ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 border-t pt-5 md:grid-cols-2">
            <Field label="Status">
              <select name="status" defaultValue={record?.status || "published"} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="draft">Draf untuk review internal</option>
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
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link to="/stppa-assessments" className="inline-flex h-11 items-center justify-center rounded-md border px-5 text-sm font-semibold hover:bg-muted">Batal</Link>
          <button type="submit" disabled={formLoading || !isReady} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Save className="h-4 w-4" /> {formLoading ? "Menyimpan..." : "Simpan Asesmen"}
          </button>
        </div>
      </form>
    </div>
  );
};

function numberOrNull(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold">{label}{required && <span className="ml-1 text-rose-600">*</span>}</span>
      {children}
    </label>
  );
}
