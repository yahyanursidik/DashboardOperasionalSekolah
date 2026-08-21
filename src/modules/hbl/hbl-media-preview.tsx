/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { CirclePlay, ExternalLink, FileText } from "lucide-react";

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

export const HblMediaPreview: React.FC<{ type: "youtube" | "google_drive"; url: string; title: string }> = ({ type, url, title }) => {
  const preview = type === "youtube"
    ? (youtubeId(url) ? `https://www.youtube-nocookie.com/embed/${youtubeId(url)}` : "")
    : drivePreviewUrl(url);

  if (!preview) return (
    <a href={url} target="_blank" rel="noreferrer" className="flex min-h-28 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-4 text-sm font-semibold text-primary">
      {type === "youtube" ? <CirclePlay className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
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
  if (type === "youtube") return Boolean(youtubeId(url));
  return Boolean(drivePreviewUrl(url));
}
