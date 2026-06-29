import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, BookOpen } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";

export const DigitalLibraryCategoriesCreate: React.FC = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    refineCoreProps: {
      resource: "digital_library_categories",
      redirect: "list",
    },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <PageHeader
          title="Tambah Kategori"
          description="Tambahkan kategori baru untuk perpustakaan digital"
          icon={BookOpen}
        />
      </div>

      <div className="bg-card border rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nama Kategori <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", { required: "Nama kategori wajib diisi" })}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  errors.name ? "border-red-500" : "border-input"
                }`}
                placeholder="Misal: Fiksi, Referensi, Modul Pelajaran"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-input"
                placeholder="Penjelasan singkat tentang kategori ini..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
