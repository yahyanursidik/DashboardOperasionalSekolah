import React from "react";
import { AlertTriangle, ExternalLink, FileText } from "lucide-react";
import { driveEmbedUrl, type OnboardingMaterial, youtubeEmbedUrl } from "./onboarding-config";

export const OnboardingViewer: React.FC<{ material: Pick<OnboardingMaterial, "title" | "material_type" | "file_url">; compact?: boolean }> = ({ material, compact = false }) => {
  const { file_url: fileUrl, material_type: type, title } = material;
  const height = compact ? "h-80" : "h-[min(68vh,680px)]";

  if (!fileUrl) return <ViewerMessage text="File atau tautan materi belum tersedia." />;
  if (type === "pdf") return <iframe src={fileUrl} className={`w-full ${height} border-0 bg-white`} title={`PDF ${title}`} />;
  if (type === "gdrive") return <iframe src={driveEmbedUrl(fileUrl)} className={`w-full ${height} border-0 bg-white`} title={`Google Drive ${title}`} />;
  if (type === "youtube") {
    const embedUrl = youtubeEmbedUrl(fileUrl);
    return embedUrl ? <iframe src={embedUrl} className={`w-full ${height} border-0 bg-black`} title={`YouTube ${title}`} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <ViewerMessage text="Tautan YouTube tidak valid." warning />;
  }
  if (type === "video") return <video controls preload="metadata" src={fileUrl} className={`w-full ${height} bg-black object-contain`} />;
  if (type === "audio") return <div className="flex min-h-48 items-center justify-center bg-muted/30 p-6"><audio controls preload="metadata" src={fileUrl} className="w-full max-w-2xl" /></div>;
  if (type === "image") return <div className="flex min-h-64 items-center justify-center bg-muted/30 p-4"><img src={fileUrl} alt={title} className={`max-w-full ${compact ? "max-h-80" : "max-h-[68vh]"} object-contain`} /></div>;
  if (type === "s3_link") {
    const cleanUrl = fileUrl.toLowerCase().split("?")[0];
    if (cleanUrl.endsWith(".pdf")) return <iframe src={fileUrl} className={`w-full ${height} border-0 bg-white`} title={title} />;
    if (/\.(jpg|jpeg|png|gif|webp)$/.test(cleanUrl)) return <div className="flex min-h-64 items-center justify-center bg-muted/30 p-4"><img src={fileUrl} alt={title} className="max-h-[68vh] max-w-full object-contain" /></div>;
    if (/\.(mp4|webm|ogg)$/.test(cleanUrl)) return <video controls preload="metadata" src={fileUrl} className={`w-full ${height} bg-black object-contain`} />;
    if (/\.(mp3|wav|m4a)$/.test(cleanUrl)) return <div className="p-8"><audio controls preload="metadata" src={fileUrl} className="w-full" /></div>;
    return <a href={fileUrl} target="_blank" rel="noreferrer" className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-primary hover:underline"><ExternalLink className="h-5 w-5" />Buka materi di tab baru</a>;
  }
  return <ViewerMessage text="Tipe materi belum didukung." warning />;
};

const ViewerMessage = ({ text, warning = false }: { text: string; warning?: boolean }) => (
  <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
    {warning ? <AlertTriangle className="h-8 w-8 text-amber-500" /> : <FileText className="h-8 w-8" />}
    <p className="text-sm font-semibold">{text}</p>
  </div>
);
