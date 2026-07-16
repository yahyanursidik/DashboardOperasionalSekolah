import React, { useEffect, useState } from "react";
import { ArrowLeft, FolderTree, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";

export const LibraryCategoryForm: React.FC<{ categoryId?: string }> = ({ categoryId }) => {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ name: "", code: "", description: "", unit_id: "", sort_order: "0", is_active: true });
  const [loading, setLoading] = useState(Boolean(categoryId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [unitResult, categoryResult] = await Promise.all([
        supabaseClient.from("units").select("id,name").order("name"),
        categoryId ? supabaseClient.from("digital_library_categories").select("*").eq("id", categoryId).single() : Promise.resolve({ data: null, error: null }),
      ]);
      setUnits((unitResult.data || []) as unknown as Array<{ id: string; name: string }>);
      if (categoryResult.data) {
        const category = categoryResult.data as unknown as { name?: string; code?: string; description?: string; unit_id?: string; sort_order?: number; is_active?: boolean };
        setForm({
          name: category.name || "", code: category.code || "", description: category.description || "",
          unit_id: category.unit_id || "", sort_order: String(category.sort_order ?? 0), is_active: category.is_active ?? true,
        });
      }
      if (categoryResult.error) toast.error("Kategori tidak ditemukan atau tidak dapat diakses.");
      setLoading(false);
    };
    void load();
  }, [categoryId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase() || null, description: form.description.trim() || null, unit_id: form.unit_id || null, sort_order: Number(form.sort_order) || 0, is_active: form.is_active };
    let result = categoryId ? await supabaseClient.from("digital_library_categories").update(payload).eq("id", categoryId) : await supabaseClient.from("digital_library_categories").insert(payload);
    if (result.error && (result.error.message.includes("schema cache") || result.error.message.includes("column"))) {
      const legacy = { name: payload.name, description: payload.description };
      result = categoryId ? await supabaseClient.from("digital_library_categories").update(legacy).eq("id", categoryId) : await supabaseClient.from("digital_library_categories").insert(legacy);
      if (!result.error) toast.warning("Kategori tersimpan dalam format lama. Jalankan migrasi perpustakaan untuk mengaktifkan unit dan urutan.");
    }
    setSaving(false);
    if (result.error) return toast.error(result.error.message || "Kategori belum dapat disimpan.");
    toast.success(categoryId ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
    navigate("/digital-library/categories");
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat kategori...</div>;
  const inputClass = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";
  return <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6"><div className="flex items-start gap-3"><button onClick={() => navigate(-1)} title="Kembali" className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button><PageHeader title={categoryId ? "Ubah Kategori" : "Tambah Kategori"} description="Kelompokkan koleksi agar mudah ditemukan sesuai program dan kebutuhan pembaca." /></div><form onSubmit={submit} className="rounded-lg border bg-card p-5 md:p-6"><h2 className="flex items-center gap-2 font-bold"><FolderTree className="h-5 w-5 text-primary" />Informasi kategori</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Nama kategori *<input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Adab & Akhlak" className={inputClass} /></label><label className="text-sm font-medium">Kode singkat<input maxLength={20} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ADAB" className={inputClass} /></label><label className="text-sm font-medium">Urutan tampilan<input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Unit sekolah<select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className={inputClass}><option value="">Lintas unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Deskripsi<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label><label className="flex items-start gap-3 rounded-md border p-4 text-sm sm:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="mt-0.5 h-4 w-4" /><span><strong className="block">Kategori aktif</strong><span className="text-xs text-muted-foreground">Kategori tersedia pada filter portal dan formulir koleksi.</span></span></label></div><div className="mt-6 flex justify-end gap-2 border-t pt-5"><button type="button" onClick={() => navigate(-1)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button disabled={saving} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Kategori</button></div></form></div>;
};
