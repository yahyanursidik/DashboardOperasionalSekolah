import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { supabaseClient } from "../../../lib/supabase/client";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Save, ArrowLeft, UploadCloud, ChevronRight, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";

export const OnboardingCreate: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    refineCore: { onFinish, formLoading }
  } = useForm({
    refineCoreProps: {
      resource: "onboarding_materials",
      action: "create",
      redirect: "list",
    }
  });

  const [uploading, setUploading] = useState(false);
  const materialType = watch("material_type");
  const fileUrl = watch("file_url");

  const renderViewer = () => {
    if (!fileUrl) return <p className="text-gray-400 text-sm text-center py-8">Belum ada file atau tautan untuk dipratinjau.</p>;

    const getEmbedUrl = (url: string) => {
      if (!url) return url;
      const gdriveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (gdriveMatch) {
        return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
      }
      return url;
    };

    const embedUrl = getEmbedUrl(fileUrl);

    switch (materialType) {
      case "pdf":
        return <iframe src={embedUrl} className="w-full h-[400px] border-0 rounded-lg bg-gray-50 shadow-inner" title="PDF Viewer" />;
      case "audio":
        return <audio controls src={fileUrl} className="w-full" />;
      case "video":
        return <video controls src={fileUrl} className="w-full max-h-[400px] bg-black rounded-lg shadow-inner" />;
      case "image":
        return <img src={fileUrl} alt="Preview" className="max-w-full max-h-[400px] object-contain rounded-lg mx-auto shadow-sm" />;
      case "youtube":
        const videoIdMatch = fileUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (videoId) {
          return (
             <iframe 
               className="w-full h-[400px] border-0 rounded-lg shadow-inner"
               src={`https://www.youtube.com/embed/${videoId}`} 
               title="YouTube video player" 
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
               allowFullScreen
             />
          );
        }
        return <p className="text-red-500 text-center py-8">URL YouTube tidak valid</p>;
      case "gdrive":
        return <iframe src={embedUrl} className="w-full h-[400px] border-0 rounded-lg bg-gray-50 shadow-inner" title="Google Drive Viewer" />;
      case "s3_link":
        const isPdf = fileUrl.toLowerCase().split('?')[0].endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(fileUrl);
        const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(fileUrl);
        const isAudio = /\.(mp3|wav|ogg)(\?.*)?$/i.test(fileUrl);
        
        if (isPdf) return <iframe src={embedUrl} className="w-full h-[400px] border-0 rounded-lg bg-gray-50 shadow-inner" title="S3 PDF Viewer" />;
        if (isImage) return <img src={fileUrl} alt="Preview" className="max-w-full max-h-[400px] object-contain rounded-lg mx-auto shadow-sm" />;
        if (isVideo) return <video controls src={fileUrl} className="w-full max-h-[400px] bg-black rounded-lg shadow-inner" />;
        if (isAudio) return <audio controls src={fileUrl} className="w-full" />;
        return <iframe src={fileUrl} className="w-full h-[400px] border-0 rounded-lg bg-gray-50 shadow-inner" title="S3 Viewer" />;
      default:
        return <p className="text-gray-400 text-center py-8">Pilih tipe materi terlebih dahulu.</p>;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Pilih file terlebih dahulu.");
      }
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError, data } = await supabaseClient.storage
        .from("onboarding_materials")
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      
      const { data: publicData } = supabaseClient.storage
        .from("onboarding_materials")
        .getPublicUrl(data.path);
        
      setValue("file_url", publicData.publicUrl, { shouldValidate: true });
      toast.success("File berhasil diunggah!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const isFileBased = ["pdf", "audio", "video", "image"].includes(materialType);
  const isExternalUrl = ["youtube", "gdrive", "s3_link"].includes(materialType);

  const onSubmit = (data: any) => {
    onFinish(data);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <Link to="/onboarding" className="hover:text-primary transition-colors">Onboarding</Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-900 font-medium">Tambah Materi</span>
      </div>

      <PageHeader
        title="Tambah Materi Onboarding"
        description="Buat materi baru untuk onboarding orang tua dan siswa."
        action={
          <button
            onClick={() => navigate("/onboarding")}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-xl border shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Judul Materi <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register("title", { required: "Judul wajib diisi" })}
                className={`w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Contoh: Panduan Menggunakan Portal"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Deskripsi</label>
              <textarea
                {...register("description")}
                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
                rows={4}
                placeholder="Jelaskan secara singkat tentang materi ini..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Tipe Materi <span className="text-red-500">*</span></label>
                <select
                  {...register("material_type", { required: "Pilih tipe materi" })}
                  className={`w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white transition-shadow ${errors.material_type ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">-- Pilih Tipe --</option>
                  <optgroup label="Upload Langsung">
                    <option value="pdf">Dokumen (PDF)</option>
                    <option value="image">Gambar (JPG/PNG)</option>
                    <option value="video">Video (MP4)</option>
                    <option value="audio">Audio (MP3/WAV)</option>
                  </optgroup>
                  <optgroup label="Tautan Eksternal">
                    <option value="youtube">Tautan YouTube</option>
                    <option value="gdrive">Tautan Google Drive</option>
                    <option value="s3_link">Tautan S3 Contabo</option>
                  </optgroup>
                </select>
                {errors.material_type && <p className="text-red-500 text-xs mt-1">{errors.material_type.message as string}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Status <span className="text-red-500">*</span></label>
                <select
                  {...register("status")}
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white transition-shadow"
                  defaultValue="draft"
                >
                  <option value="draft">Draft (Disembunyikan)</option>
                  <option value="published">Published (Ditampilkan)</option>
                </select>
              </div>
            </div>

            {materialType && (
              <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200">
                {isFileBased ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Upload File Materi <span className="text-red-500">*</span></label>
                    
                    <div 
                      onDragOver={onDragOver} 
                      onDrop={onDrop}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${uploading ? 'bg-gray-50 border-gray-300 opacity-50 cursor-not-allowed' : 'hover:bg-emerald-50 hover:border-emerald-400 border-gray-300 bg-white cursor-pointer'}`}
                    >
                      <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${uploading ? 'text-gray-400' : 'text-emerald-500'}`} />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {uploading ? 'Sedang mengunggah...' : 'Tarik dan lepas file di sini'}
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        atau klik tombol di bawah untuk memilih file
                      </p>
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 shadow-sm'}`}>
                        Pilih File
                        <input
                          type="file"
                          className="hidden"
                          accept={
                            materialType === "pdf" ? ".pdf" :
                            materialType === "audio" ? "audio/*" :
                            materialType === "video" ? "video/*" :
                            materialType === "image" ? "image/*" :
                            "*"
                          }
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">URL File (Terisi otomatis)</label>
                      <div className="relative">
                        <input
                          type="text"
                          {...register("file_url", { required: "File wajib diunggah" })}
                          readOnly
                          placeholder="URL file akan muncul di sini setelah unggah selesai"
                          className={`w-full p-2.5 pr-10 border rounded-lg bg-gray-100 text-sm text-gray-600 outline-none ${errors.file_url ? 'border-red-500' : 'border-gray-200'}`}
                        />
                        {fileUrl && !uploading && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      {errors.file_url && <p className="text-red-500 text-xs mt-1">{errors.file_url.message as string}</p>}
                    </div>
                  </div>
                ) : isExternalUrl ? (
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      {materialType === 's3_link' ? 'URL S3 Contabo' : 'URL Eksternal (YouTube/G-Drive)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      {...register("file_url", { required: "URL wajib diisi" })}
                      className={`w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow ${errors.file_url ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder={
                        materialType === 's3_link' ? "https://...s3.contabo.com/..." :
                        materialType === 'youtube' ? "https://youtube.com/watch?v=..." :
                        "https://drive.google.com/file/d/..."
                      }
                    />
                    {errors.file_url && <p className="text-red-500 text-xs mt-1">{errors.file_url.message as string}</p>}
                    {materialType === 's3_link' && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-blue-500 inline-block"></span>
                        Pastikan file S3 memiliki ekstensi yang benar (.pdf, .mp4, .jpg, dll) agar pratinjau optimal.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Urutan Tampil (Opsional)</label>
              <input
                type="number"
                {...register("order_index", { valueAsNumber: true })}
                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow max-w-[200px]"
                placeholder="0"
                defaultValue={0}
              />
            </div>

            <div className="pt-6 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/onboarding")}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={formLoading || uploading}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formLoading || uploading}
                className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {formLoading ? 'Menyimpan...' : 'Simpan Materi'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Preview Section */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 sticky top-6">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                Pratinjau Live
              </h3>
            </div>
            <div className="p-6 bg-gray-100 flex-1 flex flex-col items-center justify-center overflow-auto">
              {renderViewer()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

