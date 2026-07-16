export const onboardingMaterialTypes = [
  { value: "pdf", label: "Dokumen PDF" },
  { value: "image", label: "Gambar" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "youtube", label: "YouTube" },
  { value: "gdrive", label: "Google Drive" },
  { value: "s3_link", label: "Tautan penyimpanan" },
] as const;

export const onboardingCategories = [
  { value: "orientation", label: "Orientasi Sekolah" },
  { value: "academic", label: "Akademik & Pembelajaran" },
  { value: "quran", label: "Program Al-Qur'an" },
  { value: "student_welfare", label: "Kesiswaan & Perlindungan" },
  { value: "finance", label: "Keuangan" },
  { value: "safety", label: "Keselamatan & Kedaruratan" },
  { value: "policy", label: "Kebijakan & SOP" },
  { value: "technology", label: "Sistem & Teknologi" },
  { value: "general", label: "Informasi Umum" },
] as const;

export const onboardingAudiences = [
  { value: "parents", label: "Orang Tua / Wali" },
  { value: "teachers", label: "Guru / Pengajar" },
  { value: "staff", label: "Staf Nonakademik" },
  { value: "all", label: "Semua Portal" },
] as const;

export type OnboardingMaterial = {
  id: string;
  title: string;
  description?: string | null;
  material_type: string;
  file_url: string;
  status: "draft" | "published";
  order_index: number;
  unit_id?: string | null;
  category?: string | null;
  audience?: string[] | null;
  is_required?: boolean;
  estimated_minutes?: number;
  version_label?: string | null;
  publish_start_at?: string | null;
  publish_end_at?: string | null;
  acknowledgement_required?: boolean;
  acknowledgement_text?: string | null;
  units?: { name?: string | null } | null;
  created_at?: string;
  updated_at?: string;
};

export const labelFor = (items: ReadonlyArray<{ value: string; label: string }>, value?: string | null) =>
  items.find((item) => item.value === value)?.label || String(value || "-").replace(/_/g, " ");

export const materialAudience = (material: OnboardingMaterial) => material.audience?.length ? material.audience : ["parents"];

export const isPublishedNow = (material: OnboardingMaterial, now = Date.now()) =>
  material.status === "published"
  && (!material.publish_start_at || new Date(material.publish_start_at).getTime() <= now)
  && (!material.publish_end_at || new Date(material.publish_end_at).getTime() >= now);

export const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

export const youtubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export const driveEmbedUrl = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
};
