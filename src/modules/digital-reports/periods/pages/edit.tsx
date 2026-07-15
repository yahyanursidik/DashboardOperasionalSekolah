import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Clock, Settings, AlertTriangle } from "lucide-react";
import { useSelect } from "@refinedev/core";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { ASSESSMENT_BASIS_OPTIONS } from "../../report-period-utils";

export const ReportPeriodEdit: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  const {
    refineCore: { onFinish, formLoading, queryResult },
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    refineCoreProps: {
      resource: "report_periods",
      redirect: "list",
      meta: {
        select: "*, units(name), academic_years(name), semesters(name)"
      }
    },
  });

  const watchUnitId = watch("unit_id") || activeUnitId;
  const watchAcademicYearId = watch("academic_year_id");

  const { options: unitOptions } = useSelect({ resource: "units" });
  const { options: academicYearOptions } = useSelect({ resource: "academic_years" });
  const { options: semesterOptions } = useSelect({ 
    resource: "semesters",
    filters: watchAcademicYearId ? [{ field: "academic_year_id", operator: "eq", value: watchAcademicYearId }] : []
  });

  const onSubmit = (data: any) => {
    onFinish({
      ...data,
      unit_id: activeUnitId || data.unit_id,
    });
  };

  const isLoading = queryResult?.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Memuat data periode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Periode Rapor</h1>
            <p className="text-sm text-muted-foreground">Ubah pengaturan atau ubah status periode.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={formLoading}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Status Control */}
        <div className="bg-card rounded-xl border shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Status Periode
            </h3>
            <p className="text-sm text-muted-foreground">
              Ubah status untuk mengontrol akses guru dan orang tua.
            </p>
          </div>
          <div className="w-full md:w-64">
            <select
              {...register("status", { required: "Status wajib diisi" })}
              className="w-full px-3 py-2 border-2 border-primary/20 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="draft">Draft (Persiapan)</option>
              <option value="active">Aktif (Guru bisa mengisi)</option>
              <option value="closed">Ditutup (Hanya Review)</option>
              <option value="archived">Diarsipkan (Read-only)</option>
            </select>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Informasi Dasar</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Periode <span className="text-destructive">*</span></label>
              <input
                {...register("name", { required: "Nama periode wajib diisi" })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message as string}</span>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Rapor <span className="text-destructive">*</span></label>
              <select
                {...register("report_type", { required: "Jenis rapor wajib dipilih" })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="progress_awal">Laporan Progres Awal</option>
                <option value="progress_tengah">Progress Tengah Semester</option>
                <option value="rapor_semester">Rapor Semester / Akhir Tahun</option>
                <option value="rapor_program_khusus">Rapor Program Khusus (Tahfidz, dll)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Basis Asesmen <span className="text-destructive">*</span></label>
              <select
                {...register("assessment_basis", { required: "Basis asesmen wajib dipilih" })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">-- Pilih Basis Asesmen --</option>
                {ASSESSMENT_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Basis ini menentukan konteks nilai dan label yang tampil pada rapor.</p>
              {errors.assessment_basis && <span className="text-xs text-destructive">{errors.assessment_basis.message as string}</span>}
            </div>

            {!activeUnitId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Sekolah <span className="text-destructive">*</span></label>
                <select
                  {...register("unit_id", { required: "Unit wajib dipilih" })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                >
                  {unitOptions?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun Ajaran <span className="text-destructive">*</span></label>
              <select
                {...register("academic_year_id", { required: "Tahun ajaran wajib dipilih" })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                {academicYearOptions?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Semester <span className="text-destructive">*</span></label>
              <select
                {...register("semester_id", { required: "Semester wajib dipilih" })}
                disabled={!watchAcademicYearId}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background disabled:opacity-50"
              >
                {semesterOptions?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Deskripsi / Catatan Tambahan</label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-lg">Jadwal & Waktu</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-700">Mulai Pengisian Nilai (Guru)</label>
              <input
                type="date"
                {...register("input_start_date")}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-700">Batas Pengisian (Deadline Guru)</label>
              <input
                type="date"
                {...register("input_due_date")}
                className="w-full px-3 py-2 border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-700">Batas Review (Wali Kelas & Wakasek)</label>
              <input
                type="date"
                {...register("review_due_date")}
                className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-700">Tanggal Rapor & Publikasi</label>
              <input
                type="date"
                {...register("publish_date")}
                className="w-full px-3 py-2 border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};
