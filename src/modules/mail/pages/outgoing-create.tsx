import React from "react";
import { useForm, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save } from "lucide-react";

export const OutgoingMailCreate: React.FC = () => {
  const navigate = useNavigate();
  const { data: user } = useGetIdentity<any>();
  
  const { onFinish, formLoading } = useForm({
    resource: "mail_records",
    action: "create",
    redirect: false,
    mutationMode: "pessimistic"
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const values = {
      type: "outgoing",
      mail_number: formData.get("mail_number") as string,
      title: formData.get("title") as string,
      recipient: formData.get("recipient") as string,
      mail_date: formData.get("mail_date") as string,
      description: formData.get("description") as string,
      status: "completed",
      created_by: user?.profile?.id
    };

    await onFinish(values);
    navigate("/mail/outgoing");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Catat Surat Keluar Baru"
        description="Masukkan detail surat keluar ke dalam buku agenda."
        action={
          <button
            onClick={() => navigate("/mail/outgoing")}
            className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Batal
          </button>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor Surat *</label>
              <input 
                name="mail_number" 
                required 
                placeholder="Contoh: 001/SK/TSLS/2026"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Instansi/Tujuan Penerima *</label>
              <input 
                name="recipient" 
                required 
                placeholder="Contoh: Dinas Pendidikan Kota..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Surat *</label>
              <input 
                type="date"
                name="mail_date" 
                required 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 bg-background"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Perihal / Judul Surat *</label>
              <input 
                name="title" 
                required 
                placeholder="Contoh: Permohonan Bantuan Dana"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 bg-background"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Keterangan / Ringkasan Isi (Opsional)</label>
              <textarea 
                name="description" 
                rows={3}
                placeholder="Tambahkan keterangan singkat mengenai isi surat..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 bg-background resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={formLoading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {formLoading ? "Menyimpan..." : "Simpan Surat Keluar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
