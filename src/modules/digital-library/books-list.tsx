/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Edit, ExternalLink, Filter, Library, Loader2, Plus, Search, Star, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";
import { audienceLabel, gradeLabel, isLibraryPublished, resourceTypeLabel } from "./library-config";
import type { LibraryBook } from "./library-config";

const PAGE_SIZE = 12;

export const DigitalLibraryBooksList: React.FC = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<LibraryBook | null>(null);

  const load = async () => {
    setLoading(true);
    const [categoryResult, bookResult] = await Promise.all([
      supabaseClient.from("digital_library_categories").select("id,name").order("name"),
      supabaseClient.from("digital_library_books")
        .select("*,digital_library_categories(name),units(name),digital_library_user_books(progress_percent,is_favorite,completed_at,last_opened_at)")
        .order("is_featured", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setCategories((categoryResult.data || []) as unknown as Array<{ id: string; name: string }>);
    if (bookResult.error) {
      const fallback = await supabaseClient.from("digital_library_books").select("*,digital_library_categories(name)").order("created_at", { ascending: false });
      if (fallback.error) toast.error("Katalog perpustakaan belum dapat dimuat.");
      setBooks((fallback.data || []) as unknown as LibraryBook[]);
    } else setBooks((bookResult.data || []) as unknown as LibraryBook[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => books.filter((book) => {
    const needle = query.trim().toLowerCase();
    const searchable = [book.title, book.author, book.publisher, ...(book.tags || [])].filter(Boolean).join(" ").toLowerCase();
    const statusMatches = status === "all" || (status === "published" ? isLibraryPublished(book) : !isLibraryPublished(book));
    return (!needle || searchable.includes(needle)) && (!category || book.category_id === category) && statusMatches;
  }), [books, category, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activityCount = books.reduce((total, book) => total + (book.digital_library_user_books?.filter((item) => item.last_opened_at).length || 0), 0);

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabaseClient.from("digital_library_books").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message || "Koleksi belum dapat dihapus.");
    toast.success("Koleksi berhasil dihapus.");
    setDeleting(null);
    await load();
  };

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><PageHeader title="Perpustakaan Digital" description="Kurasi sumber baca dan belajar sesuai unit, jenjang, serta kebutuhan warga sekolah." /><div className="flex flex-wrap gap-2"><Link to="/digital-library/categories" className="flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-muted"><Filter className="h-4 w-4" />Kategori</Link><Link to="/digital-library/create" className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" />Tambah Koleksi</Link></div></div>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[{ label: "Total koleksi", value: books.length, icon: Library, tone: "text-blue-700 bg-blue-50" }, { label: "Sedang tayang", value: books.filter(isLibraryPublished).length, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" }, { label: "Koleksi pilihan", value: books.filter((item) => item.is_featured).length, icon: Star, tone: "text-amber-700 bg-amber-50" }, { label: "Akun pernah membuka", value: activityCount, icon: Users, tone: "text-violet-700 bg-violet-50" }].map((item) => <article key={item.label} className="rounded-lg border bg-card p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-4 w-4" /></div><p className="mt-4 text-2xl font-bold">{item.value}</p><p className="text-xs font-medium text-muted-foreground">{item.label}</p></article>)}
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(220px,1fr)_220px_180px]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari judul, penulis, penerbit, atau tag" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></label><select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="all">Semua status</option><option value="published">Sedang tayang</option><option value="draft">Draf / tidak tayang</option></select></div>

      {loading ? <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat katalog...</div> : visible.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center"><BookOpen className="h-10 w-10 text-muted-foreground/40" /><h2 className="mt-3 font-bold">Belum ada koleksi sesuai filter</h2><p className="mt-1 text-sm text-muted-foreground">Ubah pencarian atau tambahkan sumber belajar yang sudah dikurasi.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Koleksi</th><th className="px-5 py-3">Cakupan</th><th className="px-5 py-3">Publikasi</th><th className="px-5 py-3">Pemanfaatan</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{visible.map((book) => <tr key={book.id} className="align-top hover:bg-muted/20"><td className="px-5 py-4"><div className="flex gap-3">{book.cover_url ? <img src={book.cover_url} alt="" className="h-16 w-12 rounded object-cover" /> : <div className="flex h-16 w-12 items-center justify-center rounded bg-muted"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5">{book.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}<p className="font-bold">{book.title}</p></div><p className="text-xs text-muted-foreground">{book.author}</p><p className="mt-1 text-xs text-primary">{book.digital_library_categories?.name || "Tanpa kategori"} · {resourceTypeLabel(book.resource_type)}</p></div></div></td><td className="px-5 py-4"><p className="font-medium">{book.units?.name || "Lintas unit"}</p><p className="mt-1 max-w-56 text-xs text-muted-foreground">{audienceLabel(book.audience)} · {gradeLabel(book.grade_min, book.grade_max)}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${isLibraryPublished(book) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{isLibraryPublished(book) ? "Tayang" : "Draf / dijadwalkan"}</span>{book.publish_end_at && <p className="mt-1 text-xs text-muted-foreground">s.d. {new Date(book.publish_end_at).toLocaleDateString("id-ID")}</p>}</td><td className="px-5 py-4"><p className="font-bold">{book.digital_library_user_books?.filter((item) => item.last_opened_at).length || 0} pembaca</p><p className="text-xs text-muted-foreground">{book.digital_library_user_books?.filter((item) => item.completed_at).length || 0} selesai</p></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><a href={book.file_url} target="_blank" rel="noreferrer" title="Buka sumber" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"><ExternalLink className="h-4 w-4" /></a><Link to={`/digital-library/edit/${book.id}`} title="Ubah koleksi" className="flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"><Edit className="h-4 w-4" /></Link><button type="button" onClick={() => setDeleting(book)} title="Hapus koleksi" className="flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
        <div className="divide-y md:hidden">{visible.map((book) => <article key={book.id} className="p-4"><div className="flex gap-3">{book.cover_url ? <img src={book.cover_url} alt="" className="h-24 w-16 rounded object-cover" /> : <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-muted"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="font-bold leading-5">{book.title}</h2>{book.is_featured && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />}</div><p className="mt-1 text-xs text-muted-foreground">{book.author}</p><span className={`mt-2 inline-flex rounded px-2 py-1 text-[10px] font-bold ${isLibraryPublished(book) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{isLibraryPublished(book) ? "Tayang" : "Draf"}</span></div></div><p className="mt-3 text-xs text-muted-foreground">{book.units?.name || "Lintas unit"} · {audienceLabel(book.audience)} · {gradeLabel(book.grade_min, book.grade_max)}</p><div className="mt-3 flex justify-end gap-1 border-t pt-3"><a href={book.file_url} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold hover:bg-muted"><ExternalLink className="h-4 w-4" />Buka</a><Link to={`/digital-library/edit/${book.id}`} className="flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"><Edit className="h-4 w-4" /></Link><button type="button" onClick={() => setDeleting(book)} className="flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>
      </>}

      <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row"><p className="text-xs text-muted-foreground">Menampilkan {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} koleksi</p><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} title="Halaman sebelumnya" className="flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-20 text-center text-xs font-semibold">{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} title="Halaman berikutnya" className="flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
    </section>

    {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"><AlertTriangle className="h-10 w-10 text-red-600" /><h2 className="mt-4 text-lg font-bold">Hapus koleksi?</h2><p className="mt-2 text-sm text-muted-foreground">“{deleting.title}” dan seluruh riwayat aktivitasnya akan dihapus permanen.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleting(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button onClick={() => void remove()} className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white">Hapus</button></div></section></div>}
  </div>;
};
