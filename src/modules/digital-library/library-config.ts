export const LIBRARY_RESOURCE_TYPES = [
  { value: "ebook", label: "E-book / PDF" },
  { value: "article", label: "Artikel / Modul" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "external", label: "Tautan eksternal" },
] as const;

export const LIBRARY_AUDIENCES = [
  { value: "all", label: "Seluruh warga sekolah" },
  { value: "parents", label: "Orang tua" },
  { value: "students", label: "Siswa melalui orang tua" },
  { value: "teachers", label: "Guru / pengajar" },
  { value: "staff", label: "Staf nonakademik" },
] as const;

export type LibraryAudience = (typeof LIBRARY_AUDIENCES)[number]["value"];
export type LibraryResourceType = (typeof LIBRARY_RESOURCE_TYPES)[number]["value"];

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  publisher?: string | null;
  publication_year?: string | null;
  category_id?: string | null;
  description?: string | null;
  cover_url?: string | null;
  file_url: string;
  is_active: boolean;
  unit_id?: string | null;
  resource_type?: LibraryResourceType;
  audience?: LibraryAudience[];
  grade_min?: number | null;
  grade_max?: number | null;
  language?: string | null;
  isbn?: string | null;
  page_count?: number | null;
  estimated_minutes?: number | null;
  tags?: string[];
  is_featured?: boolean;
  publish_start_at?: string | null;
  publish_end_at?: string | null;
  created_at?: string;
  units?: { name?: string } | null;
  digital_library_categories?: { name?: string } | null;
  digital_library_user_books?: Array<{
    progress_percent?: number;
    is_favorite?: boolean;
    completed_at?: string | null;
    last_opened_at?: string | null;
  }>;
}

export const resourceTypeLabel = (value?: string | null) =>
  LIBRARY_RESOURCE_TYPES.find((item) => item.value === value)?.label || "E-book / PDF";

export const audienceLabel = (values?: string[] | null) => {
  if (!values?.length || values.includes("all")) return "Seluruh warga sekolah";
  return values.map((value) => LIBRARY_AUDIENCES.find((item) => item.value === value)?.label || value).join(", ");
};

export const gradeLabel = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return "Semua jenjang";
  if (min === 0 && max === 0) return "Preschool";
  if (min != null && max != null && min === max) return `Kelas ${min}`;
  return `Kelas ${min ?? 1}-${max ?? 12}`;
};

export const isLibraryPublished = (book: LibraryBook) => {
  const now = Date.now();
  return book.is_active
    && (!book.publish_start_at || new Date(book.publish_start_at).getTime() <= now)
    && (!book.publish_end_at || new Date(book.publish_end_at).getTime() >= now);
};

export const toDateTimeLocal = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
