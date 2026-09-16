/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { CirclePlay, ExternalLink, FileAudio, FileImage, FileText, FileVideo } from "lucide-react";

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || "";
    return parsed.searchParams.get("v") || "";
  } catch { return ""; }
}

function drivePreviewUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)(drive|docs)\.google\.com$/i.test(parsed.hostname)) return "";
    const id = parsed.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([^/]+)/)?.[1]
      || parsed.searchParams.get("id");
    if (!id) return "";
    if (parsed.pathname.includes("/document/")) return `https://docs.google.com/document/d/${id}/preview`;
    if (parsed.pathname.includes("/presentation/")) return `https://docs.google.com/presentation/d/${id}/preview`;
    if (parsed.pathname.includes("/spreadsheets/")) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    return `https://drive.google.com/file/d/${id}/preview`;
  } catch { return ""; }
}

export const HblMediaPreview: React.FC<{ type: string; url?: string | null; title: string; text?: string | null }> = ({ type, url, title, text }) => {
  const sourceUrl = url || "";
  const preview = type === "youtube"
    ? (youtubeId(sourceUrl) ? `https://www.youtube-nocookie.com/embed/${youtubeId(sourceUrl)}` : "")
    : drivePreviewUrl(sourceUrl);

  if (type === "text") return <div className="min-h-24 whitespace-pre-line rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">{text || "Konten teks belum diisi."}</div>;
  if (type === "video") return <video controls className="aspect-video w-full rounded-lg border bg-black" src={sourceUrl}>Video tidak dapat diputar pada perangkat ini.</video>;
  if (type === "audio") return <div className="flex min-h-24 items-center gap-3 rounded-lg border bg-muted/20 p-4"><FileAudio className="h-6 w-6 text-primary" /><audio controls className="w-full" src={sourceUrl}>Audio tidak dapat diputar pada perangkat ini.</audio></div>;
  if (type === "image") return <img src={sourceUrl} alt={title} loading="lazy" className="max-h-80 w-full rounded-lg border object-contain bg-muted/20" />;
  if ((type === "pdf" || type === "ppt" || type === "google_slides") && /^https:\/\//i.test(sourceUrl)) return <iframe src={sourceUrl} title={`Pratinjau ${title}`} loading="lazy" className="h-72 w-full rounded-lg border" />;
  if (!preview) return (
    <a href={sourceUrl} target="_blank" rel="noreferrer" className="flex min-h-28 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-4 text-sm font-semibold text-primary">
      {type === "youtube" ? <CirclePlay className="h-5 w-5" /> : type === "video" ? <FileVideo className="h-5 w-5" /> : type === "image" ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      Buka sumber materi <ExternalLink className="h-4 w-4" />
    </a>
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-black">
      <iframe
        src={preview}
        title={`Pratinjau ${title}`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="aspect-video w-full"
      />
    </div>
  );
};

export function isValidHblResource(type: string, url: string) {
  if (type === "text") return true;
  if (type === "youtube") return Boolean(youtubeId(url));
  if (type === "google_drive") return Boolean(drivePreviewUrl(url));
  return /^https:\/\//i.test(url);
}
