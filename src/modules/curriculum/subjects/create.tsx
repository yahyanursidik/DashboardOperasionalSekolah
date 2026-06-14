import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";

export const SubjectCreate: React.FC = () => {
  const navigate = useNavigate();
  const { data: unitsData } = useList({ resource: "units", pagination: { mode: "off" } });

  const {
    register,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading },
  } = useForm({
    refineCoreProps: {
      resource: "subjects",
      redirect: "list",
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/subjects" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader title="Tambah Mata Pelajaran" description="Masukkan data mata pelajaran baru ke dalam sistem." />
      </div>

      <form onSubmit={handleSubmit(onFinish)} className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Unit Sekolah <span className="text-rose-500">*</span></label>
            <select
              {...register("unit_id", { required: "Unit wajib diisi" })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
            >
              <option value="">-- Pilih Unit --</option>
              {unitsData?.data?.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {errors.unit_id && <span className="text-xs text-rose-500 mt-1">{errors.unit_id.message as string}</span>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Nama Mata Pelajaran <span className="text-rose-500">*</span></label>
            <input
              {...register("name", { required: "Nama wajib diisi" })}
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              placeholder="Contoh: Pendidikan Agama Islam"
            />
            {errors.name && <span className="text-xs text-rose-500 mt-1">{errors.name.message as string}</span>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Kode Mata Pelajaran (Opsional)</label>
            <input
              {...register("code")}
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              placeholder="Contoh: PAI"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Kategori <span className="text-rose-500">*</span></label>
            <select
              {...register("category", { required: "Kategori wajib dipilih" })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
            >
              <option value="Nasional">Nasional (Kurikulum Merdeka)</option>
              <option value="Khas Sekolah">Khas Sekolah</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            {errors.category && <span className="text-xs text-rose-500 mt-1">{errors.category.message as string}</span>}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              {...register("is_active")}
              type="checkbox"
              id="is_active"
              defaultChecked
              className="w-4 h-4 text-primary focus:ring-primary/50 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium">Status Aktif</label>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <Link
            to="/curriculum/subjects"
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
            {formLoading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
};
