import React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import * as Papa from "papaparse";
import { toast } from "sonner";
import { Plus, Trash2, CalendarDays, LayoutList, Sparkles, Upload } from "lucide-react";
import { foundationProsemTemplate, foundationProtaTemplate } from "../paudCurriculumTemplates";

interface PaudThemeFormFieldsProps {
  register: UseFormRegister<any>;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
  activeTab: string;
}

const readImportRows = async (file: File): Promise<any[]> => {
  const text = await file.text();

  if (file.name.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    if (Array.isArray(parsed.data)) return parsed.data;
    throw new Error("JSON harus berupa array, atau object dengan field rows/data.");
  }

  const result = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length) {
    throw new Error(result.errors[0]?.message || "Format CSV tidak valid.");
  }

  return result.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
};

const cleanRow = (row: Record<string, any>) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : value]));

const asNumber = (value: any, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ImportButton: React.FC<{
  label: string;
  accept?: string;
  onImport: (file: File) => void;
}> = ({ label, accept = ".csv,.json", onImport }) => {
  const inputId = React.useId();

  return (
    <label
      htmlFor={inputId}
      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
    >
      <Upload className="h-4 w-4" /> {label}
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
};

const rppmTkaWeek1Template = {
  minggu_ke: 1,
  grade_level: 0,
  satuan_pendidikan: "Tarbiyah Sunnah Lab School Preschool",
  jenjang_kelas: "TK A / Usia 4-5 Tahun",
  semester: "Semester I / Gasal",
  bulan: "Juli 2026",
  fase: "Fondasi",
  topik: "MPLS",
  subtopik: "Sekolahku Majelis Ilmu",
  modul_ajar: "Aku Datang ke Sekolah dengan Adab",
  alokasi_waktu: "5 x 3 JP",
  model_pembelajaran: "Play Based Learning, Inkuiri Sederhana, Pembiasaan, Talaqqi, dan Keteladanan",
  karakter_khas:
    "Tauhid, adab menuntut ilmu, doa sebelum belajar, salam, izin, kemandirian awal, dan adaptasi sekolah dengan bahagia",
  cp_agama:
    "Murid mulai mengenal dan mempraktikkan ajaran pokok agama Islam melalui doa, salam, adab kepada guru, adab kepada teman, serta kebiasaan baik di lingkungan sekolah.",
  cp_jati_diri:
    "Murid mengenali dirinya sebagai bagian dari keluarga dan satuan pendidikan, mulai menyesuaikan diri dengan lingkungan sekolah, aturan kelas, guru, dan teman.",
  cp_literasi:
    "Murid mengenali informasi sederhana tentang lingkungan sekolah, mengomunikasikan perasaan dan kebutuhan, serta mengekspresikan pengalaman awal sekolah melalui karya, cerita, dan bermain.",
  tujuan_mingguan:
    "1. Mengenal sekolah sebagai tempat belajar kebaikan dan majelis ilmu secara sederhana.\n2. Mengenal ustadzah, teman, kelas, toilet, tempat wudhu, halaman, dan aturan dasar sekolah.\n3. Membiasakan salam, meminta izin, duduk dengan tenang, mendengarkan guru, dan menunggu giliran.\n4. Mengikuti doa sebelum belajar, basmalah, hamdalah, dan dzikir pendek dengan bimbingan.\n5. Mengungkapkan perasaan saat datang ke sekolah, seperti senang, malu, takut, atau rindu orang tua.\n6. Mulai mandiri dalam kegiatan sederhana: menyimpan tas, melepas/merapikan sepatu atau sandal, mencuci tangan, dan merapikan alat main.\n7. Berinteraksi dengan teman secara aman, lembut, dan santun.\n8. Mengenal bahwa belajar adalah nikmat dari Allah dan dilakukan karena Allah.",
  penguatan_tsls:
    "Aqidah dan Manhaj: Anak dikenalkan bahwa Allah memberi nikmat ilmu, guru, teman, dan sekolah.\nAdab dan Akhlak: Adab masuk kelas, salam, izin, duduk di majelis ilmu, mendengarkan guru, tidak menyakiti teman.\nAl-Qur'an: Anak mengenal halaqah kecil, duduk saat talaqqi, menyimak bacaan guru, dan menjaga Iqro/mushaf.\nHadits Pendek: Pengenalan hadits sederhana 'Jangan marah' untuk mengelola emosi dan bermain bersama.\nDoa dan Dzikir Harian: Basmalah sebelum kegiatan, hamdalah setelah kegiatan, doa sebelum belajar dengan bimbingan.\nTarbiyah Jinsiah: Anak mengenal identitas diri laki-laki/perempuan secara sederhana, menjaga tubuh, toilet dengan adab, dan meminta bantuan kepada ustadzah saat perlu.\nKemandirian: Menyimpan tas, melepas/merapikan alas kaki, mencuci tangan, antre, dan merapikan mainan.\nHidden Curriculum: Penyambutan pagi, rutinitas salam, doa, halaqah, makan dengan adab, toilet training, pulang dengan tertib.",
  kegiatan_inti_mingguan: [
    {
      hari: "Hari 1",
      fokus: "Aku Datang ke Sekolah",
      kegiatan:
        "Anak disambut dengan salam; mengenal ustadzah dan teman; school tour sederhana: kelas, toilet, tempat wudhu, rak tas, rak sepatu/sandal; praktik menyimpan tas dan alas kaki; mengenal kalimat 'Sekolah adalah tempat belajar kebaikan.'",
      alat_bahan: "Kartu nama anak, label rak, gambar sederhana area sekolah, stiker nama, alas duduk halaqah",
    },
    {
      hari: "Hari 2",
      fokus: "Adab Masuk Kelas dan Majelis Ilmu",
      kegiatan:
        "Praktik masuk kelas dengan salam; duduk melingkar; mendengarkan ustadzah; latihan mengangkat tangan saat ingin bicara; talaqqi basmalah dan doa sebelum belajar; permainan 'Aku bisa duduk baik.'",
      alat_bahan: "Kartu adab kelas, poster sederhana adab majelis ilmu, alas duduk, kartu ekspresi wajah",
    },
    {
      hari: "Hari 3",
      fokus: "Aku dan Teman Baruku",
      kegiatan:
        "Permainan perkenalan tanpa musik; anak menyebut nama diri dengan bantuan; bermain berpasangan memindahkan bola/alat main; praktik meminta izin meminjam barang; mengenal hadits 'Jangan marah' dalam konteks bermain bersama.",
      alat_bahan: "Bola kecil, kartu nama, keranjang, loose parts aman, kartu kata: salam, izin, maaf, terima kasih",
    },
    {
      hari: "Hari 4",
      fokus: "Sekolahku Bersih dan Tertib",
      kegiatan:
        "Mengenal area cuci tangan dan toilet; praktik mencuci tangan; membuang sampah pada tempatnya; merapikan mainan setelah digunakan; cerita pendek tentang anak yang menjaga kebersihan sebagai bentuk syukur kepada Allah.",
      alat_bahan: "Sabun, lap/tisu, tempat sampah, gambar urutan cuci tangan, mainan kelas, keranjang penyimpanan",
    },
    {
      hari: "Hari 5",
      fokus: "Alhamdulillah, Aku Mulai Berani Sekolah",
      kegiatan:
        "Review kegiatan pekan pertama; anak memilih gambar ekspresi perasaan; membuat karya sederhana 'Sekolahku Majelis Ilmu' berupa kolase kelas/masjid ilmu tanpa gambar makhluk bernyawa; muraja'ah salam, basmalah, hamdalah, doa belajar; apresiasi adab anak.",
      alat_bahan: "Kertas HVS/karton, potongan bentuk geometri, lem, krayon, stiker bintang/adab, kartu ekspresi",
    },
  ],
  pembiasaan_harian:
    "Kedatangan: Salam, menyapa guru, menyimpan alas kaki dan tas.\nPembukaan: Basmalah, doa sebelum belajar, dzikir pendek.\nHalaqah: Duduk melingkar, mendengar guru, menunggu giliran.\nTransisi Kegiatan: Berjalan tertib, tidak berlari di dalam kelas, meminta izin.\nMakan/Minum: Cuci tangan, basmalah, tangan kanan, duduk, hamdalah.\nToilet: Meminta izin, menjaga aurat, mencuci tangan.\nBermain: Tidak merebut, tidak memukul, meminta izin, bergiliran.\nPenutup: Merapikan alat, hamdalah, doa pulang, salam.",
  asesmen_mingguan:
    "Adaptasi Sekolah: Anak mulai mau masuk kelas, mengenal guru, dan mengikuti rutinitas dengan bimbingan.\nAdab: Anak mengucapkan salam, meminta izin, mendengarkan guru, dan menunggu giliran.\nSosial-Emosional: Anak mulai berinteraksi dengan teman, menyampaikan perasaan, dan tidak menyakiti teman.\nKemandirian: Anak mencoba menyimpan tas, merapikan alas kaki, mencuci tangan, dan merapikan mainan.\nBahasa: Anak menyebut nama diri, menjawab pertanyaan sederhana, dan menggunakan kata baik.\nNilai Agama: Anak mengikuti basmalah, hamdalah, doa belajar, dan memahami sekolah sebagai tempat belajar kebaikan.\nAl-Qur'an: Anak mulai duduk saat halaqah, menyimak guru, dan menirukan bacaan pendek.\nMotorik: Anak mengikuti permainan sederhana, memindahkan benda, menempel, dan merapikan alat.\nKategori: BB, MB, BSH, BSB.",
  catatan_guru:
    "Minggu pertama bukan waktu untuk mengejar materi, tetapi membangun rasa aman, kedekatan, kepercayaan, dan adab dasar. Anak yang menangis, takut, atau belum mau berpisah dari orang tua diberi waktu adaptasi dengan lembut. Guru menghindari bentakan, ancaman, atau perbandingan antar anak. Semua instruksi dibuat singkat, jelas, dan diulang dengan contoh.",
  umpan_balik_guru:
    "MasyaAllah, anak-anak sudah mulai belajar datang ke sekolah dengan adab. Pekan ini anak-anak belajar mengucapkan salam, mengenal ustadzah, mengenal teman, duduk di halaqah, mendengarkan guru, menyimpan tas, mencuci tangan, dan merapikan mainan. Semoga Allah menjadikan langkah pertama anak-anak di sekolah ini sebagai awal kebaikan, ilmu yang bermanfaat, adab yang indah, dan kecintaan kepada Al-Qur'an serta Sunnah.",
};

const createEmptyRppmRow = (week: number) => ({
  minggu_ke: week,
  grade_level: "",
  satuan_pendidikan: "Tarbiyah Sunnah Lab School Preschool",
  jenjang_kelas: "",
  semester: "",
  bulan: "",
  fase: "Fondasi",
  topik: "",
  subtopik: "",
  modul_ajar: "",
  alokasi_waktu: "",
  model_pembelajaran: "",
  karakter_khas: "",
  cp_agama: "",
  cp_jati_diri: "",
  cp_literasi: "",
  tujuan_mingguan: "",
  penguatan_tsls: "",
  kegiatan_inti_mingguan: Array.from({ length: 5 }, (_, index) => ({
    hari: `Hari ${index + 1}`,
    fokus: "",
    kegiatan: "",
    alat_bahan: "",
  })),
  pembiasaan_harian: "",
  asesmen_mingguan: "",
  catatan_guru: "",
  umpan_balik_guru: "",
});

export const PaudThemeFormFields: React.FC<PaudThemeFormFieldsProps> = ({ register, control, setValue, errors, activeTab }) => {
  const { fields: protaFields, append: appendProta, remove: removeProta } = useFieldArray({
    control,
    name: "prota_data",
  });
  const protaData = useWatch({ control, name: "prota_data" }) || [];

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

  const protaTotalWeeks = Array.isArray(protaData)
    ? protaData.reduce((total: number, row: any) => total + (Number.parseInt(String(row?.alokasi_waktu || ""), 10) || 0), 0)
    : 0;

  const importProta = async (file: File) => {
    try {
      const rows = (await readImportRows(file)).map((row) => {
        const item = cleanRow(row);
        return {
          bulan: item.bulan || item.BULAN || "",
          tema_topik:
            item.tema_topik ||
            item["tema / topik"] ||
            item["tema besar"] ||
            item.tema ||
            item.topik ||
            item.materi_pokok ||
            item.materi ||
            "",
          subtema_topik: item.subtema_topik || item["subtema / topik"] || item.subtema || "",
          alokasi_waktu: item.alokasi_waktu || item["alokasi waktu"] || item.alokasi || item.durasi || item.minggu || "",
          integrasi_khas: item.integrasi_khas || item["integrasi khas ts lab school"] || item.integrasi || "",
          semester: item.semester || item["semester i"] || item["gasal/ganjil"] || "Semester I (Gasal/Ganjil)",
        };
      });
      setValue("prota_data", rows, { shouldDirty: true });
      toast.success(`Berhasil impor ${rows.length} baris Prota`);
    } catch (error: any) {
      toast.error("Gagal impor Prota: " + error.message);
    }
  };

  const importProsem = async (file: File) => {
    try {
      const rows = (await readImportRows(file)).map((row, index) => {
        const item = cleanRow(row);
        return {
          minggu: asNumber(item.minggu || item.minggu_ke || item.week, index + 1),
          semester: item.semester || "Semester I (Gasal/Ganjil)",
          bulan: item.bulan || "",
          topik_subtopik: item.topik_subtopik || item["topik / subtopik"] || item.topik || item.materi_pokok || item.materi || "",
          modul_ajar: item.modul_ajar || item["modul ajar"] || item.modul || "",
        };
      });
      setValue("prosem_data.rows", rows, { shouldDirty: true });
      toast.success(`Berhasil impor ${rows.length} baris Prosem`);
    } catch (error: any) {
      toast.error("Gagal impor Prosem: " + error.message);
    }
  };

  const applyProtaTemplate = () => {
    setValue("prota_data", foundationProtaTemplate, { shouldDirty: true });
    toast.success("Template Prota berhasil diterapkan");
  };

  const applyProsemTemplate = () => {
    setValue("prosem_data", foundationProsemTemplate, { shouldDirty: true });
    toast.success("Template Prosem berhasil diterapkan");
  };

  const importRppm = async (file: File) => {
    try {
      const rows = (await readImportRows(file)).map((row, index) => {
        const item = cleanRow(row);
        return {
          minggu_ke: asNumber(item.minggu_ke || item.minggu || item.week, index + 1),
          grade_level: item.grade_level || "",
          satuan_pendidikan: item.satuan_pendidikan || "",
          jenjang_kelas: item.jenjang_kelas || item.kelas || "",
          semester: item.semester || "",
          bulan: item.bulan || "",
          fase: item.fase || "Fondasi",
          topik: item.topik || "",
          subtopik: item.subtopik || "",
          modul_ajar: item.modul_ajar || item.modul || "",
          alokasi_waktu: item.alokasi_waktu || "",
          model_pembelajaran: item.model_pembelajaran || "",
          karakter_khas: item.karakter_khas || "",
          cp_agama: item.cp_agama || "",
          cp_jati_diri: item.cp_jati_diri || "",
          cp_literasi: item.cp_literasi || "",
          tujuan_kegiatan: item.tujuan_kegiatan || item.tujuan || item.tp || "",
          tujuan_mingguan: item.tujuan_mingguan || item.tujuan_kegiatan || item.tujuan || item.tp || "",
          penguatan_tsls: item.penguatan_tsls || item.integrasi_khas || "",
          materi: item.materi || item.materi_pembelajaran || "",
          rencana_kegiatan: item.rencana_kegiatan || item.kegiatan || item.ragam_main || "",
          pembiasaan_harian: item.pembiasaan_harian || "",
          asesmen_mingguan: item.asesmen_mingguan || item.asesmen || "",
          catatan_guru: item.catatan_guru || "",
          umpan_balik_guru: item.umpan_balik_guru || "",
        };
      });
      setValue("rppm_data", rows, { shouldDirty: true });
      toast.success(`Berhasil impor ${rows.length} minggu RPPM`);
    } catch (error: any) {
      toast.error("Gagal impor RPPM: " + error.message);
    }
  };

  const importRpph = async (file: File) => {
    try {
      const rows = (await readImportRows(file)).map((row, index) => {
        const item = cleanRow(row);
        return {
          minggu_ke: asNumber(item.minggu_ke || item.minggu || item.week, 1),
          hari_ke: asNumber(item.hari_ke || item.hari || item.day, index + 1),
          grade_level: item.grade_level || "",
          topik_harian: item.topik_harian || item.topik || item.sub_topik || "",
          tujuan_pembelajaran: item.tujuan_pembelajaran || item.tujuan || item.tp || "",
          kegiatan_pembuka: item.kegiatan_pembuka || item.pembuka || "",
          kegiatan_inti: item.kegiatan_inti || item.inti || "",
          kegiatan_penutup: item.kegiatan_penutup || item.penutup || "",
          asesmen: item.asesmen || item.penilaian || "",
          alat_bahan: item.alat_bahan || item.alat || item.bahan || "",
        };
      });
      setValue("rpph_data", rows, { shouldDirty: true });
      toast.success(`Berhasil impor ${rows.length} RPPH/Modul Ajar`);
    } catch (error: any) {
      toast.error("Gagal impor RPPH: " + error.message);
    }
  };

  return (
    <>
      {/* PROTA SECTION */}
      <div className={activeTab === "prota" || activeTab === "program" ? "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Program Tahunan PAUD</p>
                <h3 className="mt-1 text-xl font-bold text-foreground">Pemetaan Tema / Topik Semester I dan II</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Susun urutan tema tahunan dari bulan, topik, dan alokasi waktu per pekan agar Prosem dapat diturunkan lebih rapi.
                </p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Total Baris</p>
                <p className="mt-1 text-2xl font-black text-foreground">{protaFields.length}</p>
                <p className="text-xs text-muted-foreground">tema/topik</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Estimasi Pekan</p>
                <p className="mt-1 text-2xl font-black text-foreground">{protaTotalWeeks}</p>
                <p className="text-xs text-muted-foreground">pekan belajar</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Format Tabel Prota</h3>
              <p className="text-sm text-muted-foreground mt-1">Kolom utama: No, Bulan, Tema Besar, Subtema/Topik, Alokasi Waktu, Integrasi Khas, dan Semester.</p>
              <p className="mt-1 text-xs text-muted-foreground">CSV/JSON: bulan, tema_topik, subtema_topik, alokasi_waktu, integrasi_khas, semester</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyProtaTemplate}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Sparkles className="h-4 w-4" /> Template Prota
              </button>
              <ImportButton label="Impor Prota" onImport={importProta} />
              <button
                type="button"
                onClick={() => appendProta({ bulan: "", tema_topik: "", subtema_topik: "", alokasi_waktu: "", integrasi_khas: "", semester: "Semester I (Gasal/Ganjil)" })}
                className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 font-medium"
              >
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm text-left border">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 border-r border-border w-14 text-center">No</th>
                  <th className="p-3 border-r border-border w-44">Bulan</th>
                  <th className="p-3 border-r border-border min-w-[240px]">Tema Besar</th>
                  <th className="p-3 border-r border-border min-w-[320px]">Subtema / Topik</th>
                  <th className="p-3 border-r border-border w-40">Alokasi Waktu</th>
                  <th className="p-3 border-r border-border min-w-[320px]">Integrasi Khas TS Lab School</th>
                  <th className="p-3 border-r border-border w-52">Semester</th>
                  <th className="p-3 w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {protaFields.map((field, index) => (
                  <tr key={field.id} className="border-b">
                    <td className="p-2 text-center font-medium">{index + 1}</td>
                    <td className="p-2">
                      <input {...register(`prota_data.${index}.bulan`)} type="text" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Juli" />
                    </td>
                    <td className="p-2">
                      <textarea {...register(`prota_data.${index}.tema_topik`)} rows={2} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="MPLS: Sekolahku Majelis Ilmu" />
                    </td>
                    <td className="p-2">
                      <textarea {...register(`prota_data.${index}.subtema_topik`)} rows={3} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Hari pertama sekolah, mengenal ustadzah..." />
                    </td>
                    <td className="p-2">
                      <input {...register(`prota_data.${index}.alokasi_waktu`)} type="text" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="4 pekan" />
                    </td>
                    <td className="p-2">
                      <textarea {...register(`prota_data.${index}.integrasi_khas`)} rows={3} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Adab menuntut ilmu, salam..." />
                    </td>
                    <td className="p-2">
                      <select {...register(`prota_data.${index}.semester`)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-primary/50 bg-background">
                        <option value="Semester I (Gasal/Ganjil)">Semester I (Gasal/Ganjil)</option>
                        <option value="Semester II (Genap)">Semester II (Genap)</option>
                      </select>
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
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">Belum ada baris Prota.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* PROSEM SECTION */}
      <div className={activeTab === "prosem" || activeTab === "program" ? "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Program Semester (Prosem) PAUD</h3>
              <p className="text-sm text-muted-foreground mt-1">Turunkan Prota menjadi urutan topik dan modul ajar per minggu.</p>
              <p className="mt-1 text-xs text-muted-foreground">CSV/JSON: minggu, bulan, topik_subtopik, modul_ajar</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                {...register("prosem_data.semester")}
                className="border border-input rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 text-foreground bg-background"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
                <option value="Ganjil & Genap">Semester Ganjil & Genap</option>
              </select>
              <button
                type="button"
                onClick={applyProsemTemplate}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Sparkles className="h-4 w-4" /> Template Prosem
              </button>
              <ImportButton label="Impor Prosem" onImport={importProsem} />
              <button
                type="button"
                onClick={() => appendProsem({ semester: prosemSemester === "Genap" ? "Semester II (Genap)" : "Semester I (Gasal/Ganjil)", minggu: prosemFields.length + 1, bulan: "", topik_subtopik: "", modul_ajar: "" })}
                className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 font-medium"
              >
                <Plus className="w-4 h-4" /> Tambah Baris Promes
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Isi rencana pekanan yang akan menjadi dasar penyusunan RPPM dan RPPH/Modul Ajar.</p>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm text-left border">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2 border-r border-border w-24 text-center">Minggu</th>
                  <th className="p-2 border-r border-border w-52">Semester</th>
                  <th className="p-2 border-r border-border w-36">Bulan</th>
                  <th className="p-2 border-r border-border min-w-[300px]">Topik / Subtopik</th>
                  <th className="p-2 border-r border-border min-w-[320px]">Modul Ajar</th>
                  <th className="p-2 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {prosemFields.map((field, index) => (
                  <tr key={field.id} className="border-b">
                    <td className="p-1">
                      <input {...register(`prosem_data.rows.${index}.minggu`, { valueAsNumber: true })} type="number" min={1} className="w-full border rounded p-1.5 text-xs text-center focus:ring-2 focus:ring-primary/50" placeholder="1" />
                    </td>
                    <td className="p-1">
                      <select {...register(`prosem_data.rows.${index}.semester`)} className="w-full border rounded p-1.5 text-xs bg-background focus:ring-2 focus:ring-primary/50">
                        <option value="Semester I (Gasal/Ganjil)">Semester I (Gasal/Ganjil)</option>
                        <option value="Semester II (Genap)">Semester II (Genap)</option>
                      </select>
                    </td>
                    <td className="p-1">
                      <input {...register(`prosem_data.rows.${index}.bulan`)} type="text" className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="Juli" />
                    </td>
                    <td className="p-1">
                      <textarea {...register(`prosem_data.rows.${index}.topik_subtopik`)} rows={2} className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="MPLS / Sekolahku Majelis Ilmu" />
                    </td>
                    <td className="p-1">
                      <textarea {...register(`prosem_data.rows.${index}.modul_ajar`)} rows={2} className="w-full border rounded p-1.5 text-xs focus:ring-2 focus:ring-primary/50" placeholder="Aku Datang ke Sekolah dengan Adab" />
                    </td>
                    <td className="p-1 text-center">
                      <button type="button" onClick={() => removeProsem(index)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {prosemFields.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">Belum ada baris Prosem.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* RPPM SECTION */}
      <div className={activeTab === "rppm" ? "space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
        <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">RPPM (Rencana Pelaksanaan Pembelajaran Mingguan)</h3>
            <p className="text-sm text-muted-foreground mt-1">Susun dokumen mingguan lengkap: identitas, tujuan, kegiatan inti, pembiasaan, asesmen, dan umpan balik.</p>
            <p className="mt-1 text-xs text-muted-foreground">CSV/JSON: minggu_ke, bulan, topik, subtopik, modul_ajar, tujuan_mingguan, pembiasaan_harian, asesmen_mingguan</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                appendRppm(rppmTkaWeek1Template);
                toast.success("Template RPPM TK A Pekan 1 ditambahkan");
              }}
              className="flex items-center gap-1 text-sm border border-primary/30 bg-primary/10 text-primary px-4 py-2 rounded-md hover:bg-primary/15 font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Template Pekan 1
            </button>
            <ImportButton label="Impor RPPM" onImport={importRppm} />
            <button
              type="button"
              onClick={() => {
                appendRppm(createEmptyRppmRow(rppmFields.length + 1));
              }}
              className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium shadow-sm transition-colors"
            >
              <LayoutList className="w-4 h-4" /> Tambah Minggu
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          {rppmFields.map((field, index) => {
            const prefix = `rppm_data.${index}`;
            return (
              <div key={field.id} className="bg-card p-5 rounded-lg border border-border relative group space-y-6">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  <button type="button" onClick={() => removeRppm(index)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md bg-background border shadow-sm" title="Hapus Minggu Ini">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-border pr-10">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg border-2 border-primary/20">
                    M{index + 1}
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <h4 className="font-bold text-foreground">RPPM Minggu Ke-{index + 1}</h4>
                    <p className="text-xs text-muted-foreground">Format dokumen mingguan PAUD berbasis Kurikulum Merdeka dan kekhasan TSLS.</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-bold text-foreground">A. Identitas</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Satuan Pendidikan<input {...register(`${prefix}.satuan_pendidikan`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Jenjang / Kelas<input {...register(`${prefix}.jenjang_kelas`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" placeholder="TK A / Usia 4-5 Tahun" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Semester<input {...register(`${prefix}.semester`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" placeholder="Semester I / Gasal" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Minggu Ke<input {...register(`${prefix}.minggu_ke`, { valueAsNumber: true })} type="number" min={1} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Bulan<input {...register(`${prefix}.bulan`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" placeholder="Juli 2026" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Fase<input {...register(`${prefix}.fase`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" placeholder="Fondasi" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Topik<input {...register(`${prefix}.topik`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Subtopik<input {...register(`${prefix}.subtopik`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Modul Ajar<input {...register(`${prefix}.modul_ajar`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Alokasi Waktu<input {...register(`${prefix}.alokasi_waktu`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground md:col-span-2">Model Pembelajaran<input {...register(`${prefix}.model_pembelajaran`)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground md:col-span-3">Karakter Khas TSLS<textarea {...register(`${prefix}.karakter_khas`)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" /></label>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-background p-4">
                  <p className="text-sm font-bold text-foreground">B. Tujuan Pembelajaran</p>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Nilai Agama dan Budi Pekerti<textarea {...register(`${prefix}.cp_agama`)} rows={4} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Jati Diri<textarea {...register(`${prefix}.cp_jati_diri`)} rows={4} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">Literasi, STEAM, Seni<textarea {...register(`${prefix}.cp_literasi`)} rows={4} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
                  </div>
                  <label className="block space-y-1 text-xs font-semibold text-muted-foreground">Tujuan Pembelajaran Mingguan<textarea {...register(`${prefix}.tujuan_mingguan`)} rows={6} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" placeholder="Tuliskan tujuan mingguan dalam nomor atau poin..." /></label>
                  <label className="block space-y-1 text-xs font-semibold text-muted-foreground">Poin Khusus Tarbiyah Sunnah Lab School<textarea {...register(`${prefix}.penguatan_tsls`)} rows={6} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" placeholder="Aqidah, adab, Al-Qur'an, hadits, doa, tarbiyah jinsiah, kemandirian..." /></label>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-bold text-foreground">C. Kegiatan Inti Mingguan</p>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, dayIndex) => (
                      <div key={dayIndex} className="grid grid-cols-1 gap-3 rounded-md border bg-background p-3 lg:grid-cols-[120px_1fr_1.5fr_1fr]">
                        <input {...register(`${prefix}.kegiatan_inti_mingguan.${dayIndex}.hari`)} className="rounded-md border border-input px-3 py-2 text-sm" placeholder={`Hari ${dayIndex + 1}`} />
                        <input {...register(`${prefix}.kegiatan_inti_mingguan.${dayIndex}.fokus`)} className="rounded-md border border-input px-3 py-2 text-sm" placeholder="Fokus kegiatan" />
                        <textarea {...register(`${prefix}.kegiatan_inti_mingguan.${dayIndex}.kegiatan`)} rows={3} className="rounded-md border border-input px-3 py-2 text-sm" placeholder="Kegiatan inti" />
                        <textarea {...register(`${prefix}.kegiatan_inti_mingguan.${dayIndex}.alat_bahan`)} rows={3} className="rounded-md border border-input px-3 py-2 text-sm" placeholder="Alat dan bahan" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <label className="block space-y-1 text-xs font-semibold text-muted-foreground">E. Pembiasaan Harian<textarea {...register(`${prefix}.pembiasaan_harian`)} rows={7} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
                  <label className="block space-y-1 text-xs font-semibold text-muted-foreground">F. Asesmen Mingguan<textarea {...register(`${prefix}.asesmen_mingguan`)} rows={7} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
                  <label className="block space-y-1 text-xs font-semibold text-muted-foreground">G. Catatan untuk Guru<textarea {...register(`${prefix}.catatan_guru`)} rows={5} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
                  <label className="block space-y-1 text-xs font-semibold text-muted-foreground">H. Umpan Balik Guru<textarea {...register(`${prefix}.umpan_balik_guru`)} rows={5} className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal text-foreground" /></label>
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
        <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">RPPH / Modul Ajar Harian</h3>
            <p className="text-sm text-muted-foreground mt-1">Buat Rencana Pelaksanaan Pembelajaran Harian yang merinci kegiatan dari penyambutan hingga kepulangan.</p>
            <p className="mt-1 text-xs text-muted-foreground">CSV: minggu_ke, hari_ke, topik_harian, tujuan_pembelajaran, kegiatan_pembuka, kegiatan_inti, kegiatan_penutup, asesmen, alat_bahan</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ImportButton label="Impor RPPH" onImport={importRpph} />
            <button
              type="button"
              onClick={() => {
                appendRpph({ 
                  minggu_ke: 1,
                  hari_ke: rpphFields.length + 1,
                  grade_level: "",
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
              <CalendarDays className="w-4 h-4" /> Tambah Hari
            </button>
          </div>
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
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className="font-bold text-foreground">RPPH Hari Ke-{index + 1}</h4>
                      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        Minggu
                        <input {...register(`${prefix}.minggu_ke`, { valueAsNumber: true })} type="number" min={1} className="w-20 border border-input rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary/50" />
                      </label>
                    </div>
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
