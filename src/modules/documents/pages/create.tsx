import React, { useState } from "react";
import { useCreate, useSelect, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, UploadCloud, FileType, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "../../../lib/supabase/storage";

export const DocumentCreate: React.FC = () => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<any>();
  const { mutate: createDocument } = useCreate();

  const [file, setFile] = useState<File | null>(null);
  const [ownerType, setOwnerType] = useState("student");
  const [ownerId, setOwnerId] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { options: docTypes } = useSelect({ 
    resource: "document_types", 
    optionLabel: "name", 
    optionValue: "id",
    filters: [{ field: "is_active", operator: "eq", value: true }] 
  });

  // Basic mock list for owner id - in reality, we'd have async search inputs based on ownerType
  const { options: studentOptions } = useSelect({ resource: "students", optionLabel: "full_name", optionValue: "id", queryOptions: { enabled: ownerType === 'student' } });
  const { options: teacherOptions } = useSelect({ resource: "teachers", optionLabel: "full_name", optionValue: "id", queryOptions: { enabled: ownerType === 'teacher' } });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !ownerId || !documentTypeId) {
      toast.error("Mohon lengkapi semua field dan pilih file");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Storage
      const folder = `${ownerType}/${ownerId}`;
      const fileMeta = await uploadDocument(file, folder);

      // 2. Create DB Record
      createDocument({
        resource: "documents",
        values: {
          owner_type: ownerType,
          owner_id: ownerId,
          document_type_id: documentTypeId,
          file_name: fileMeta.fileName,
          file_path: fileMeta.filePath,
          mime_type: fileMeta.mimeType,
          file_size: fileMeta.fileSize,
          status: "menunggu_verifikasi",
          uploaded_by: identity?.id,
        },
        successNotification: () => ({ message: "Dokumen berhasil diunggah", type: "success" })
      }, {
        onSuccess: () => navigate("/documents"),
      });

    } catch (err: any) {
      toast.error("Gagal mengunggah dokumen", { description: err.message });
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Upload Dokumen Baru"
        description="Unggah file digital ke dalam Document Vault yang aman."
      />

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><FileType className="w-4 h-4" /> Jenis Pemilik</label>
              <select
                value={ownerType}
                onChange={(e) => { setOwnerType(e.target.value); setOwnerId(""); }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="student">Siswa</option>
                <option value="teacher">Guru / Pegawai</option>
                <option value="school">Sekolah / Instansi</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Pilih Pemilik</label>
              <select
                required
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">-- Pilih Pemilik Data --</option>
                {ownerType === 'student' && studentOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                {ownerType === 'teacher' && teacherOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                {ownerType === 'school' && <option value="00000000-0000-0000-0000-000000000000">Yayasan TSLS</option>}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Kategori Dokumen</label>
              <select
                required
                value={documentTypeId}
                onChange={(e) => setDocumentTypeId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">-- Pilih Jenis Dokumen --</option>
                {docTypes?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">File Dokumen</label>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:bg-primary/5 transition-colors relative">
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*,application/pdf"
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
                  <UploadCloud className="w-8 h-8 text-primary" />
                  <p className="font-medium text-foreground">{file ? file.name : "Klik atau seret file ke sini"}</p>
                  <p className="text-xs">Mendukung PDF, JPG, PNG (Max 5MB)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/documents")}
              className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Batal
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? "Mengunggah..." : "Upload & Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
