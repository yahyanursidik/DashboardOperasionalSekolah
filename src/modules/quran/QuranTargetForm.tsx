import React, { useEffect } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const QuranTargetForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "quran_targets",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  const { options: classOptions, queryResult: classQuery } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      class_id: formData.get("class_id"),
      target_type: formData.get("target_type"),
      description: formData.get("description"),
      target_amount: parseInt(formData.get("target_amount") as string),
      amount_unit: formData.get("amount_unit"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    };

    onFinish(data);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/quran-targets")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Target Al-Qur'an" : "Tambah Target Al-Qur'an"}
          description="Atur target hafalan atau bacaan untuk satu semester"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <select
                name="class_id"
                required
                defaultValue={record?.class_id || ""}
                disabled={isEdit} // Cannot change class on edit
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Pilih Kelas --</option>
                {classOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Target</label>
              <select
                name="target_type"
                required
                defaultValue={record?.target_type || "tahfidz"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="tahfidz">Tahfidz (Hafalan)</option>
                <option value="tahsin">Tahsin (Bacaan)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi Target</label>
            <input
              type="text"
              name="description"
              required
              placeholder="Contoh: Hafalan Juz 30 (An-Naba - Al-Lail)"
              defaultValue={record?.description}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah Target</label>
              <input
                type="number"
                name="target_amount"
                required
                min="1"
                defaultValue={record?.target_amount || 1}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Satuan Target</label>
              <select
                name="amount_unit"
                required
                defaultValue={record?.amount_unit || "halaman"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="juz">Juz</option>
                <option value="surah">Surah</option>
                <option value="halaman">Halaman</option>
                <option value="ayat">Ayat</option>
                <option value="jilid">Jilid</option>
              </select>
            </div>
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
};
