import React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { BarChart3, CalendarDays, ClipboardCheck, ClipboardList, Layers3, Plus, Trash2 } from "lucide-react";

interface CurriculumFormFieldsProps {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: FieldErrors<any>;
  activeTab: string;
  selectedSemester: "Ganjil" | "Genap";
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</label>
);

const EmptyState: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
    <p className="font-semibold text-foreground">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>
);

export const CurriculumFormFields: React.FC<CurriculumFormFieldsProps> = ({ register, control, activeTab, selectedSemester }) => {
  const semesterPlanPrefix = `semester_plans.${selectedSemester}`;
  const assessmentWeights = useWatch({ control, name: `${semesterPlanPrefix}.assessment_weights` }) || {};
  const finalAssessmentType = useWatch({ control, name: `${semesterPlanPrefix}.final_assessment_type` });
  const assessmentWeightTotal = ["formatif", "sumatif_lingkup", "sts", "semester_final"]
    .reduce((total, key) => total + (Number(assessmentWeights[key]) || 0), 0);
  const { fields: protaFields, append: appendProta, remove: removeProta } = useFieldArray({
    control,
    name: "prota_data",
  });

  const { fields: prosemFields, append: appendProsem, remove: removeProsem } = useFieldArray({
    control,
    name: `${semesterPlanPrefix}.prosem_data.rows`,
  });

  const { fields: rppmFields, append: appendRppm, remove: removeRppm } = useFieldArray({
    control,
    name: `${semesterPlanPrefix}.prosem_data.rppm`,
  });

  const { fields: rpphFields, append: appendRpph, remove: removeRpph } = useFieldArray({
    control,
    name: `${semesterPlanPrefix}.learning_plan_data`,
  });

  return (
    <>
      <section className={activeTab === "assessment" ? "space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="border-b pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardCheck className="h-4 w-4" />Sumber nilai semester</div>
          <h3 className="mt-1 text-xl font-bold">Kebijakan Asesmen & Rapor</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tetapkan apakah mapel ini dinilai pada semester {selectedSemester}, jenis asesmen akhirnya, dan komposisi nilai rapor.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <p className="font-semibold">Keikutsertaan Rapor</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border bg-muted/20 p-3">
              <input type="checkbox" {...register(`${semesterPlanPrefix}.include_in_report`)} className="mt-1 h-4 w-4 accent-primary" />
              <span><span className="block text-sm font-semibold">Tampilkan mata pelajaran pada rapor semester</span><span className="mt-1 block text-xs text-muted-foreground">Nonaktifkan untuk program pendamping yang dinilai pada laporan terpisah.</span></span>
            </label>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <label className="font-semibold" htmlFor={`final-assessment-${selectedSemester}`}>Asesmen Akhir</label>
            <select id={`final-assessment-${selectedSemester}`} {...register(`${semesterPlanPrefix}.final_assessment_type`)} className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="sas">SAS - Sumatif Akhir Semester</option>
              <option value="asat">ASAT - Asesmen Sumatif Akhir Tahun</option>
              <option value="none">Tidak ada asesmen akhir</option>
            </select>
            <p className="mt-2 text-xs text-muted-foreground">Rekomendasi: Ganjil menggunakan SAS, Genap menggunakan ASAT.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-primary" />Bobot Nilai Rapor</p><p className="mt-1 text-xs text-muted-foreground">Bobot menjadi dasar perhitungan nilai akhir dan harus tepat 100%.</p></div>
            <span className={`w-fit rounded-md px-3 py-1.5 text-sm font-bold ${assessmentWeightTotal === 100 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>Total {assessmentWeightTotal}%</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "formatif", label: "Formatif" },
              { key: "sumatif_lingkup", label: "Sumatif Lingkup" },
              { key: "sts", label: "STS" },
              { key: "semester_final", label: finalAssessmentType === "asat" ? "ASAT" : finalAssessmentType === "none" ? "Tanpa Ujian Akhir" : "SAS" },
            ].map((item) => (
              <label key={item.key} className="rounded-md border p-3 text-xs font-semibold text-muted-foreground">
                {item.label}
                <div className="mt-2 flex items-center gap-2"><input type="number" min={0} max={100} {...register(`${semesterPlanPrefix}.assessment_weights.${item.key}`, { valueAsNumber: true })} className="w-full rounded-md border bg-background px-3 py-2 text-sm font-bold text-foreground" /><span>%</span></div>
              </label>
            ))}
          </div>
          {finalAssessmentType === "none" ? <p className="mt-3 text-xs font-medium text-amber-700">Atur bobot ujian akhir menjadi 0% dan distribusikan bobotnya ke komponen lain.</p> : null}
        </div>
      </section>

      <section className={activeTab === "prota" ? "space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ClipboardList className="h-4 w-4" />
              Setelah CP dan ATP fase selesai
            </div>
            <h3 className="mt-1 text-xl font-bold">Program Tahunan Per Kelas</h3>
            <p className="text-sm text-muted-foreground">
              Prota memecah ATP fase menjadi lingkup materi, unit/topik, dan alokasi waktu untuk kelas yang dipilih.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              appendProta({
                semester: "Ganjil",
                bulan: "",
                lingkup_materi: "",
                tujuan_pembelajaran: "",
                alokasi_waktu: "",
                asesmen: "",
              })
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah Baris
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-14 px-3 py-3 text-center">No</th>
                <th className="w-32 px-3 py-3">Semester</th>
                <th className="w-32 px-3 py-3">Bulan</th>
                <th className="px-3 py-3">Lingkup Materi / Topik</th>
                <th className="px-3 py-3">TP Turunan ATP</th>
                <th className="w-36 px-3 py-3">Alokasi</th>
                <th className="px-3 py-3">Asesmen</th>
                <th className="w-16 px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {protaFields.map((field, index) => (
                <tr key={field.id} className="align-top">
                  <td className="px-3 py-3 text-center font-semibold">{index + 1}</td>
                  <td className="px-3 py-3">
                    <select {...register(`prota_data.${index}.semester`)} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input {...register(`prota_data.${index}.bulan`)} className="w-full rounded-md border px-2 py-2 text-sm" placeholder="Juli" />
                  </td>
                  <td className="px-3 py-3">
                    <textarea {...register(`prota_data.${index}.lingkup_materi`)} rows={3} className="w-full rounded-md border px-2 py-2 text-sm" placeholder="Bab/unit/topik besar" />
                  </td>
                  <td className="px-3 py-3">
                    <textarea {...register(`prota_data.${index}.tujuan_pembelajaran`)} rows={3} className="w-full rounded-md border px-2 py-2 text-sm" placeholder="Tujuan pembelajaran turunan ATP" />
                  </td>
                  <td className="px-3 py-3">
                    <input {...register(`prota_data.${index}.alokasi_waktu`)} className="w-full rounded-md border px-2 py-2 text-sm" placeholder="8 JP / 2 pekan" />
                  </td>
                  <td className="px-3 py-3">
                    <textarea {...register(`prota_data.${index}.asesmen`)} rows={3} className="w-full rounded-md border px-2 py-2 text-sm" placeholder="Formatif, performa, proyek" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button type="button" onClick={() => removeProta(index)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" title="Hapus baris">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {protaFields.length === 0 && <EmptyState title="Prota belum diisi" description="Tambahkan baris untuk memetakan program satu tahun kelas ini." />}
      </section>

      <section className={activeTab === "promes" ? "space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarDays className="h-4 w-4" />
              Turunan Prota
            </div>
            <h3 className="mt-1 text-xl font-bold">Program Semester Per Minggu</h3>
            <p className="text-sm text-muted-foreground">
              Promes menata topik, TP, dan modul ajar per pekan supaya mudah diturunkan menjadi RPPM.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">JP/Minggu</span>
              <input {...register(`${semesterPlanPrefix}.weekly_hours`, { valueAsNumber: true })} type="number" min={1} max={48} className="w-16 bg-transparent text-sm font-bold outline-none" placeholder="0" />
            </div>
            <button
              type="button"
              onClick={() =>
                appendProsem({
                  semester: selectedSemester,
                  minggu: prosemFields.length + 1,
                  bulan: "",
                  topik: "",
                  tujuan_pembelajaran: "",
                  alokasi_jp: "",
                  modul_ajar: "",
                })
              }
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tambah Pekan
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {prosemFields.map((field, index) => (
            <div key={field.id} className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                  <div>
                    <p className="font-semibold">Pekan {index + 1}</p>
                    <p className="text-xs text-muted-foreground">{selectedSemester === "Ganjil" ? "Juli-Desember" : "Januari-Juni"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => removeProsem(index)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" title="Hapus pekan">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-2">
                  <FieldLabel>Minggu</FieldLabel>
                  <input {...register(`${semesterPlanPrefix}.prosem_data.rows.${index}.minggu`, { valueAsNumber: true })} type="number" min={1} className="w-full rounded-md border px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Bulan</FieldLabel>
                  <input {...register(`${semesterPlanPrefix}.prosem_data.rows.${index}.bulan`)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder={selectedSemester === "Ganjil" ? "Juli" : "Januari"} />
                </div>
                <div className="md:col-span-4">
                  <FieldLabel>Topik / Subtopik</FieldLabel>
                  <textarea {...register(`${semesterPlanPrefix}.prosem_data.rows.${index}.topik`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-4">
                  <FieldLabel>Tujuan Pembelajaran</FieldLabel>
                  <textarea {...register(`${semesterPlanPrefix}.prosem_data.rows.${index}.tujuan_pembelajaran`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Alokasi JP</FieldLabel>
                  <input {...register(`${semesterPlanPrefix}.prosem_data.rows.${index}.alokasi_jp`)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="4 JP" />
                </div>
                <div className="md:col-span-10">
                  <FieldLabel>Nama Modul Ajar</FieldLabel>
                  <input {...register(`${semesterPlanPrefix}.prosem_data.rows.${index}.modul_ajar`)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Judul modul/pertemuan utama pekan ini" />
                </div>
              </div>
            </div>
          ))}
          {prosemFields.length === 0 && <EmptyState title="Promes belum diisi" description="Tambahkan pekan agar alur semester terbaca rapi." />}
        </div>
      </section>

      <section className={activeTab === "rppm" ? "space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Layers3 className="h-4 w-4" />
              Turunan Promes
            </div>
            <h3 className="mt-1 text-xl font-bold">RPPM Per Pekan</h3>
            <p className="text-sm text-muted-foreground">
              RPPM merangkum fokus pekan, aktivitas, diferensiasi, asesmen, dan media sebelum dibuat RPPH.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              appendRppm({
                minggu: rppmFields.length + 1,
                topik: "",
                tujuan_pembelajaran: "",
                kegiatan_pembelajaran: "",
                diferensiasi: "",
                asesmen: "",
                media_sumber: "",
              })
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah RPPM
          </button>
        </div>

        <div className="grid gap-4">
          {rppmFields.map((field, index) => {
            const prefix = `${semesterPlanPrefix}.prosem_data.rppm.${index}`;
            return (
              <div key={field.id} className="rounded-lg border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">RPPM Pekan {index + 1}</p>
                    <p className="text-xs text-muted-foreground">Rencana pembelajaran mingguan kelas ini</p>
                  </div>
                  <button type="button" onClick={() => removeRppm(index)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" title="Hapus RPPM">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <FieldLabel>Minggu</FieldLabel>
                    <input {...register(`${prefix}.minggu`, { valueAsNumber: true })} type="number" min={1} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-10">
                    <FieldLabel>Topik Pekan</FieldLabel>
                    <input {...register(`${prefix}.topik`)} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Tujuan Pembelajaran</FieldLabel>
                    <textarea {...register(`${prefix}.tujuan_pembelajaran`)} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Kegiatan Pembelajaran</FieldLabel>
                    <textarea {...register(`${prefix}.kegiatan_pembelajaran`)} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-4">
                    <FieldLabel>Diferensiasi</FieldLabel>
                    <textarea {...register(`${prefix}.diferensiasi`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-4">
                    <FieldLabel>Asesmen</FieldLabel>
                    <textarea {...register(`${prefix}.asesmen`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-4">
                    <FieldLabel>Media & Sumber</FieldLabel>
                    <textarea {...register(`${prefix}.media_sumber`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            );
          })}
          {rppmFields.length === 0 && <EmptyState title="RPPM belum diisi" description="Tambahkan rencana mingguan setelah Promes tersusun." />}
        </div>
      </section>

      <section className={activeTab === "rpph" ? "space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarDays className="h-4 w-4" />
              Pelaksanaan Harian
            </div>
            <h3 className="mt-1 text-xl font-bold">RPPH / Modul Ajar Mandiri</h3>
            <p className="text-sm text-muted-foreground">
              Isi satu modul untuk satu pertemuan. Data ini tetap tersimpan di kolom modul ajar yang sudah ada.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              appendRpph({
                pertemuan: rpphFields.length + 1,
                minggu: "",
                topik: "",
                alokasi_waktu: "",
                tujuan_pembelajaran: "",
                asesmen_awal: "",
                pendahuluan: "",
                inti: "",
                penutup: "",
                asesmen: "",
                media_sumber: "",
              })
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah Modul
          </button>
        </div>

        <div className="grid gap-4">
          {rpphFields.map((field, index) => {
            const prefix = `${semesterPlanPrefix}.learning_plan_data.${index}`;
            return (
              <div key={field.id} className="rounded-lg border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Modul Ajar Pertemuan {index + 1}</p>
                    <p className="text-xs text-muted-foreground">RPPH atau modul ajar mandiri per pertemuan</p>
                  </div>
                  <button type="button" onClick={() => removeRpph(index)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" title="Hapus modul">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <FieldLabel>Pertemuan</FieldLabel>
                    <input {...register(`${prefix}.pertemuan`, { valueAsNumber: true })} type="number" min={1} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Minggu</FieldLabel>
                    <input {...register(`${prefix}.minggu`)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="1" />
                  </div>
                  <div className="md:col-span-5">
                    <FieldLabel>Topik</FieldLabel>
                    <input {...register(`${prefix}.topik`)} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-3">
                    <FieldLabel>Alokasi</FieldLabel>
                    <input {...register(`${prefix}.alokasi_waktu`)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="2 x 35 menit" />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Tujuan Pembelajaran</FieldLabel>
                    <textarea {...register(`${prefix}.tujuan_pembelajaran`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Asesmen Awal / Diagnostik</FieldLabel>
                    <textarea {...register(`${prefix}.asesmen_awal`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-4">
                    <FieldLabel>Pendahuluan</FieldLabel>
                    <textarea {...register(`${prefix}.pendahuluan`)} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-4">
                    <FieldLabel>Kegiatan Inti</FieldLabel>
                    <textarea {...register(`${prefix}.inti`)} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-4">
                    <FieldLabel>Penutup</FieldLabel>
                    <textarea {...register(`${prefix}.penutup`)} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Asesmen</FieldLabel>
                    <textarea {...register(`${prefix}.asesmen`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-6">
                    <FieldLabel>Media & Sumber</FieldLabel>
                    <textarea {...register(`${prefix}.media_sumber`)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            );
          })}
          {rpphFields.length === 0 && <EmptyState title="RPPH/Modul ajar belum diisi" description="Tambahkan modul ajar mandiri untuk setiap pertemuan yang diperlukan." />}
        </div>
      </section>
    </>
  );
};
