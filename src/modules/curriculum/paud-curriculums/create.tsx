import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, FileText, CalendarDays, BookOpen, LayoutList } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { PaudThemeFormFields } from "./components/PaudThemeFormFields";

export const PaudThemeCreate: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
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
    refineCore: { onFinish, formLoading },
  } = useForm({
    refineCoreProps: {
      resource: "paud_curriculums",
      redirect: "list",
    },
  });

  const handleFormSubmit = (data: any) => {
    onFinish({
      ...data,
      unit_id: activeUnitId,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/paud" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader title="Tambah Kurikulum PAUD" description="Buat kurikulum (ATP, Prota, Promes, RPPM, RPPH) untuk tingkat PAUD/TK/KB." />
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-card rounded-xl border border-rose-100 shadow-sm p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-rose-100 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("identitas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "identitas" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
          >
            <FileText className="w-4 h-4" /> Identitas & ATP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("program")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "program" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
          >
            <CalendarDays className="w-4 h-4" /> Prota & Promes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rppm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "rppm" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
          >
            <LayoutList className="w-4 h-4" /> RPPM (Mingguan)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rpph")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === "rpph" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
          >
            <BookOpen className="w-4 h-4" /> RPPH / Modul Ajar
          </button>
        </div>

        {/* Tab Content: Identitas */}
        <div className={activeTab === "identitas" ? "space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-rose-100 pb-2 text-rose-800">Informasi Tingkat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tingkat/Kelompok <span className="text-rose-500">*</span></label>
                <select
                  {...register("grade_level", { required: "Kelompok wajib diisi", valueAsNumber: true })}
                  className="w-full border border-rose-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">-- Pilih Kelompok --</option>
                  <option value={-1}>KB (Kelompok Bermain)</option>
                  <option value={0}>TK A</option>
                  <option value={1}>TK B</option>
                </select>
                {errors.grade_level && <span className="text-xs text-rose-500 mt-1">{errors.grade_level.message as string}</span>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran <span className="text-rose-500">*</span></label>
                <select
                  {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
                  className="w-full border border-rose-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/50"
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
            <h3 className="text-lg font-semibold border-b border-rose-100 pb-2 text-rose-800">Alur Tujuan Pembelajaran (ATP)</h3>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Detail ATP Jenjang</label>
              <textarea
                {...register("atp_text")}
                rows={6}
                className="w-full border border-rose-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/50"
                placeholder="Detail Alur Tujuan Pembelajaran untuk tingkat ini..."
              />
            </div>
          </div>
        </div>

        <PaudThemeFormFields register={register} control={control} errors={errors} activeTab={activeTab} />

        <div className="pt-4 border-t border-rose-100 flex justify-end gap-3">
          <Link
            to="/curriculum/paud"
            className="px-4 py-2 border border-rose-200 rounded-md text-sm font-medium hover:bg-rose-50 transition-colors text-rose-700"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Kurikulum"}
          </button>
        </div>
      </form>
    </div>
  );
};
