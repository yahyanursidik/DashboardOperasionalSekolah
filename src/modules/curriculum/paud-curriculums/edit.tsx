import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList } from "@refinedev/core";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, CalendarDays, BookOpen, LayoutList } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PaudThemeFormFields } from "./components/PaudThemeFormFields";

export const PaudThemeEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("identitas");

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" }
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading, queryResult },
  } = useForm({
    refineCoreProps: {
      resource: "paud_curriculums",
      id,
      redirect: "list",
      successNotification: (data: any, values: any, resource?: string) => {
        toast.success("Perubahan kurikulum PAUD berhasil disimpan");
        return false as any;
      },
      errorNotification: (error: any) => {
        toast.error("Gagal menyimpan perubahan: " + error?.message);
        return false as any;
      }
    },
  });

  if (queryResult?.isLoading) return <div className="p-8 text-muted-foreground">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/paud" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader title="Edit Kurikulum PAUD" description="Ubah data kurikulum dan modul untuk tingkat PAUD/TK/KB." />
      </div>

      <form onSubmit={handleSubmit(onFinish)} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("identitas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "identitas" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
          >
            <FileText className="w-4 h-4" /> Identitas & ATP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("program")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "program" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
          >
            <CalendarDays className="w-4 h-4" /> Prota & Promes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rppm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "rppm" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
          >
            <LayoutList className="w-4 h-4" /> RPPM (Mingguan)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rpph")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "rpph" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
          >
            <BookOpen className="w-4 h-4" /> RPPH / Modul Ajar
          </button>
        </div>

        {/* Tab Content: Identitas */}
        <div className={activeTab === "identitas" ? "space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border pb-2 text-foreground">Informasi Tingkat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tingkat/Kelompok <span className="text-rose-500">*</span></label>
                <select
                  {...register("grade_level", { required: "Kelompok wajib diisi", valueAsNumber: true })}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Pilih Kelompok --</option>
                  <option value={-1}>KB (Kelompok Bermain)</option>
                  <option value={0}>TK A</option>
                  <option value={1}>TK B</option>
                </select>
                {errors.grade_level && <span className="text-xs text-destructive mt-1">{errors.grade_level.message as string}</span>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran <span className="text-destructive">*</span></label>
                <select
                  {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {academicYears?.data?.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
                {errors.academic_year_id && <span className="text-xs text-destructive mt-1">{errors.academic_year_id.message as string}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 text-foreground">Alur Tujuan Pembelajaran (ATP)</h3>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Detail ATP Jenjang</label>
              <textarea
                {...register("atp_text")}
                rows={6}
                className="w-full border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                placeholder="Detail Alur Tujuan Pembelajaran untuk tingkat ini..."
              />
            </div>
          </div>
        </div>

        <PaudThemeFormFields register={register} control={control} errors={errors} activeTab={activeTab} />

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Link
            to="/curriculum/paud"
            className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
};
