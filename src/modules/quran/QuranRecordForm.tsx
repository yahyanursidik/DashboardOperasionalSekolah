import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, BookOpen, User, CheckCircle } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { PageHeader } from "../../components/layout/PageHeader";

const quranSchema = z.object({
  student_id: z.string().min(1, "Pilih siswa"),
  academic_year_id: z.string().min(1, "Tahun ajaran wajib diisi"),
  semester_id: z.string().min(1, "Semester wajib diisi"),
  record_type: z.enum(["tahsin", "tahfidz"]),
  date: z.string().min(1, "Tanggal wajib diisi"),
  surah_or_jilid: z.string().min(1, "Wajib diisi (Surah / Jilid)"),
  ayat_or_page: z.string().min(1, "Wajib diisi (Ayat / Halaman)"),
  fluency_score: z.enum(["Sangat Lancar", "Lancar", "Kurang Lancar", "Mengulang"]),
  notes: z.string().optional().nullable(),
});

type QuranFormValues = z.infer<typeof quranSchema>;

export const QuranRecordForm: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuranFormValues>({
    resolver: zodResolver(quranSchema) as any,
    refineCoreProps: {
      action: "create",
      resource: "quran_records",
      redirect: "list",
    },
    defaultValues: {
      academic_year_id: activeYearId || "",
      semester_id: activeSemesterId || "",
      record_type: "tahfidz",
      date: new Date().toISOString().split('T')[0],
      fluency_score: "Lancar",
    }
  });

  const recordType = watch("record_type");

  const { options: studentOptions, queryResult: studentQuery } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: [{ field: "status", operator: "eq", value: "active" }],
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Input Capaian Al-Qur'an"
        description="Catat perkembangan hafalan atau bacaan tahsin siswa."
        backButton={true}
      />

      <form onSubmit={handleSubmit(onFinish as any)} className="bg-card rounded-xl border shadow-sm overflow-hidden">
        
        {/* Tipe Penilaian */}
        <div className="p-6 border-b bg-muted/20">
          <label className="text-sm font-medium mb-3 block">Jenis Penilaian <span className="text-destructive">*</span></label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
              recordType === 'tahfidz' ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted'
            }`}>
              <input type="radio" value="tahfidz" {...register("record_type")} className="sr-only" />
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">Tahfidz (Hafalan)</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
              recordType === 'tahsin' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-background hover:bg-muted'
            }`}>
              <input type="radio" value="tahsin" {...register("record_type")} className="sr-only" />
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">Tahsin (Bacaan)</span>
            </label>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Siswa & Tanggal */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Siswa <span className="text-destructive">*</span></label>
              <select
                {...register("student_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-background"
                disabled={studentQuery.isLoading}
              >
                <option value="">-- Pilih Siswa --</option>
                {studentOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.student_id && <p className="text-xs text-destructive">{errors.student_id.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Setoran <span className="text-destructive">*</span></label>
              <input
                type="date"
                {...register("date")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              />
            </div>

            {/* Target Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {recordType === 'tahfidz' ? 'Nama Surah / Juz' : 'Nama Jilid (Contoh: Iqro 3)'} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                {...register("surah_or_jilid")}
                placeholder={recordType === 'tahfidz' ? "Contoh: Al-Baqarah" : "Contoh: Umi Jilid 4"}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              />
              {errors.surah_or_jilid && <p className="text-xs text-destructive">{errors.surah_or_jilid.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {recordType === 'tahfidz' ? 'Ayat ke berapa?' : 'Halaman berapa?'} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                {...register("ayat_or_page")}
                placeholder={recordType === 'tahfidz' ? "Contoh: Ayat 1-10" : "Contoh: Halaman 12-14"}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              />
              {errors.ayat_or_page && <p className="text-xs text-destructive">{errors.ayat_or_page.message as string}</p>}
            </div>

            {/* Fluency Score */}
            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <label className="text-sm font-medium">Tingkat Kelancaran <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Sangat Lancar', 'Lancar', 'Kurang Lancar', 'Mengulang'].map((score) => {
                  const isSelected = watch("fluency_score") === score;
                  let colors = "bg-background hover:bg-muted";
                  if (isSelected) {
                    if (score === 'Sangat Lancar') colors = "bg-emerald-100 border-emerald-500 text-emerald-700";
                    else if (score === 'Lancar') colors = "bg-blue-100 border-blue-500 text-blue-700";
                    else if (score === 'Kurang Lancar') colors = "bg-amber-100 border-amber-500 text-amber-700";
                    else colors = "bg-red-100 border-red-500 text-red-700";
                  }

                  return (
                    <label key={score} className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all text-sm font-medium ${colors}`}>
                      <input type="radio" value={score} {...register("fluency_score")} className="sr-only" />
                      {score}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Catatan / Pesan Guru (Opsional)</label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Catatan perbaikan tajwid, makhraj, dll..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
              ></textarea>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/20 border-t flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/quran")}
            className="px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
          >
            <CheckCircle className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Capaian"}
          </button>
        </div>
      </form>
    </div>
  );
};
