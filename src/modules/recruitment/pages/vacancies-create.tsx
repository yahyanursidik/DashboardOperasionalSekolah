import React from "react";
import { useForm, useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save } from "lucide-react";

export const VacancyCreate: React.FC = () => {
  const navigate = useNavigate();
  
  const { onFinish, formLoading } = useForm({
    resource: "recruitment_vacancies",
    action: "create",
    redirect: false,
    mutationMode: "pessimistic"
  });

  const { data: units } = useList({ resource: "units" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const values = {
      title: formData.get("title") as string,
      position: formData.get("position") as string,
      unit_id: formData.get("unit_id") ? formData.get("unit_id") as string : null,
      quota: parseInt(formData.get("quota") as string),
      status: formData.get("status") as string,
      deadline: formData.get("deadline") as string,
      description: formData.get("description") as string,
      requirements: formData.get("requirements") as string,
    };

    await onFinish(values);
    navigate("/recruitment/vacancies");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Buka Lowongan Pekerjaan"
        description="Buat posisi lowongan baru yang tersedia."
        action={
          <button
            onClick={() => navigate("/recruitment/vacancies")}
            className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Batal
          </button>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Judul Lowongan *</label>
              <input 
                name="title" 
                required 
                placeholder="Contoh: Guru Matematika SMP IT"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Posisi Pekerjaan *</label>
              <select 
                name="position" 
                required 
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">Pilih Posisi...</option>
                <option value="kepala_sekolah">Kepala Sekolah / Pimpinan</option>
                <option value="wakasek">Wakil Kepala Sekolah</option>
                <option value="guru">Guru / Tenaga Pendidik</option>
                <option value="school_center">School Center</option>
                <option value="bendahara">Bendahara / Keuangan</option>
                <option value="penanggung_jawab">Penanggung Jawab</option>
                <option value="bk">Bimbingan Konseling</option>
                <option value="pustakawan">Pustakawan</option>
                <option value="laboran">Laboran</option>
                <option value="tu">Staff Tata Usaha / Administrasi</option>
                <option value="satpam">Security / Keamanan</option>
                <option value="cleaning_service">Cleaning Service</option>
                <option value="lainnya">Posisi Lainnya</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Kerja (Opsional)</label>
              <select 
                name="unit_id" 
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">Semua Unit (Pusat)</option>
                {units?.data?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kuota (Jumlah Dibutuhkan) *</label>
              <input 
                type="number"
                name="quota" 
                required 
                min="1"
                defaultValue="1"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tenggat Waktu / Deadline *</label>
              <input 
                type="date"
                name="deadline" 
                required 
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status *</label>
              <select 
                name="status" 
                required 
                defaultValue="open"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="open">DIBUKA (Menerima Pelamar)</option>
                <option value="draft">DRAFT (Belum Dipublikasi)</option>
                <option value="closed">DITUTUP</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Deskripsi Pekerjaan</label>
              <textarea 
                name="description" 
                rows={3}
                placeholder="Tuliskan gambaran singkat tugas dan tanggung jawab..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background resize-none"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Kualifikasi / Persyaratan</label>
              <textarea 
                name="requirements" 
                rows={4}
                placeholder="1. Minimal S1 Pendidikan...&#10;2. Lancar membaca Al-Quran..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={formLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {formLoading ? "Menyimpan..." : "Simpan Lowongan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
