import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList, useGetIdentity } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Link as LinkIcon, Upload } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const CurriculumDocumentCreate: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const { data: user } = useGetIdentity<any>();

  const { data: subjectsData } = useList({
    resource: "subjects",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" }
  });

  const { data: classesData } = useList({
    resource: "classes",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" }
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    refineCore: { onFinish, formLoading },
  } = useForm({
    refineCoreProps: {
      resource: "curriculum_documents",
      redirect: "list",
    },
  });

  const uploadType = watch("upload_type", "drive");

  const onSubmit = (data: any) => {
    // Add default values
    const payload = {
      ...data,
      created_by: user?.id,
      academic_year_id: activeYearId,
      // Clear the other field depending on upload type
      file_url: uploadType === "file" ? data.file_url : null,
      drive_link: uploadType === "drive" ? data.drive_link : null,
    };
    delete payload.upload_type;
    
    // Convert empty strings to null for relations
    if (!payload.subject_id) payload.subject_id = null;
    if (!payload.class_id) payload.class_id = null;

    onFinish(payload);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/documents" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader title="Unggah Dokumen Kurikulum / Modul Ajar" description="Tambahkan berkas administrasi pembelajaran ke dalam sistem." />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-xl border shadow-sm p-6 space-y-8">
        
        {/* Section 1: Detail Dokumen */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">1. Detail Utama</h3>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Judul Dokumen / Modul <span className="text-rose-500">*</span></label>
            <input
              {...register("title", { required: "Judul wajib diisi" })}
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              placeholder="Contoh: Modul Ajar Bab 1 - Bilangan Bulat"
            />
            {errors.title && <span className="text-xs text-rose-500 mt-1">{errors.title.message as string}</span>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Jenis Dokumen <span className="text-rose-500">*</span></label>
            <select
              {...register("document_type", { required: "Jenis wajib dipilih" })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
            >
              <option value="Modul Ajar">Modul Ajar / RPP</option>
              <option value="ATP">ATP (Alur Tujuan Pembelajaran)</option>
              <option value="CP">CP (Capaian Pembelajaran)</option>
              <option value="Panduan Kurikulum">Panduan Kurikulum / Deep Learning</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            {errors.document_type && <span className="text-xs text-rose-500 mt-1">{errors.document_type.message as string}</span>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Deskripsi Singkat (Opsional)</label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              placeholder="Jelaskan isi singkat dari dokumen ini..."
            />
          </div>
        </div>

        {/* Section 2: Relasi */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">2. Pengaitan Akademik</h3>
          <p className="text-xs text-muted-foreground -mt-2 mb-4">Pilih mata pelajaran dan/atau kelas jika modul ini spesifik. Kosongkan jika dokumen ini bersifat umum untuk sekolah.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Terkait Mata Pelajaran</label>
              <select
                {...register("subject_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Berlaku Umum --</option>
                {subjectsData?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Terkait Kelas Spesifik</label>
              <select
                {...register("class_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Semua Kelas --</option>
                {classesData?.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: File / Lampiran */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">3. Lampiran Berkas</h3>
          
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="drive" {...register("upload_type")} defaultChecked className="text-primary focus:ring-primary/50" />
              Tautan Google Drive
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="file" {...register("upload_type")} className="text-primary focus:ring-primary/50" />
              URL File Langsung
            </label>
          </div>

          {uploadType === "drive" && (
            <div className="p-4 border rounded-lg bg-blue-50/50 space-y-3">
              <label className="text-sm font-medium flex items-center gap-2"><LinkIcon className="w-4 h-4 text-blue-600"/> Link Google Drive</label>
              <input
                {...register("drive_link", { required: uploadType === "drive" ? "Link wajib diisi" : false })}
                type="url"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50"
                placeholder="https://docs.google.com/document/d/..."
              />
              <p className="text-xs text-muted-foreground">Pastikan hak akses link diatur ke "Siapa saja yang memiliki link" (Viewer).</p>
            </div>
          )}

          {uploadType === "file" && (
            <div className="p-4 border rounded-lg bg-emerald-50/50 space-y-3">
              <label className="text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4 text-emerald-600"/> URL File Berkas (PDF/Docx)</label>
              <input
                {...register("file_url", { required: uploadType === "file" ? "URL File wajib diisi" : false })}
                type="url"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50"
                placeholder="https://example.com/modul-ajar.pdf"
              />
              <p className="text-xs text-muted-foreground">Masukkan URL langsung yang mengarah ke file PDF atau Word.</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <Link
            to="/curriculum/documents"
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Dokumen"}
          </button>
        </div>
      </form>
    </div>
  );
};
