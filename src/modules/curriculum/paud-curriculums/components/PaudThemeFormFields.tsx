import React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Plus, Trash2, CalendarDays, LayoutList } from "lucide-react";

interface PaudThemeFormFieldsProps {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: FieldErrors<any>;
  activeTab: string;
}

export const PaudThemeFormFields: React.FC<PaudThemeFormFieldsProps> = ({ register, control, errors, activeTab }) => {
  const { fields: protaFields, append: appendProta, remove: removeProta } = useFieldArray({
    control,
    name: "prota_data",
  });

  const { fields: prosemFields, append: appendProsem, remove: removeProsem } = useFieldArray({
    control,
    name: "prosem_data.rows",
  });
  
  const prosemSemester = useWatch({ control, name: "prosem_data.semester" }) || "Ganjil";

  const { fields: rppmFields, append: appendRppm, remove: removeRppm } = useFieldArray({
    control,
    name: "rppm_data",
  });

  const { fields: rpphFields, append: appendRpph, remove: removeRpph } = useFieldArray({
    control,
    name: "rpph_data",
  });

  return (
    <>
      {/* PROTA & PROSEM SECTION */}
      <div className={activeTab === "program" ? "space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        
        {/* PROTA */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-semibold text-foreground">Program Tahunan (Prota) PAUD</h3>
            <button
              type="button"
              onClick={() => appendProta({ tujuan_pembelajaran: "", materi_pokok: "", alokasi_waktu: "" })}
              className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 font-medium"
            >
              <Plus className="w-4 h-4" /> Tambah Baris Prota
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 border-r border-border w-12 text-center">No</th>
                  <th className="p-3 border-r border-border">Tujuan Pembelajaran</th>
                  <th className="p-3 border-r border-border">Materi Pokok / Sub Tema</th>
                  <th className="p-3 border-r border-border w-32">Alokasi Waktu</th>
                  <th className="p-3 w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {protaFields.map((field, index) => (
                  <tr key={field.id} className="border-b">
                    <td className="p-2 text-center font-medium">{index + 1}</td>
                    <td className="p-2">
                      <textarea {...register(`prota_data.${index}.tujuan_pembelajaran`)} rows={2} className="w-full border rounded p-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Tujuan Pembelajaran..." />
                    </td>
                    <td className="p-2">
                      <textarea {...register(`prota_data.${index}.materi_pokok`)} rows={2} className="w-full border rounded p-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Materi Pokok / Sub Tema..." />
                    </td>
                    <td className="p-2">
                      <input {...register(`prota_data.${index}.alokasi_waktu`)} type="text" className="w-full border rounded p-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="e.g. 2 Minggu" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeProta(index)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {protaFields.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">Belum ada baris Prota.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PROSEM */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-semibold text-foreground">Program Semester (Promes) PAUD</h3>
            <div className="flex gap-4 items-center">
              <select
                {...register("prosem_data.semester")}
                className="border border-input rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 text-foreground bg-background"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
              <button
                type="button"
                onClick={() => appendProsem({ materi_pokok: "", total_minggu: "", bulan1: "", bulan2: "", bulan3: "", bulan4: "", bulan5: "", bulan6: "" })}
                className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 font-medium"
              >
                <Plus className="w-4 h-4" /> Tambah Baris Promes
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Isi rincian kegiatan dan alokasi waktu per minggu untuk tiap bulan.</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2 border-r border-border">Topik / Sub Topik</th>
                  <th className="p-2 border-r border-border w-24">Durasi</th>
                  {prosemSemester === "Ganjil" ? (
                    <>
                      <th className="p-2 border-r border-border w-24">Juli</th>
                      <th className="p-2 border-r border-border w-24">Agustus</th>
                      <th className="p-2 border-r border-border w-24">September</th>
                      <th className="p-2 border-r border-border w-24">Oktober</th>
                      <th className="p-2 border-r border-border w-24">November</th>
                      <th className="p-2 border-r border-border w-24">Desember</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 border-r border-border w-24">Januari</th>
                      <th className="p-2 border-r border-border w-24">Februari</th>
                      <th className="p-2 border-r border-border w-24">Maret</th>
                      <th className="p-2 border-r border-border w-24">April</th>
                      <th className="p-2 border-r border-border w-24">Mei</th>
                      <th className="p-2 border-r border-border w-24">Juni</th>
                    </>
                  )}
                  <th className="p-2 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {prosemFields.map((field, index) => (
                  <tr key={field.id} className="border-b">
                    <td className="p-1">
                      <textarea {...register(`prosem_data.rows.${index}.materi_pokok`)} rows={2} className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="Topik..." />
                    </td>
                    <td className="p-1">
                      <input {...register(`prosem_data.rows.${index}.total_minggu`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="Minggu" />
                    </td>
                    <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan1`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="M1, M2" /></td>
                    <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan2`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="M1, M2" /></td>
                    <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan3`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="M1, M2" /></td>
                    <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan4`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="M1, M2" /></td>
                    <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan5`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="M1, M2" /></td>
                    <td className="p-1"><input {...register(`prosem_data.rows.${index}.bulan6`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="M1, M2" /></td>
                    <td className="p-1 text-center">
                      <button type="button" onClick={() => removeProsem(index)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
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
      </div>

      {/* RPPM SECTION */}
      <div className={activeTab === "rppm" ? "space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex justify-between items-center border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">RPPM (Rencana Pelaksanaan Pembelajaran Mingguan)</h3>
            <p className="text-sm text-muted-foreground mt-1">Rencanakan ragam kegiatan main untuk setiap minggu dalam tema ini.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              appendRppm({ 
                minggu_ke: rppmFields.length + 1, 
                tujuan_kegiatan: "", 
                materi: "",
                rencana_kegiatan: ""
              });
            }}
            className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <LayoutList className="w-4 h-4" /> Tambah Minggu (RPPM)
          </button>
        </div>
        
        <div className="space-y-6">
          {rppmFields.map((field, index) => {
            const prefix = `rppm_data.${index}`;
            return (
              <div key={field.id} className="bg-card p-5 rounded-xl border border-border shadow-sm relative group space-y-5">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => removeRppm(index)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md bg-background border shadow-sm" title="Hapus Minggu Ini">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 pb-3 border-b border-border">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg border-2 border-primary/20">
                    M{index + 1}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h4 className="font-bold text-foreground">Perencanaan Minggu Ke-{index + 1}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-muted-foreground">Tujuan Kegiatan</label>
                      <textarea {...register(`${prefix}.tujuan_kegiatan`)} rows={3} className="w-full border border-input rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Tujuan yang ingin dicapai pada minggu ini..." />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-muted-foreground">Materi Pembelajaran</label>
                      <textarea {...register(`${prefix}.materi`)} rows={3} className="w-full border border-input rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Cakupan materi yang dikenalkan..." />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block text-muted-foreground">Ragam Rencana Kegiatan Main</label>
                      <textarea {...register(`${prefix}.rencana_kegiatan`)} rows={7} className="w-full border border-input rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="- Membuat bentuk dari plastisin&#10;- Bermain peran sebagai dokter&#10;- Melukis dengan jari..." />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {rppmFields.length === 0 && (
            <div className="text-center p-8 bg-muted/50 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Belum ada perencanaan mingguan. Silakan klik "Tambah Minggu".</p>
            </div>
          )}
        </div>
      </div>

      {/* RPPH SECTION */}
      <div className={activeTab === "rpph" ? "space-y-6 bg-muted/30 p-6 rounded-xl border border-border animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex justify-between items-center border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">RPPH / Modul Ajar Harian</h3>
            <p className="text-sm text-muted-foreground mt-1">Buat Rencana Pelaksanaan Pembelajaran Harian yang merinci kegiatan dari penyambutan hingga kepulangan.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              appendRpph({ 
                hari_ke: rpphFields.length + 1,
                topik_harian: "",
                tujuan_pembelajaran: "",
                kegiatan_pembuka: "", 
                kegiatan_inti: "", 
                kegiatan_penutup: "",
                asesmen: "",
                alat_bahan: ""
              });
            }}
            className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <CalendarDays className="w-4 h-4" /> Tambah Hari (RPPH)
          </button>
        </div>
        
        <div className="space-y-6">
          {rpphFields.map((field, index) => {
            const prefix = `rpph_data.${index}`;
            return (
              <div key={field.id} className="bg-card p-5 rounded-xl border border-border shadow-sm relative group space-y-5">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => removeRpph(index)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md bg-background border shadow-sm" title="Hapus RPPH Ini">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Header RPPH */}
                <div className="flex flex-wrap items-center gap-4 pb-3 border-b border-border">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg border-2 border-primary/20">
                    H{index + 1}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h4 className="font-bold text-foreground mb-1">RPPH Hari Ke-{index + 1}</h4>
                    <input {...register(`${prefix}.topik_harian`)} type="text" className="border border-input rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 w-full max-w-md" placeholder="Sub Topik / Fokus Harian..." />
                  </div>
                </div>

                {/* Info RPPH */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-muted-foreground">Tujuan Pembelajaran Harian</label>
                    <textarea {...register(`${prefix}.tujuan_pembelajaran`)} rows={2} className="w-full border border-input rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Anak mampu..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-muted-foreground">Alat dan Bahan Main</label>
                    <textarea {...register(`${prefix}.alat_bahan`)} rows={2} className="w-full border border-input rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Balok, crayon, kertas..." />
                  </div>
                </div>

                {/* Langkah Skenario Harian */}
                <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-4">
                  <h5 className="font-semibold text-sm text-foreground">Skenario Kegiatan Harian</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Kegiatan Pijakan / Pembuka</label>
                      <textarea {...register(`${prefix}.kegiatan_pembuka`)} rows={4} className="w-full border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Penyambutan, doa, bernyanyi, apersepsi..." />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-primary">Kegiatan Inti (Bermain Bermakna)</label>
                      <textarea {...register(`${prefix}.kegiatan_inti`)} rows={4} className="w-full border border-primary/30 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary bg-background" placeholder="Anak memilih kegiatan main..." />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Kegiatan Penutup & Recalling</label>
                      <textarea {...register(`${prefix}.kegiatan_penutup`)} rows={4} className="w-full border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Recalling perasaan anak, pesan moral, doa pulang..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Rencana Penilaian / Asesmen</label>
                    <textarea {...register(`${prefix}.asesmen`)} rows={2} className="w-full border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Catatan anekdot, hasil karya, ceklis..." />
                  </div>
                </div>
              </div>
            );
          })}
          
          {rpphFields.length === 0 && (
            <div className="text-center p-8 bg-muted/10 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Belum ada Modul Ajar Harian (RPPH). Silakan klik "Tambah Hari".</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
