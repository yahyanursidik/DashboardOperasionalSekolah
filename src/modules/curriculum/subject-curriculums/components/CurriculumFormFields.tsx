import React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Plus, Trash2, CalendarDays } from "lucide-react";

interface CurriculumFormFieldsProps {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: FieldErrors<any>;
  activeTab: string;
}

export const CurriculumFormFields: React.FC<CurriculumFormFieldsProps> = ({ register, control, errors, activeTab }) => {
  const { fields: tpFields, append: appendTp, remove: removeTp } = useFieldArray({
    control,
    name: "tp_data",
  });

  const { fields: protaFields, append: appendProta, remove: removeProta } = useFieldArray({
    control,
    name: "prota_data",
  });

  const { fields: prosemFields, append: appendProsem, remove: removeProsem } = useFieldArray({
    control,
    name: "prosem_data.rows",
  });
  
  const prosemSemester = useWatch({ control, name: "prosem_data.semester" }) || "Ganjil";

  const { fields: modulFields, append: appendModul, remove: removeModul } = useFieldArray({
    control,
    name: "learning_plan_data",
  });

  return (
    <>
      {/* TP & ITP SECTION */}
      <div className={activeTab === "tp" ? "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">Tujuan Pembelajaran & Indikator</h3>
          <button
            type="button"
            onClick={() => appendTp({ tujuan: "", indikator: "" })}
            className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 font-medium"
          >
            <Plus className="w-4 h-4" /> Tambah TP
          </button>
        </div>
        
        <div className="space-y-4">
          {tpFields.map((field, index) => (
            <div key={field.id} className="bg-muted/30 p-4 rounded-lg border relative group">
              <button
                type="button"
                onClick={() => removeTp(index)}
                className="absolute top-4 right-4 p-1.5 text-destructive hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="space-y-3 pr-8">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Tujuan Pembelajaran {index + 1}</label>
                  <textarea {...register(`tp_data.${index}.tujuan`)} rows={2} className="w-full border rounded p-2 text-sm" placeholder="Peserta didik dapat..." />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Indikator Ketercapaian (ITP)</label>
                  <textarea {...register(`tp_data.${index}.indikator`)} rows={3} className="w-full border rounded p-2 text-sm" placeholder="1. Mampu mengidentifikasi...\n2. Mampu menjelaskan..." />
                </div>
              </div>
            </div>
          ))}
          {tpFields.length === 0 && (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
              Belum ada Tujuan Pembelajaran yang ditambahkan.
            </div>
          )}
        </div>
      </div>

      {/* PROTA SECTION */}
      <div className={activeTab === "prota" ? "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">Program Tahunan (Prota)</h3>
          <button
            type="button"
            onClick={() => appendProta({ atp: "", materi_pokok: "", elemen: "", alokasi_waktu: "" })}
            className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-medium"
          >
            <Plus className="w-4 h-4" /> Tambah Baris Prota
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3 border-b w-12 text-center">No</th>
                <th className="p-3 border-b">Alur Tujuan Pembelajaran (ATP)</th>
                <th className="p-3 border-b">Materi Pokok</th>
                <th className="p-3 border-b">Elemen Deep Learning</th>
                <th className="p-3 border-b w-32">Alokasi Waktu</th>
                <th className="p-3 border-b w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {protaFields.map((field, index) => (
                <tr key={field.id} className="border-b">
                  <td className="p-2 text-center font-medium">{index + 1}</td>
                  <td className="p-2">
                    <textarea {...register(`prota_data.${index}.atp`)} rows={2} className="w-full border rounded p-1.5 text-sm" placeholder="ATP..." />
                  </td>
                  <td className="p-2">
                    <textarea {...register(`prota_data.${index}.materi_pokok`)} rows={2} className="w-full border rounded p-1.5 text-sm" placeholder="Materi..." />
                  </td>
                  <td className="p-2">
                    <textarea {...register(`prota_data.${index}.elemen`)} rows={2} className="w-full border rounded p-1.5 text-sm" placeholder="Mindful/Meaningful/Joyful..." />
                  </td>
                  <td className="p-2">
                    <input {...register(`prota_data.${index}.alokasi_waktu`)} type="text" className="w-full border rounded p-1.5 text-sm" placeholder="e.g. 10 JP" />
                  </td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => removeProta(index)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {protaFields.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">Belum ada baris Prota.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROSEM SECTION */}
      <div className={activeTab === "promes" ? "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">Program Semester (Promes)</h3>
          <div className="flex gap-4 items-center">
            <select
              {...register("prosem_data.semester")}
              className="border rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
            <button
              type="button"
              onClick={() => appendProsem({ materi_pokok: "", total_jp: "", bulan1: "", bulan2: "", bulan3: "", bulan4: "", bulan5: "", bulan6: "" })}
              className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-medium"
            >
              <Plus className="w-4 h-4" /> Tambah Baris Promes
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Isi alokasi JP per pekan pada kolom bulan di bawah ini.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-2 border-b">Materi Pokok</th>
                <th className="p-2 border-b w-24">Total JP</th>
                {prosemSemester === "Ganjil" ? (
                  <>
                    <th className="p-2 border-b w-24">Juli</th>
                    <th className="p-2 border-b w-24">Agustus</th>
                    <th className="p-2 border-b w-24">September</th>
                    <th className="p-2 border-b w-24">Oktober</th>
                    <th className="p-2 border-b w-24">November</th>
                    <th className="p-2 border-b w-24">Desember</th>
                  </>
                ) : (
                  <>
                    <th className="p-2 border-b w-24">Januari</th>
                    <th className="p-2 border-b w-24">Februari</th>
                    <th className="p-2 border-b w-24">Maret</th>
                    <th className="p-2 border-b w-24">April</th>
                    <th className="p-2 border-b w-24">Mei</th>
                    <th className="p-2 border-b w-24">Juni</th>
                  </>
                )}
                <th className="p-2 border-b w-12">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {prosemFields.map((field, index) => (
                <tr key={field.id} className="border-b">
                  <td className="p-1">
                    <textarea {...register(`prosem_data.rows.${index}.materi_pokok`)} rows={2} className="w-full border rounded p-1.5 text-xs" placeholder="Materi..." />
                  </td>
                  <td className="p-1">
                    <input {...register(`prosem_data.rows.${index}.total_jp`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="JP" />
                  </td>
                  <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan1`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="Pekan..." /></td>
                  <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan2`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="Pekan..." /></td>
                  <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan3`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="Pekan..." /></td>
                  <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan4`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="Pekan..." /></td>
                  <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan5`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="Pekan..." /></td>
                  <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan6`)} type="text" className="w-full border rounded p-1.5 text-xs" placeholder="Pekan..." /></td>
                  <td className="p-1 text-center">
                    <button type="button" onClick={() => removeProsem(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {prosemFields.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-muted-foreground">Belum ada baris Promes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODUL AJAR SECTION */}
      <div className={activeTab === "modul" ? "space-y-6 bg-blue-50/30 p-6 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex justify-between items-center border-b border-blue-200 pb-4">
          <div>
            <h3 className="text-xl font-bold text-blue-800">Modul Ajar / Skenario Pembelajaran (RPPH)</h3>
            <p className="text-sm text-blue-600/80 mt-1">Satu modul ajar untuk satu kali pertemuan. Tambahkan hingga 14-18 pertemuan per semester.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (modulFields.length >= 18) {
                alert("Maksimal 18 Modul Ajar per semester.");
                return;
              }
              appendModul({ 
                jenis: "KBM", 
                topik: "", 
                alokasi_waktu: "",
                tujuan_pembelajaran: "",
                pemahaman_bermakna: "",
                pertanyaan_pemantik: "",
                asesmen_awal: "",
                pendahuluan: "", 
                inti: "", 
                penutup: "",
                media: ""
              });
            }}
            className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <CalendarDays className="w-4 h-4" /> Tambah Modul Ajar (Pertemuan)
          </button>
        </div>
        
        <div className="space-y-6">
          {modulFields.map((field, index) => {
            const prefix = `learning_plan_data.${index}`;
            return (
              <div key={field.id} className="bg-white p-5 rounded-xl border shadow-sm relative group space-y-5">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => removeModul(index)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md bg-white border shadow-sm" title="Hapus Modul Ini">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Header Modul */}
                <div className="flex flex-wrap items-center gap-4 pb-3 border-b">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg border-2 border-primary/20">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h4 className="font-bold text-foreground mb-1">Modul Ajar Pertemuan {index + 1}</h4>
                    <select
                      {...register(`${prefix}.jenis`)}
                      className="border rounded-md px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-primary/50 bg-primary/5 text-primary w-max"
                    >
                      <option value="KBM">Kegiatan Belajar Mengajar (KBM)</option>
                      <option value="ASTS">Asesmen Sumatif Tengah Semester (ASTS)</option>
                      <option value="ASAS">Asesmen Sumatif Akhir Semester (ASAS)</option>
                      <option value="ASAT">Asesmen Akhir Tahun (ASAT)</option>
                      <option value="SASA">Sumatif Akhir Satuan Pendidikan (SASA)</option>
                    </select>
                  </div>
                </div>

                {/* Info & Komponen Inti */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-slate-700">Topik / Judul Pembelajaran</label>
                      <input {...register(`${prefix}.topik`)} type="text" className="w-full border rounded-md px-3 py-1.5 text-sm" placeholder="Contoh: Siklus Air" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-slate-700">Tujuan Pembelajaran (TP)</label>
                      <textarea {...register(`${prefix}.tujuan_pembelajaran`)} rows={2} className="w-full border rounded-md px-3 py-1.5 text-sm" placeholder="Peserta didik dapat menganalisis..." />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-slate-700">Pemahaman Bermakna & Pemantik</label>
                      <textarea {...register(`${prefix}.pemahaman_bermakna`)} rows={2} className="w-full border rounded-md px-3 py-1.5 text-sm" placeholder="Kaitan dengan kehidupan nyata & pertanyaan pancingan..." />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-slate-700">Alokasi Waktu</label>
                      <input {...register(`${prefix}.alokasi_waktu`)} type="text" className="w-full border rounded-md px-3 py-1.5 text-sm" placeholder="Contoh: 2 x 35 Menit" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-slate-700">Asesmen Awal / Diagnostik</label>
                      <textarea {...register(`${prefix}.asesmen_awal`)} rows={2} className="w-full border rounded-md px-3 py-1.5 text-sm" placeholder="Cara mengetahui kesiapan belajar..." />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-slate-700">Media & Sumber Belajar</label>
                      <textarea {...register(`${prefix}.media`)} rows={2} className="w-full border rounded-md px-3 py-1.5 text-sm" placeholder="Buku, video, proyektor..." />
                    </div>
                  </div>
                </div>

                {/* Langkah Skenario */}
                <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                  <h5 className="font-semibold text-sm text-slate-800">Langkah-Langkah Kegiatan Pembelajaran</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium mb-1 block text-slate-600">Kegiatan Pendahuluan</label>
                      <textarea {...register(`${prefix}.pendahuluan`)} rows={4} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Apersepsi, motivasi..." />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-blue-700">Kegiatan Inti (Deep Learning)</label>
                      <textarea {...register(`${prefix}.inti`)} rows={4} className="w-full border rounded-md px-3 py-2 text-sm border-blue-200 focus:ring-blue-500" placeholder="Mindful, Meaningful, Joyful..." />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-slate-600">Kegiatan Penutup</label>
                      <textarea {...register(`${prefix}.penutup`)} rows={4} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Refleksi, evaluasi..." />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {modulFields.length === 0 && (
            <div className="text-center p-8 bg-white/50 rounded-xl border border-dashed border-blue-200">
              <p className="text-sm text-blue-600/80">Belum ada Modul Ajar. Silakan klik tombol "Tambah Modul Ajar".</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
