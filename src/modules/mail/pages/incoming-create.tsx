/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useForm, useGetIdentity, useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Paperclip, Save } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { uploadDocument } from "../../../lib/supabase/storage";
import { OfficeSectionNav } from "../components/OfficeSectionNav";

export const IncomingMailCreate: React.FC = () => {
  const navigate = useNavigate();
  const { data: user } = useGetIdentity<any>();
  const { activeUnitId } = useCurrentUnit();
  const [attachment, setAttachment] = useState<File | null>(null);
  const { data: employees } = useList({ resource: "employees", filters: [{ field: "status", operator: "eq", value: "active" }], pagination: { mode: "off" }, sorters: [{ field: "full_name", order: "asc" }] });
  
  const { onFinish, formLoading } = useForm({
    resource: "mail_records",
    action: "create",
    redirect: false,
    mutationMode: "pessimistic"
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const attachmentMeta = attachment ? await uploadDocument(attachment, `mail/incoming/${new Date().getFullYear()}`) : null;
    const values = {
      type: "incoming",
      unit_id: activeUnitId || null,
      mail_number: formData.get("mail_number") as string,
      title: formData.get("title") as string,
      sender: formData.get("sender") as string,
      mail_date: formData.get("mail_date") as string,
      received_date: formData.get("received_date") as string,
      description: formData.get("description") as string,
      classification_code: formData.get("classification_code") as string || null,
      confidentiality: formData.get("confidentiality") as string,
      priority: formData.get("priority") as string,
      channel: formData.get("channel") as string,
      response_required: formData.get("response_required") === "on",
      due_date: formData.get("due_date") as string || null,
      handled_by_employee_id: formData.get("handled_by_employee_id") as string || null,
      physical_location: formData.get("physical_location") as string || null,
      attachment_path: attachmentMeta?.filePath || null,
      attachment_name: attachmentMeta?.fileName || null,
      attachment_mime_type: attachmentMeta?.mimeType || null,
      attachment_size: attachmentMeta?.fileSize || null,
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

      <OfficeSectionNav />

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

            <div className="space-y-2"><label className="text-sm font-medium">Kode klasifikasi</label><input name="classification_code" placeholder="Contoh: 005 / 421.3" className="w-full rounded-lg border bg-background px-4 py-2.5" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Media penerimaan</label><select name="channel" defaultValue="physical" className="w-full rounded-lg border bg-background px-4 py-2.5"><option value="physical">Surat fisik</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="courier">Kurir</option><option value="system">Sistem</option><option value="other">Lainnya</option></select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Kerahasiaan</label><select name="confidentiality" defaultValue="internal" className="w-full rounded-lg border bg-background px-4 py-2.5"><option value="public">Publik</option><option value="internal">Internal</option><option value="confidential">Rahasia</option><option value="restricted">Sangat terbatas</option></select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Prioritas</label><select name="priority" defaultValue="normal" className="w-full rounded-lg border bg-background px-4 py-2.5"><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Darurat</option></select></div>
            <div className="space-y-2"><label className="text-sm font-medium">PIC awal</label><select name="handled_by_employee_id" className="w-full rounded-lg border bg-background px-4 py-2.5"><option value="">Tentukan melalui disposisi</option>{employees?.data?.map((employee: any) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Lokasi arsip fisik</label><input name="physical_location" placeholder="Lemari/Rak/Ordner" className="w-full rounded-lg border bg-background px-4 py-2.5" /></div>
            <div className="space-y-2"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="response_required" className="h-4 w-4" />Memerlukan respons/tindak lanjut</label><input type="date" name="due_date" className="w-full rounded-lg border bg-background px-4 py-2.5" aria-label="Tenggat respons" /></div>
            <label className="space-y-2"><span className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" />Lampiran digital</span><input type="file" accept="application/pdf,image/*" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="block w-full rounded-lg border bg-background p-2.5 text-sm" /></label>

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
