/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit, FolderTree, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";

type Category = { id: string; name: string; code?: string | null; description?: string | null; unit_id?: string | null; sort_order?: number; is_active?: boolean; units?: { name?: string } | null; digital_library_books?: Array<{ count: number }> };

export const DigitalLibraryCategoriesList: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = async () => {
    setLoading(true);
    const result = await supabaseClient.from("digital_library_categories").select("*,units(name),digital_library_books(count)").order("sort_order").order("name");
    if (result.error) {
      const fallback = await supabaseClient.from("digital_library_categories").select("*").order("name");
      if (fallback.error) toast.error("Kategori belum dapat dimuat.");
      setCategories((fallback.data || []) as unknown as Category[]);
    } else setCategories((result.data || []) as unknown as Category[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => categories.filter((item) => [item.name, item.code, item.description, item.units?.name].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())), [categories, query]);

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabaseClient.from("digital_library_categories").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message || "Kategori belum dapat dihapus.");
    toast.success("Kategori berhasil dihapus. Koleksi di dalamnya tetap tersimpan tanpa kategori.");
    setDeleting(null); await load();
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><button onClick={() => navigate("/digital-library")} title="Kembali ke katalog" className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button><PageHeader title="Kategori Perpustakaan" description="Atur kelompok koleksi, cakupan unit, dan urutan yang tampil di portal." /></div><Link to="/digital-library/categories/create" className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />Tambah Kategori</Link></div><section className="overflow-hidden rounded-lg border bg-card"><div className="border-b p-4"><label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kategori, kode, atau unit" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></label></div>{loading ? <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat kategori...</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><FolderTree className="h-10 w-10 text-muted-foreground/40" /><h2 className="mt-3 font-bold">Belum ada kategori</h2><p className="mt-1 text-sm text-muted-foreground">Tambahkan kategori agar koleksi lebih mudah ditemukan.</p></div> : <div className="divide-y">{filtered.map((item) => <article key={item.id} className="flex flex-col gap-4 p-4 hover:bg-muted/20 sm:flex-row sm:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FolderTree className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{item.name}</h2>{item.code && <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold">{item.code}</span>}<span className={`rounded px-2 py-0.5 text-[10px] font-bold ${item.is_active === false ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>{item.is_active === false ? "Nonaktif" : "Aktif"}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.units?.name || "Lintas unit"} · {item.digital_library_books?.[0]?.count || 0} koleksi · Urutan {item.sort_order ?? 0}</p>{item.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}</div><div className="flex justify-end gap-1"><Link to={`/digital-library/categories/edit/${item.id}`} title="Ubah kategori" className="flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"><Edit className="h-4 w-4" /></Link><button onClick={() => setDeleting(item)} title="Hapus kategori" className="flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}</section>{deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"><h2 className="text-lg font-bold">Hapus kategori?</h2><p className="mt-2 text-sm text-muted-foreground">Koleksi dalam “{deleting.name}” tidak ikut terhapus dan akan menjadi tanpa kategori.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleting(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button onClick={() => void remove()} className="h-10 rounded-md bg-red-600 px-4 text-sm font-bold text-white">Hapus</button></div></section></div>}</div>;
};
