import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, Image, Loader2, Save, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";
import { uploadDocument } from "../../lib/supabase/storage";
import { LIBRARY_AUDIENCES, LIBRARY_RESOURCE_TYPES, toDateTimeLocal } from "./library-config";
import type { LibraryBook } from "./library-config";

type Option = { id: string; name: string };
type FormState = {
  title: string; author: string; publisher: string; publication_year: string; category_id: string;
  description: string; cover_url: string; file_url: string; is_active: boolean; unit_id: string;
  resource_type: string; audience: string[]; grade_min: string; grade_max: string; language: string;
  isbn: string; page_count: string; estimated_minutes: string; tags: string; is_featured: boolean;
  publish_start_at: string; publish_end_at: string;
};

const EMPTY_FORM: FormState = {
  title: "", author: "", publisher: "", publication_year: "", category_id: "", description: "",
  cover_url: "", file_url: "", is_active: true, unit_id: "", resource_type: "ebook", audience: ["all"],
  grade_min: "", grade_max: "", language: "id", isbn: "", page_count: "", estimated_minutes: "",
  tags: "", is_featured: false, publish_start_at: "", publish_end_at: "",
};

const isMissingColumn = (message?: string) => Boolean(message && (message.includes("schema cache") || message.includes("column") || message.includes("does not exist")));

export const LibraryBookForm: React.FC<{ bookId?: string }> = ({ bookId }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [categoryResult, unitResult, bookResult] = await Promise.all([
        supabaseClient.from("digital_library_categories").select("id,name").order("name"),
        supabaseClient.from("units").select("id,name").order("name"),
        bookId ? supabaseClient.from("digital_library_books").select("*").eq("id", bookId).single() : Promise.resolve({ data: null, error: null }),
      ]);
      if (categoryResult.error) toast.error("Kategori perpustakaan belum dapat dimuat.");
      if (unitResult.error) toast.error("Unit sekolah belum dapat dimuat.");
      setCategories((categoryResult.data || []) as unknown as Option[]);
      setUnits((unitResult.data || []) as unknown as Option[]);
      if (bookResult.error) toast.error("Koleksi tidak ditemukan atau tidak dapat diakses.");
      if (bookResult.data) {
        const book = bookResult.data as unknown as LibraryBook;
        setForm({
          title: book.title || "", author: book.author || "", publisher: book.publisher || "",
          publication_year: book.publication_year || "", category_id: book.category_id || "",
          description: book.description || "", cover_url: book.cover_url || "", file_url: book.file_url || "",
          is_active: book.is_active ?? true, unit_id: book.unit_id || "", resource_type: book.resource_type || "ebook",
          audience: book.audience?.length ? book.audience : ["all"], grade_min: book.grade_min?.toString() || "",
          grade_max: book.grade_max?.toString() || "", language: book.language || "id", isbn: book.isbn || "",
          page_count: book.page_count?.toString() || "", estimated_minutes: book.estimated_minutes?.toString() || "",
          tags: book.tags?.join(", ") || "", is_featured: book.is_featured || false,
          publish_start_at: toDateTimeLocal(book.publish_start_at), publish_end_at: toDateTimeLocal(book.publish_end_at),
        });
      }
      setLoading(false);
    };
    void load();
  }, [bookId]);

  const checks = useMemo(() => [
    { label: "Identitas koleksi lengkap", done: Boolean(form.title.trim() && form.author.trim()) },
    { label: "Sumber baca tersedia", done: Boolean(form.file_url.trim() || bookFile) },
    { label: "Audiens ditentukan", done: form.audience.length > 0 },
    { label: "Rentang kelas valid", done: !form.grade_min || !form.grade_max || Number(form.grade_min) <= Number(form.grade_max) },
    { label: "Periode tayang valid", done: !form.publish_start_at || !form.publish_end_at || form.publish_end_at > form.publish_start_at },
  ], [bookFile, form]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleAudience = (value: string) => setForm((current) => {
    if (value === "all") return { ...current, audience: ["all"] };
    const withoutAll = current.audience.filter((item) => item !== "all");
    const next = withoutAll.includes(value) ? withoutAll.filter((item) => item !== value) : [...withoutAll, value];
    return { ...current, audience: next.length ? next : ["all"] };
  });

  const uploadFiles = async () => {
    let fileUrl = form.file_url.trim();
    let coverUrl = form.cover_url.trim();
    if (bookFile) {
      if (bookFile.size > 50 * 1024 * 1024) throw new Error("Ukuran file koleksi maksimal 50 MB.");
      const uploaded = await uploadDocument(bookFile, `digital-library/books/${new Date().getFullYear()}`);
      fileUrl = supabaseClient.storage.from("school-documents").getPublicUrl(uploaded.filePath).data.publicUrl;
    }
    if (coverFile) {
      if (!coverFile.type.startsWith("image/") || coverFile.size > 5 * 1024 * 1024) throw new Error("Sampul harus berupa gambar maksimal 5 MB.");
      const uploaded = await uploadDocument(coverFile, `digital-library/covers/${new Date().getFullYear()}`);
      coverUrl = supabaseClient.storage.from("school-documents").getPublicUrl(uploaded.filePath).data.publicUrl;
    }
    return { fileUrl, coverUrl };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (checks.some((item) => !item.done)) return toast.error("Lengkapi pemeriksaan sebelum menyimpan.");
    setSaving(true);
    try {
      const { fileUrl, coverUrl } = await uploadFiles();
      const user = (await supabaseClient.auth.getUser()).data.user;
      const payload = {
        title: form.title.trim(), author: form.author.trim(), publisher: form.publisher.trim() || null,
        publication_year: form.publication_year.trim() || null, category_id: form.category_id || null,
        description: form.description.trim() || null, cover_url: coverUrl || null, file_url: fileUrl,
        is_active: form.is_active, unit_id: form.unit_id || null, resource_type: form.resource_type,
        audience: form.audience, grade_min: form.grade_min ? Number(form.grade_min) : null,
        grade_max: form.grade_max ? Number(form.grade_max) : null, language: form.language || "id",
        isbn: form.isbn.trim() || null, page_count: form.page_count ? Number(form.page_count) : null,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean), is_featured: form.is_featured,
        publish_start_at: form.publish_start_at ? new Date(form.publish_start_at).toISOString() : null,
        publish_end_at: form.publish_end_at ? new Date(form.publish_end_at).toISOString() : null,
      };
      const query = bookId
        ? supabaseClient.from("digital_library_books").update(payload).eq("id", bookId)
        : supabaseClient.from("digital_library_books").insert({ ...payload, created_by: user?.id || null });
      let { error } = await query;
      if (error && isMissingColumn(error.message)) {
        const legacy = { title: payload.title, author: payload.author, publisher: payload.publisher, publication_year: payload.publication_year, category_id: payload.category_id, description: payload.description, cover_url: payload.cover_url, file_url: payload.file_url, is_active: payload.is_active };
        const fallback = bookId
          ? await supabaseClient.from("digital_library_books").update(legacy).eq("id", bookId)
          : await supabaseClient.from("digital_library_books").insert(legacy);
        error = fallback.error;
        if (!error) toast.warning("Koleksi tersimpan dalam format lama. Jalankan migrasi perpustakaan untuk mengaktifkan target unit dan audiens.");
      }
      if (error) throw error;
      toast.success(bookId ? "Koleksi berhasil diperbarui." : "Koleksi berhasil ditambahkan.");
      navigate("/digital-library");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Koleksi belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat koleksi...</div>;

  const inputClass = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";
  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div className="flex items-start gap-3"><button type="button" onClick={() => navigate(-1)} title="Kembali" className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button><PageHeader title={bookId ? "Ubah Koleksi Digital" : "Tambah Koleksi Digital"} description="Kurasi sumber belajar sesuai unit, jenjang, dan warga sekolah yang membutuhkan." /></div>
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5"><h2 className="flex items-center gap-2 font-bold"><BookOpen className="h-5 w-5 text-primary" />Identitas koleksi</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium md:col-span-2">Judul *<input required maxLength={180} value={form.title} onChange={(e) => setField("title", e.target.value)} className={inputClass} /></label>
          <label className="text-sm font-medium">Penulis / penyusun *<input required maxLength={120} value={form.author} onChange={(e) => setField("author", e.target.value)} className={inputClass} /></label>
          <label className="text-sm font-medium">Kategori<select value={form.category_id} onChange={(e) => setField("category_id", e.target.value)} className={inputClass}><option value="">Tanpa kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-medium">Penerbit<input value={form.publisher} onChange={(e) => setField("publisher", e.target.value)} className={inputClass} /></label>
          <label className="text-sm font-medium">Tahun terbit<input inputMode="numeric" maxLength={4} value={form.publication_year} onChange={(e) => setField("publication_year", e.target.value.replace(/\D/g, ""))} className={inputClass} /></label>
          <label className="text-sm font-medium">Bahasa<select value={form.language} onChange={(e) => setField("language", e.target.value)} className={inputClass}><option value="id">Indonesia</option><option value="ar">Arab</option><option value="en">Inggris</option><option value="su">Sunda</option><option value="other">Lainnya</option></select></label>
          <label className="text-sm font-medium">ISBN / kode koleksi<input value={form.isbn} onChange={(e) => setField("isbn", e.target.value)} className={inputClass} /></label>
          <label className="text-sm font-medium md:col-span-2">Sinopsis / manfaat<textarea rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} className="mt-1 w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></label>
          <label className="text-sm font-medium md:col-span-2">Tag pencarian<input value={form.tags} onChange={(e) => setField("tags", e.target.value)} placeholder="Contoh: adab, parenting, tahfidz" className={inputClass} /><span className="mt-1 block text-xs text-muted-foreground">Pisahkan setiap tag dengan koma.</span></label>
        </div></section>

        <section className="rounded-lg border bg-card p-5"><h2 className="font-bold">Cakupan pembaca</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Unit sekolah<select value={form.unit_id} onChange={(e) => setField("unit_id", e.target.value)} className={inputClass}><option value="">Lintas unit</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Kelas minimum<input type="number" min={0} max={12} value={form.grade_min} onChange={(e) => setField("grade_min", e.target.value)} className={inputClass} /></label><label className="text-sm font-medium">Kelas maksimum<input type="number" min={0} max={12} value={form.grade_max} onChange={(e) => setField("grade_max", e.target.value)} className={inputClass} /></label></div>
          <fieldset className="md:col-span-2"><legend className="text-sm font-medium">Audiens *</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{LIBRARY_AUDIENCES.map((item) => <label key={item.value} className="flex items-center gap-3 rounded-md border p-3 text-sm"><input type="checkbox" checked={form.audience.includes(item.value)} onChange={() => toggleAudience(item.value)} className="h-4 w-4" />{item.label}</label>)}</div></fieldset>
        </div></section>

        <section className="rounded-lg border bg-card p-5"><h2 className="flex items-center gap-2 font-bold"><FileText className="h-5 w-5 text-primary" />Sumber dan publikasi</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Jenis sumber<select value={form.resource_type} onChange={(e) => setField("resource_type", e.target.value)} className={inputClass}>{LIBRARY_RESOURCE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="text-sm font-medium">URL sumber *<input type="url" value={form.file_url} onChange={(e) => setField("file_url", e.target.value)} placeholder="https://..." className={inputClass} /></label>
          <label className="rounded-md border border-dashed p-4 text-sm font-medium"><span className="flex items-center gap-2"><UploadCloud className="h-4 w-4" />Atau unggah koleksi</span><input type="file" accept=".pdf,.epub,.doc,.docx,.mp3,.mp4" onChange={(e) => setBookFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-xs" />{bookFile && <span className="mt-2 block truncate text-xs text-primary">{bookFile.name}</span>}</label>
          <label className="text-sm font-medium">URL sampul<input type="url" value={form.cover_url} onChange={(e) => setField("cover_url", e.target.value)} placeholder="https://..." className={inputClass} /></label>
          <label className="rounded-md border border-dashed p-4 text-sm font-medium"><span className="flex items-center gap-2"><Image className="h-4 w-4" />Atau unggah sampul</span><input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-xs" />{coverFile && <span className="mt-2 block truncate text-xs text-primary">{coverFile.name}</span>}</label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Jumlah halaman<input type="number" min={1} value={form.page_count} onChange={(e) => setField("page_count", e.target.value)} className={inputClass} /></label><label className="text-sm font-medium">Estimasi baca (menit)<input type="number" min={1} value={form.estimated_minutes} onChange={(e) => setField("estimated_minutes", e.target.value)} className={inputClass} /></label></div>
          <label className="text-sm font-medium">Mulai tayang<input type="datetime-local" value={form.publish_start_at} onChange={(e) => setField("publish_start_at", e.target.value)} className={inputClass} /></label>
          <label className="text-sm font-medium">Selesai tayang<input type="datetime-local" value={form.publish_end_at} onChange={(e) => setField("publish_end_at", e.target.value)} className={inputClass} /></label>
          <label className="flex items-start gap-3 rounded-md border p-4 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setField("is_active", e.target.checked)} className="mt-0.5 h-4 w-4" /><span><strong className="block">Terbitkan koleksi</strong><span className="text-xs text-muted-foreground">Koleksi dapat tampil jika periode publikasinya juga berlaku.</span></span></label>
          <label className="flex items-start gap-3 rounded-md border p-4 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => setField("is_featured", e.target.checked)} className="mt-0.5 h-4 w-4" /><span><strong className="block">Koleksi pilihan</strong><span className="text-xs text-muted-foreground">Prioritaskan pada bagian rekomendasi portal.</span></span></label>
        </div></section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20"><section className="rounded-lg border bg-card p-5"><h2 className="font-bold">Pemeriksaan sebelum simpan</h2><div className="mt-4 space-y-3">{checks.map((item) => <div key={item.label} className="flex items-center gap-2 text-sm"><CheckCircle2 className={`h-4 w-4 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} /><span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span></div>)}</div><button disabled={saving || checks.some((item) => !item.done)} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{bookId ? "Simpan Perubahan" : "Simpan Koleksi"}</button></section></aside>
    </form>
  </div>;
};
