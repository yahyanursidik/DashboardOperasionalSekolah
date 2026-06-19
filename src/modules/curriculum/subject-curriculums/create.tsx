import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList, useOne } from "@refinedev/core";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Save, FileText, CalendarDays, BookOpen, LayoutList } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CurriculumFormFields } from "./components/CurriculumFormFields";
export const SubjectCurriculumCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject_id");
  const [activeTab, setActiveTab] = useState("identitas");
  const navigate = useNavigate();

  const { data: subjectData } = useOne({
    resource: "subjects",
    id: subjectId || "",
    queryOptions: { enabled: !!subjectId }
  });

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" }
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading },
  } = useForm({
    refineCoreProps: {
      resource: "subject_curriculums",
      redirect: false,
      onMutationSuccess: () => {
        navigate(`/curriculum/subjects/show/${subjectId}`);
      }
    },
  });

  if (!subjectId) return <div className="p-8 text-rose-500">Mata pelajaran tidak valid.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title="Tambah Kurikulum Kelas" 
          description={`Tambahkan data kurikulum untuk mata pelajaran ${subjectData?.data?.name || '...'}`} 
        />
      </div>

      <form onSubmit={handleSubmit((data) => onFinish({ ...data, subject_id: subjectId }))} className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("identitas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "identitas" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
          >
            <FileText className="w-4 h-4" /> Identitas & CP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prota")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "prota" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutList className="w-4 h-4" /> Program Tahunan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("promes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "promes" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
          >
            <CalendarDays className="w-4 h-4" /> Program Semester
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("modul")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "modul" ? "bg-blue-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
          >
            <BookOpen className="w-4 h-4" /> Modul Ajar (RPPH)
          </button>
        </div>

        {/* Tab Content: Identitas */}
        <div className={activeTab === "identitas" ? "space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Informasi Dasar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Jenjang Kelas <span className="text-rose-500">*</span></label>
                <select
                  {...register("grade_level", { required: "Jenjang Kelas wajib diisi", valueAsNumber: true })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>Kelas {g}</option>)}
                </select>
                {errors.grade_level && <span className="text-xs text-rose-500 mt-1">{errors.grade_level.message as string}</span>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran <span className="text-rose-500">*</span></label>
                <select
                  {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {academicYears?.data?.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
                {errors.academic_year_id && <span className="text-xs text-rose-500 mt-1">{errors.academic_year_id.message as string}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b pb-2">Dokumen Perencanaan Pembelajaran</h3>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Capaian Pembelajaran (CP)</label>
              <textarea
                {...register("cp_text")}
                rows={4}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                placeholder="Masukkan Capaian Pembelajaran untuk fase/kelas ini..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Alur Tujuan Pembelajaran (ATP)</label>
              <textarea
                {...register("atp_text")}
                rows={5}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                placeholder="Rincian Alur Tujuan Pembelajaran..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</label>
              <textarea
                {...register("kktp_text")}
                rows={4}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                placeholder="Kriteria dan indikator ketercapaian..."
              />
            </div>
          </div>
        </div>

        <CurriculumFormFields register={register} control={control} errors={errors} activeTab={activeTab} />

        <div className="pt-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Kurikulum"}
          </button>
        </div>
      </form>
    </div>
  );
};
