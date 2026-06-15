import React from "react";
import { useForm, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save } from "lucide-react";

export const IncomingMailCreate: React.FC = () => {
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
      type: "incoming",
      mail_number: formData.get("mail_number") as string,
      title: formData.get("title") as string,
      sender: formData.get("sender") as string,
      mail_date: formData.get("mail_date") as string,
      received_date: formData.get("received_date") as string,
      description: formData.get("description") as string,
      status: "logged",
      created_by: user?.profile?.id
    };

    await onFinish(values);
    navigate("/mail/incoming");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Catat Surat Masuk Baru"
        description="Masukkan detail surat masuk ke dalam buku agenda."
        action={
          <button
            onClick={() => navigate("/mail/incoming")}
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
                placeholder="Contoh: 001/SM/2026"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Instansi/Nama Pengirim *</label>
              <input 
                name="sender" 
                required 
                placeholder="Contoh: Dinas Pendidikan Kota..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Surat *</label>
              <input 
                type="date"
                name="mail_date" 
                required 
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Diterima *</label>
              <input 
                type="date"
                name="received_date" 
                required 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Perihal / Judul Surat *</label>
              <input 
                name="title" 
                required 
                placeholder="Contoh: Undangan Rapat Koordinasi"
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Keterangan / Ringkasan Isi (Opsional)</label>
              <textarea 
                name="description" 
                rows={3}
                placeholder="Tambahkan keterangan singkat mengenai isi surat..."
                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={formLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {formLoading ? "Menyimpan..." : "Simpan Arsip Surat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
