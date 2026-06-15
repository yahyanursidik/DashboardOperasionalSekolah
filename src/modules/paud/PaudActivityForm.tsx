import React, { useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, UploadCloud } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";

export const PaudActivityForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "paud_activities",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  React.useEffect(() => {
    if (record?.photo_url && !photoUrl) {
      setPhotoUrl(record.photo_url);
    }
  }, [record, photoUrl]);

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: studentOptions, queryResult: studentQuery } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedClassId ? [
      { field: "class_id", operator: "eq", value: selectedClassId },
      { field: "status", operator: "eq", value: "active" }
    ] : [],
    queryOptions: {
      enabled: !!selectedClassId,
    },
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `paud_activities/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('documents') // Assuming 'documents' or 'avatars' is a public bucket in supabase. In real app, create a 'photos' bucket.
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage.from('documents').getPublicUrl(filePath);
      setPhotoUrl(data.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Gagal mengunggah foto. Pastikan bucket 'documents' ada dan publik.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      student_id: formData.get("student_id"),
      date: formData.get("date"),
      title: formData.get("title"),
      description: formData.get("description"),
      photo_url: photoUrl,
    };

    onFinish(data);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/paud-activities")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Jurnal PAUD" : "Tambah Jurnal Foto Anak"}
          description="Dokumentasikan momen belajar anak hari ini."
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Pilih Kelas --</option>
                {classOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Siswa <span className="text-red-500">*</span></label>
              <select
                name="student_id"
                required
                defaultValue={record?.student_id || ""}
                disabled={!selectedClassId || studentQuery.isLoading}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{selectedClassId ? "-- Pilih Siswa --" : "-- Pilih Kelas Dulu --"}</option>
                {studentOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Kegiatan <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="title"
                required
                placeholder="Contoh: Bermain Balok Susun"
                defaultValue={record?.title}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="date"
                required
                defaultValue={record ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Foto Kegiatan</label>
            <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-muted/30">
              {photoUrl ? (
                <div className="relative w-full max-h-48 overflow-hidden rounded-lg flex justify-center">
                  <img src={photoUrl} alt="Preview" className="h-48 object-cover rounded-lg shadow-sm" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl("")}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-md text-xs font-bold shadow"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="text-center w-full">
                  <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Pilih foto dari perangkat</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="mt-3 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {isUploading && <p className="text-xs text-blue-500 mt-2">Mengunggah foto...</p>}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Narasi / Deskripsi <span className="text-red-500">*</span></label>
            <textarea
              name="description"
              required
              rows={4}
              defaultValue={record?.description}
              className="w-full flex min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-none"
              placeholder="Ceritakan bagaimana partisipasi anak, apa yang diucapkan, dan capaian mereka pada kegiatan ini..."
            />
            <p className="text-[11px] text-muted-foreground">Catatan ini akan menjadi dasar penilaian perkembangan anak dan bisa dilihat oleh orang tua.</p>
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
          <button
            type="submit"
            disabled={formLoading || isUploading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Jurnal"}
          </button>
        </div>
      </form>
    </div>
  );
};
