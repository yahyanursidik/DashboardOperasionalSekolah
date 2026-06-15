import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { uploadDocument, getDocumentSignedUrl } from "../../lib/supabase/storage";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  bucketName?: string;
  folderPath?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  value, 
  onChange,
  bucketName = "school-documents",
  folderPath = "avatars"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load actual image URL if the value is a storage path
  React.useEffect(() => {
    if (value) {
      if (value.startsWith('http')) {
        setPreview(value);
      } else {
        // Assume it's a Supabase storage path
        const { data } = supabaseClient.storage.from(bucketName).getPublicUrl(value);
        setPreview(data.publicUrl);
      }
    } else {
      setPreview(null);
    }
  }, [value, bucketName]);

  const processAndUploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG/PNG)");
      return;
    }

    setIsUploading(true);
    
    try {
      // 1. Create a local preview and load image
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 2. Auto Crop & Resize to 500x500
      const TARGET_SIZE = 500;
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Could not get canvas context");

      // Calculate crop dimensions to center the image
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      ctx.drawImage(
        img,
        startX, startY, size, size, // Source (x, y, w, h)
        0, 0, TARGET_SIZE, TARGET_SIZE // Destination (x, y, w, h)
      );

      // 3. Convert Canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
      });

      if (!blob) throw new Error("Gagal memproses gambar");

      // Set local preview while uploading for better UX
      setPreview(URL.createObjectURL(blob));

      // 4. Upload to Supabase
      const processedFile = new File([blob], `avatar_${Date.now()}.jpg`, { type: "image/jpeg" });
      const uploadResult = await uploadDocument(processedFile, folderPath);
      
      // Pass the path back to the form
      onChange(uploadResult.filePath);
      toast.success("Foto berhasil diproses dan diunggah!");
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Gagal mengunggah foto.");
      // Reset preview to old value on error
      setPreview(value);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadImage(file);
    }
  };

  const handleRemove = () => {
    onChange("");
    setPreview(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div 
          className={`w-32 h-32 rounded-full overflow-hidden border-4 border-muted bg-muted/50 flex items-center justify-center relative transition-all ${!preview ? 'border-dashed' : ''} ${isUploading ? 'opacity-50' : ''}`}
        >
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserPlaceholder />
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {!isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Ubah Foto</span>
            </button>
          )}
        </div>

        {preview && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-1.5 rounded-full shadow-md hover:bg-destructive/90 transition-transform hover:scale-110 z-10"
            title="Hapus Foto"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-50 flex items-center justify-center gap-1.5 mx-auto"
        >
          <Upload className="w-4 h-4" />
          {preview ? 'Ganti Foto' : 'Unggah Foto'}
        </button>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Format JPG/PNG. Gambar akan dipotong & di-resize otomatis (1:1).
        </p>
      </div>
    </div>
  );
};

const UserPlaceholder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-muted-foreground/40">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
