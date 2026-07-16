/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Clock3, ExternalLink, FileText, Heart, Library, Loader2, Search, Star, X } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { audienceLabel, gradeLabel, isLibraryPublished, resourceTypeLabel } from "../digital-library/library-config";
import type { LibraryAudience, LibraryBook } from "../digital-library/library-config";
import { supabaseClient } from "../../lib/supabase/client";
import type { ParentPortalContext } from "./portal-context";

type LibraryPortalProps = { audience: LibraryAudience; unitId?: string | null; gradeLevel?: number | null; title?: string };
type Activity = { progress_percent: number; is_favorite: boolean; completed_at?: string | null; last_opened_at?: string | null };

const getLocalActivity = (bookId: string): Activity => {
  try { return JSON.parse(window.localStorage.getItem(`library-activity:${bookId}`) || "{}") as Activity; }
  catch { return { progress_percent: 0, is_favorite: false }; }
};

export const DigitalLibraryPortal: React.FC<LibraryPortalProps> = ({ audience, unitId, gradeLevel, title = "Perpustakaan Digital" }) => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tab, setTab] = useState<"all" | "featured" | "favorites" | "unfinished">("all");
  const [selected, setSelected] = useState<LibraryBook | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [categoryResult, bookResult] = await Promise.all([
      supabaseClient.from("digital_library_categories").select("id,name").eq("is_active", true).order("sort_order").order("name"),
      supabaseClient.from("digital_library_books").select("*,digital_library_categories(name),units(name),digital_library_user_books(progress_percent,is_favorite,completed_at,last_opened_at)").eq("is_active", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (bookResult.error) {
      const fallback = await supabaseClient.from("digital_library_books").select("*,digital_library_categories(name)").eq("is_active", true).order("created_at", { ascending: false });
      if (fallback.error) toast.error("Perpustakaan belum dapat dimuat.");
      setBooks(((fallback.data || []) as unknown as LibraryBook[]).map((book) => ({ ...book, digital_library_user_books: [getLocalActivity(book.id)] })));
    } else setBooks((bookResult.data || []) as unknown as LibraryBook[]);
    if (categoryResult.error) {
      const fallbackCategories = await supabaseClient.from("digital_library_categories").select("id,name").order("name");
      setCategories((fallbackCategories.data || []) as unknown as Array<{ id: string; name: string }>);
    } else setCategories((categoryResult.data || []) as unknown as Array<{ id: string; name: string }>);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [audience, gradeLevel, unitId]);

  const scoped = useMemo(() => books.filter((book) => {
    const bookAudience = book.audience?.length ? book.audience : ["all"];
    const audienceMatches = bookAudience.includes("all") || bookAudience.includes(audience) || (audience === "parents" && bookAudience.includes("students"));
    const unitMatches = !book.unit_id || Boolean(unitId && book.unit_id === unitId);
    const gradeMatches = gradeLevel == null || ((book.grade_min == null || gradeLevel >= book.grade_min) && (book.grade_max == null || gradeLevel <= book.grade_max));
    const needle = query.trim().toLowerCase();
    const searchMatches = !needle || [book.title, book.author, book.publisher, book.description, ...(book.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(needle);
    const activity = book.digital_library_user_books?.[0];
    const tabMatches = tab === "all" || (tab === "featured" && book.is_featured) || (tab === "favorites" && activity?.is_favorite) || (tab === "unfinished" && Boolean(activity?.last_opened_at && !activity.completed_at));
    return isLibraryPublished(book) && audienceMatches && unitMatches && gradeMatches && searchMatches && (!category || book.category_id === category) && tabMatches;
  }), [audience, books, category, gradeLevel, query, tab, unitId]);

  const updateActivity = async (book: LibraryBook, changes: Partial<Activity>) => {
    const current = book.digital_library_user_books?.[0] || getLocalActivity(book.id);
    const next = { ...current, ...changes };
    const user = (await supabaseClient.auth.getUser()).data.user;
    let saved = false;
    if (user) {
      const payload = { user_id: user.id, book_id: book.id, first_opened_at: current.last_opened_at ? undefined : new Date().toISOString(), last_opened_at: changes.last_opened_at ?? current.last_opened_at ?? null, progress_percent: next.progress_percent || 0, is_favorite: Boolean(next.is_favorite), completed_at: next.completed_at || null };
      const { error } = await supabaseClient.from("digital_library_user_books").upsert(payload, { onConflict: "user_id,book_id" });
      saved = !error;
    }
    if (!saved) window.localStorage.setItem(`library-activity:${book.id}`, JSON.stringify(next));
    setBooks((currentBooks) => currentBooks.map((item) => item.id === book.id ? { ...item, digital_library_user_books: [next] } : item));
    setSelected((currentSelected) => currentSelected?.id === book.id ? { ...currentSelected, digital_library_user_books: [next] } : currentSelected);
  };

  const openBook = async (book: LibraryBook) => {
    setSelected(book);
    await updateActivity(book, { last_opened_at: new Date().toISOString(), progress_percent: Math.max(10, book.digital_library_user_books?.[0]?.progress_percent || 0) });
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat perpustakaan...</div>;

  const completed = books.filter((book) => book.digital_library_user_books?.[0]?.completed_at).length;
  const favorites = books.filter((book) => book.digital_library_user_books?.[0]?.is_favorite).length;
  return <div className="space-y-5 text-slate-900">
    <header className="rounded-lg border bg-white p-5 shadow-sm md:p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Library className="h-5 w-5" /></div><div><h1 className="text-xl font-bold text-slate-950 md:text-2xl">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Koleksi terkurasi untuk pembelajaran, pengasuhan, penguatan adab, dan pengembangan profesional.</p></div></div><div className="grid grid-cols-3 divide-x rounded-md border bg-slate-50 px-2 py-3 text-center md:min-w-72"><div><p className="font-bold">{books.length}</p><p className="text-[10px] text-slate-500">Koleksi</p></div><div><p className="font-bold">{favorites}</p><p className="text-[10px] text-slate-500">Favorit</p></div><div><p className="font-bold">{completed}</p><p className="text-[10px] text-slate-500">Selesai</p></div></div></div><label className="relative mt-5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul, penulis, tema, atau kata kunci" className="h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label></header>

    <div className="flex gap-2 overflow-x-auto pb-1">{([{ value: "all", label: "Semua" }, { value: "featured", label: "Pilihan" }, { value: "favorites", label: "Favorit" }, { value: "unfinished", label: "Lanjutkan" }] as const).map((item) => <button key={item.value} onClick={() => setTab(item.value)} className={`h-9 shrink-0 rounded-md border px-4 text-xs font-bold ${tab === item.value ? "border-emerald-700 bg-emerald-700 text-white" : "bg-white text-slate-600"}`}>{item.label}</button>)}</div>
    <div className="flex gap-2 overflow-x-auto pb-1"><button onClick={() => setCategory("")} className={`h-8 shrink-0 rounded-md px-3 text-xs font-semibold ${!category ? "bg-slate-900 text-white" : "border bg-white text-slate-600"}`}>Semua kategori</button>{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`h-8 shrink-0 rounded-md px-3 text-xs font-semibold ${category === item.id ? "bg-slate-900 text-white" : "border bg-white text-slate-600"}`}>{item.name}</button>)}</div>

    {scoped.length === 0 ? <section className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center"><BookOpen className="h-10 w-10 text-slate-300" /><h2 className="mt-3 font-bold">Belum ada koleksi sesuai pilihan</h2><p className="mt-1 text-sm text-slate-500">Coba kategori atau kata kunci lain.</p></section> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{scoped.map((book) => {
      const activity = book.digital_library_user_books?.[0];
      return <article key={book.id} className="flex min-w-0 gap-4 rounded-lg border bg-white p-4 shadow-sm"><button type="button" onClick={() => void openBook(book)} className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100 text-left">{book.cover_url ? <img src={book.cover_url} alt={`Sampul ${book.title}`} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center"><BookOpen className="h-7 w-7 text-slate-300" /></span>}{book.is_featured && <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded bg-amber-400 text-white"><Star className="h-3.5 w-3.5 fill-current" /></span>}</button><div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-2"><span className="text-[10px] font-bold uppercase text-emerald-700">{book.digital_library_categories?.name || resourceTypeLabel(book.resource_type)}</span><button type="button" onClick={() => void updateActivity(book, { is_favorite: !activity?.is_favorite })} title={activity?.is_favorite ? "Hapus dari favorit" : "Tambahkan ke favorit"} className={`shrink-0 ${activity?.is_favorite ? "text-rose-600" : "text-slate-400"}`}><Heart className={`h-4 w-4 ${activity?.is_favorite ? "fill-current" : ""}`} /></button></div><button type="button" onClick={() => void openBook(book)} className="mt-1 text-left"><h2 className="line-clamp-2 font-bold leading-5 text-slate-950">{book.title}</h2><p className="mt-1 truncate text-xs text-slate-500">{book.author}</p></button><div className="mt-auto space-y-2 pt-3"><div className="flex flex-wrap gap-2 text-[10px] text-slate-500">{book.estimated_minutes && <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{book.estimated_minutes} menit</span>}<span>{gradeLabel(book.grade_min, book.grade_max)}</span></div>{activity?.last_opened_at && <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${activity.progress_percent || 10}%` }} /></div>}<button type="button" onClick={() => void openBook(book)} className="flex h-8 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800">{activity?.last_opened_at ? "Lanjutkan" : "Lihat Koleksi"}<ExternalLink className="h-3.5 w-3.5" /></button></div></div></article>;
    })}</section>}

    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-emerald-700">{selected.digital_library_categories?.name || resourceTypeLabel(selected.resource_type)}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{selected.title}</h2><p className="mt-1 text-sm text-slate-500">{selected.author}</p></div><button onClick={() => setSelected(null)} title="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-5 sm:grid-cols-[140px_1fr]">{selected.cover_url ? <img src={selected.cover_url} alt="" className="aspect-[3/4] w-full rounded-md object-cover" /> : <div className="flex aspect-[3/4] items-center justify-center rounded-md bg-slate-100"><FileText className="h-8 w-8 text-slate-300" /></div>}<div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.description || "Tidak ada sinopsis untuk koleksi ini."}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Cakupan</dt><dd className="mt-1 font-semibold">{gradeLabel(selected.grade_min, selected.grade_max)}</dd></div><div><dt className="text-slate-500">Audiens</dt><dd className="mt-1 font-semibold">{audienceLabel(selected.audience)}</dd></div><div><dt className="text-slate-500">Penerbit</dt><dd className="mt-1 font-semibold">{selected.publisher || "-"}</dd></div><div><dt className="text-slate-500">Bahasa</dt><dd className="mt-1 font-semibold uppercase">{selected.language || "ID"}</dd></div></dl></div></div><div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between"><button type="button" onClick={() => void updateActivity(selected, { is_favorite: !selected.digital_library_user_books?.[0]?.is_favorite })} className="flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold"><Heart className={`h-4 w-4 ${selected.digital_library_user_books?.[0]?.is_favorite ? "fill-rose-600 text-rose-600" : ""}`} />Favorit</button><div className="flex gap-2"><button type="button" onClick={() => void updateActivity(selected, { progress_percent: 100, completed_at: new Date().toISOString() })} className="flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold"><Check className="h-4 w-4" />Tandai selesai</button><a href={selected.file_url} target="_blank" rel="noreferrer" onClick={() => void updateActivity(selected, { last_opened_at: new Date().toISOString(), progress_percent: Math.max(25, selected.digital_library_user_books?.[0]?.progress_percent || 0) })} className="flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white">Buka Sumber<ExternalLink className="h-4 w-4" /></a></div></div></section></div>}
  </div>;
};

export const PortalLibrary: React.FC = () => {
  const { student } = useOutletContext<ParentPortalContext>();
  const classInfo = student?.classes as (ParentPortalContext["student"]["classes"] & { grade_level?: number | string; level?: number | string }) | null;
  const unitId = student?.unit_id || classInfo?.unit_id;
  const gradeLevel = Number(classInfo?.grade_level ?? classInfo?.level);
  return <DigitalLibraryPortal audience="parents" unitId={unitId} gradeLevel={Number.isFinite(gradeLevel) ? gradeLevel : null} title="Perpustakaan Keluarga" />;
};

export const TeacherLibrary: React.FC = () => {
  const { employee } = useOutletContext<{ employee: { unit_id?: string | null } }>();
  return <DigitalLibraryPortal audience="teachers" unitId={employee?.unit_id} title="Perpustakaan Pengajar" />;
};

export const StaffLibrary: React.FC = () => {
  const { employee } = useOutletContext<{ employee: { unit_id?: string | null } }>();
  return <DigitalLibraryPortal audience="staff" unitId={employee?.unit_id} title="Perpustakaan Staf" />;
};
