import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Book, UploadCloud, Link as LinkIcon, Image as ImageIcon, FileText } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useSelect } from "@refinedev/core";
import { uploadDocument } from "../../lib/supabase/storage";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";

export const DigitalLibraryBooksCreate: React.FC = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    refineCoreProps: {
      resource: "digital_library_books",
      redirect: "list",
    },
  });

  const { options: categoryOptions, isLoading: categoryLoading } = useSelect({
    resource: "digital_library_categories",
    optionLabel: "name",
    optionValue: "id",
  });

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Toggle states
  const [fileMode, setFileMode] = useState<"url" | "upload">("url");
  const [coverMode, setCoverMode] = useState<"url" | "upload">("url");

  // Local file states
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const startProgress = (message: string) => {
    setStatusMessage(message);
    setUploadStatus("uploading");
    setUploadProgress(0);
    return setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 500);
  };

  const onSubmit = async (data: any) => {
    let interval: any = null;
    try {
      setUploadingFiles(true);
      let fileUrl = data.file_url;
      let coverUrl = data.cover_url;

      // Upload Book File if mode is upload
      if (fileMode === "upload" && bookFile) {
        interval = startProgress("Mengunggah file buku...");
        const result = await uploadDocument(bookFile, "digital-library/books");
        const { data: publicData } = supabaseClient.storage.from("school-documents").getPublicUrl(result.filePath);
        fileUrl = publicData.publicUrl;
        clearInterval(interval);
        setUploadProgress(100);
      }

      // Upload Cover File if mode is upload
      if (coverMode === "upload" && coverFile) {
        interval = startProgress("Mengunggah cover buku...");
        const result = await uploadDocument(coverFile, "digital-library/covers");
        const { data: publicData } = supabaseClient.storage.from("school-documents").getPublicUrl(result.filePath);
        coverUrl = publicData.publicUrl;
        clearInterval(interval);
        setUploadProgress(100);
      }

      // Requirement check
      if (!fileUrl) {
        toast.error("File buku atau URL wajib diisi");
        setUploadingFiles(false);
        setUploadStatus("error");
        return;
      }

      setStatusMessage("Menyimpan data buku...");
      const finalData = {
        ...data,
        file_url: fileUrl,
        cover_url: coverUrl,
      };

      await onFinish(finalData);
      setUploadStatus("success");
      setStatusMessage("Buku berhasil disimpan!");
      toast.success("Buku berhasil ditambahkan!");
    } catch (error: any) {
      if (interval) clearInterval(interval);
      console.error(error);
      setUploadStatus("error");
      setStatusMessage("Gagal menyimpan data!");
      toast.error(error.message || "Gagal mengunggah file");
    } finally {
      setUploadingFiles(false);
    }
  };

  const isSubmitting = formLoading || uploadingFiles;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <PageHeader
          title="Tambah Buku"
          description="Tambahkan buku baru ke perpustakaan digital"
          icon={Book}
        />
      </div>

      <div className="bg-card border rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KOLOM KIRI: INFO DASAR */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Judul Buku <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("title", { required: "Judul buku wajib diisi" })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.title ? "border-red-500" : "border-input"
                  }`}
                  placeholder="Masukkan judul buku"
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Penulis <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("author", { required: "Nama penulis wajib diisi" })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.author ? "border-red-500" : "border-input"
                  }`}
                  placeholder="Nama penulis"
                />
                {errors.author && (
                  <p className="text-sm text-red-500">{errors.author.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Kategori</label>
                  <button 
                    type="button" 
                    onClick={() => navigate("/digital-library/categories/create")}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    + Tambah Kategori
                  </button>
                </div>
                <select
                  {...register("category_id")}
                  disabled={categoryLoading}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-input bg-white disabled:bg-muted/50"
                >
                  <option value="">Pilih Kategori...</option>
                  {categoryOptions?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Penerbit</label>
                  <input
                    {...register("publisher")}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-input"
                    placeholder="Nama penerbit"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tahun Terbit</label>
                  <input
                    {...register("publication_year")}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-input"
                    placeholder="Contoh: 2023"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi / Sinopsis</label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-input"
                  placeholder="Sinopsis singkat..."
                />
              </div>
            </div>

            {/* KOLOM KANAN: UPLOADS & STATUS */}
            <div className="space-y-6">
              
              {/* FILE BUKU */}
              <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    File Buku (PDF/Dokumen) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFileMode("url")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${fileMode === "url" ? "bg-white shadow-sm" : "text-muted-foreground hover:bg-white/50"}`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" /> URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileMode("upload")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${fileMode === "upload" ? "bg-white shadow-sm" : "text-muted-foreground hover:bg-white/50"}`}
                    >
                      <UploadCloud className="w-3 h-3 inline mr-1" /> Upload
                    </button>
                  </div>
                </div>

                {fileMode === "url" ? (
                  <div className="space-y-2">
                    <input
                      {...register("file_url")}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 border-input"
                      placeholder="https://... (Link Google Drive / PDF)"
                    />
                    <p className="text-xs text-muted-foreground">Masukkan link langsung ke dokumen.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.epub"
                      onChange={(e) => setBookFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <p className="text-xs text-muted-foreground">Upload file langsung (Maks. 50MB disarankan).</p>
                  </div>
                )}
              </div>

              {/* COVER BUKU */}
              <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    Cover Buku (Gambar)
                  </label>
                  <div className="flex bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCoverMode("url")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${coverMode === "url" ? "bg-white shadow-sm" : "text-muted-foreground hover:bg-white/50"}`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" /> URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode("upload")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${coverMode === "upload" ? "bg-white shadow-sm" : "text-muted-foreground hover:bg-white/50"}`}
                    >
                      <UploadCloud className="w-3 h-3 inline mr-1" /> Upload
                    </button>
                  </div>
                </div>

                {coverMode === "url" ? (
                  <div className="space-y-2">
                    <input
                      {...register("cover_url")}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border-input"
                      placeholder="https://... (Link gambar JPG/PNG)"
                    />
                    <p className="text-xs text-muted-foreground">Masukkan link gambar untuk cover buku.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-muted-foreground">Upload gambar cover buku (Rasio portrait disarankan).</p>
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register("is_active")}
                  defaultChecked
                  className="mt-1 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <div>
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer block">
                    Buku Aktif (Ditampilkan)
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hapus centang jika buku ini sedang tidak ingin ditampilkan di Portal Orang Tua.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-6 border-t mt-6 flex flex-col gap-4">
            
            {/* Progress UI */}
            {(uploadStatus === "uploading" || uploadStatus === "success" || uploadStatus === "error") && (
              <div className="w-full bg-muted/30 border rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${uploadStatus === "error" ? "text-red-600" : "text-emerald-700"}`}>
                    {statusMessage}
                  </span>
                  {uploadStatus === "uploading" && <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>}
                  {uploadStatus === "success" && <span className="text-emerald-600 font-bold">Sukses</span>}
                  {uploadStatus === "error" && <span className="text-red-600 font-bold">Gagal</span>}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      uploadStatus === "error" ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[140px] justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Buku
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
