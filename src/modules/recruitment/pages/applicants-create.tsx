import React from "react";
import { useForm, useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save } from "lucide-react";

export const ApplicantCreate: React.FC = () => {
  const navigate = useNavigate();
  
  const { onFinish, formLoading } = useForm({
    resource: "recruitment_applicants",
    action: "create",
    redirect: false,
    mutationMode: "pessimistic"
  });

  const { data: vacancies } = useList({ 
    resource: "recruitment_vacancies",
    filters: [{ field: "status", operator: "eq", value: "open" }]
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const values = {
      vacancy_id: formData.get("vacancy_id") as string,
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      last_education: formData.get("last_education") as string,
      address: formData.get("address") as string,
      status: "berkas_masuk",
    };

    await onFinish(values);
    navigate("/recruitment/applicants");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Input Data Pelamar Baru"
        description="Masukkan data kandidat pelamar ke dalam sistem pelacakan ATS."
        action={
          <button
            onClick={() => navigate("/recruitment/applicants")}
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
              <label className="text-sm font-medium">Lowongan yang Dilamar *</label>
              <select 
                name="vacancy_id" 
                required 
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
              >
                <option value="">Pilih Lowongan Tersedia...</option>
                {vacancies?.data?.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap *</label>
              <input 
                name="full_name" 
                required 
                placeholder="Contoh: Muhammad Fatih..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pendidikan Terakhir *</label>
              <input 
                name="last_education" 
                required 
                placeholder="Contoh: S1 Pendidikan Agama Islam"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <input 
                type="email"
                name="email" 
                required 
                placeholder="contoh@email.com"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor WhatsApp *</label>
              <input 
                name="phone" 
                required 
                placeholder="08123456789"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Alamat Domisili</label>
              <textarea 
                name="address" 
                rows={2}
                placeholder="Tuliskan alamat lengkap..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={formLoading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {formLoading ? "Menyimpan..." : "Simpan Data Pelamar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
