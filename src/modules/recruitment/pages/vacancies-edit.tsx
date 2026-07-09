import React, { useEffect } from "react";
import { useForm, useList, useOne } from "@refinedev/core";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save } from "lucide-react";

export const VacancyEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePortal = location.pathname.startsWith("/hrd") ? "/hrd" : "/recruitment";
  
  const { onFinish, formLoading } = useForm({
    resource: "recruitment_vacancies",
    action: "edit",
    id: id,
    redirect: false,
    mutationMode: "pessimistic"
  });

  const { data: vacancyData, isLoading } = useOne({
    resource: "recruitment_vacancies",
    id: id as string
  });

  const { data: units } = useList({ resource: "units" });

  const vacancy = vacancyData?.data;

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
    navigate(`${basePortal}/vacancies`);
  };

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Memuat data...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Edit Lowongan Pekerjaan"
        description="Perbarui informasi posisi lowongan yang tersedia."
        action={
          <button
            onClick={() => navigate(`${basePortal}/vacancies`)}
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
                defaultValue={vacancy?.title}
                placeholder="Contoh: Guru Matematika SMP IT"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Posisi Pekerjaan *</label>
              <select 
                name="position" 
                required 
                defaultValue={vacancy?.position}
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">Pilih Posisi...</option>
                <option value="kepala_sekolah">Kepala Sekolah / Pimpinan</option>
                <option value="wakasek_umum">Wakil Kepala Sekolah (Umum)</option>
                <option value="wakasek_kurikulum">Wakil Kepala Sekolah Bidang Kurikulum</option>
                <option value="wakasek_kesiswaan">Wakil Kepala Sekolah Bidang Kesiswaan</option>
                <option value="kepala_unit">Kepala Unit (Lintas Jenjang / &gt;1 Unit)</option>
                <option value="guru">Guru / Tenaga Pendidik</option>
                <option value="guru_quran">Guru Al Qur'an</option>
                <option value="school_center">School Center</option>
                <option value="bendahara">Bendahara / Keuangan</option>
                <option value="penanggung_jawab">Penanggung Jawab</option>
                <option value="bk">Bimbingan Konseling</option>
                <option value="pustakawan">Pustakawan</option>
                <option value="laboran">Laboran</option>
                <option value="tu">Staff Tata Usaha / Administrasi</option>
                <option value="sarpras">Sarana Prasarana</option>
                <option value="satpam">Security / Keamanan</option>
                <option value="cleaning_service">Cleaning Service</option>
                <option value="lainnya">Posisi Lainnya</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Kerja (Opsional)</label>
              <select 
                name="unit_id" 
                defaultValue={vacancy?.unit_id || ""}
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">Semua Unit (Pusat)</option>
                {units?.data?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kuota Penerimaan *</label>
              <input 
                type="number"
                name="quota" 
                required 
                min="1"
                defaultValue={vacancy?.quota}
                placeholder="1"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Batas Akhir Pendaftaran *</label>
              <input 
                type="date"
                name="deadline" 
                required 
                defaultValue={vacancy?.deadline ? new Date(vacancy.deadline).toISOString().split('T')[0] : ""}
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status *</label>
              <select 
                name="status" 
                required 
                defaultValue={vacancy?.status}
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="open">DIBUKA (Menerima Pelamar)</option>
                <option value="draft">DRAFT (Belum Dipublikasi)</option>
                <option value="closed">DITUTUP</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Deskripsi Pekerjaan *</label>
              <textarea 
                name="description" 
                required 
                defaultValue={vacancy?.description}
                rows={4}
                placeholder="Tuliskan gambaran singkat tugas dan tanggung jawab..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-background resize-none"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Persyaratan *</label>
              <textarea 
                name="requirements" 
                required 
                defaultValue={vacancy?.requirements}
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
