/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useDelete, useList, useUpdate } from "@refinedev/core";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { isMissingSupabaseRelation } from "../../../lib/supabase/schema-errors";
import {
  isPublishedNow,
  labelFor,
  materialAudience,
  onboardingAudiences,
  onboardingCategories,
  onboardingMaterialTypes,
  type OnboardingMaterial,
} from "../onboarding-config";

const PAGE_SIZE = 15;

export const OnboardingList: React.FC = () => {
  const { mutateAsync: updateMaterial } = useUpdate();
  const { mutateAsync: deleteMaterial } = useDelete();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [progressByMaterial, setProgressByMaterial] = useState<Record<string, { opened: number; completed: number; acknowledged: number }>>({});

  const materialsQuery = useList<OnboardingMaterial>({
    resource: "onboarding_materials",
    pagination: { mode: "off" },
    sorters: [{ field: "order_index", order: "asc" }, { field: "updated_at", order: "desc" }],
  });
  const unitsQuery = useList<{ id: string; name: string }>({ resource: "units", pagination: { mode: "off" } });
  const unitMap = useMemo(() => new Map((unitsQuery.data?.data || []).map((unit) => [unit.id, unit.name])), [unitsQuery.data?.data]);

  useEffect(() => {
    const loadProgress = async () => {
      const { data, error } = await supabaseClient.from("onboarding_progress").select("material_id,progress_percent,acknowledged_at");
      if (error) {
        if (!isMissingSupabaseRelation(error, "onboarding_progress")) console.error("Onboarding progress error", error);
        return;
      }
      const next: typeof progressByMaterial = {};
      (data || []).forEach((row: any) => {
        const current = next[row.material_id] || { opened: 0, completed: 0, acknowledged: 0 };
        current.opened += 1;
        if (Number(row.progress_percent) >= 100) current.completed += 1;
        if (row.acknowledged_at) current.acknowledged += 1;
        next[row.material_id] = current;
      });
      setProgressByMaterial(next);
    };
    void loadProgress();
  }, []);

  const materials = useMemo(() => materialsQuery.data?.data || [], [materialsQuery.data?.data]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (status !== "all" && material.status !== status) return false;
      if (audience !== "all" && !materialAudience(material).includes(audience) && !materialAudience(material).includes("all")) return false;
      if (category !== "all" && (material.category || "general") !== category) return false;
      if (!keyword) return true;
      return [material.title, material.description, labelFor(onboardingCategories, material.category), unitMap.get(material.unit_id || "")]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [audience, category, materials, search, status, unitMap]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const metrics = {
    total: materials.length,
    live: materials.filter((item) => isPublishedNow(item)).length,
    required: materials.filter((item) => item.is_required).length,
    acknowledgements: Object.values(progressByMaterial).reduce((sum, item) => sum + item.acknowledged, 0),
  };

  const publish = async (material: OnboardingMaterial) => {
    await updateMaterial({ resource: "onboarding_materials", id: material.id, values: { status: material.status === "published" ? "draft" : "published" } });
    toast.success(material.status === "published" ? "Materi dikembalikan menjadi draf." : "Materi dipublikasikan.");
    await materialsQuery.refetch();
  };

  const remove = async (material: OnboardingMaterial) => {
    if (!window.confirm(`Hapus materi "${material.title}"? Progres pengguna ikut terhapus dan tindakan ini tidak dapat dibatalkan.`)) return;
    await deleteMaterial({ resource: "onboarding_materials", id: material.id });
    toast.success("Materi onboarding dihapus.");
    await materialsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pusat Panduan & Onboarding" description="Kelola orientasi, SOP, kebijakan wajib, dan panduan portal untuk keluarga, pengajar, serta staf per unit." action={<Link to="/onboarding/create" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><FilePlus2 className="h-4 w-4" />Tambah Materi</Link>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total materi", value: metrics.total, icon: FileText, tone: "bg-blue-50 text-blue-700" },
          { label: "Sedang tayang", value: metrics.live, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Materi wajib", value: metrics.required, icon: ShieldCheck, tone: "bg-amber-50 text-amber-700" },
          { label: "Persetujuan tercatat", value: metrics.acknowledgements, icon: FileCheck2, tone: "bg-violet-50 text-violet-700" },
        ].map((item) => <div key={item.label} className="rounded-md border bg-card p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="mt-3 text-2xl font-bold">{materialsQuery.isLoading ? "..." : item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}
      </section>

      <section className="rounded-md border bg-card">
        <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,auto))]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari judul, unit, atau kategori..." className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm" />{search ? <button type="button" onClick={() => { setSearch(""); setPage(1); }} title="Hapus pencarian" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md hover:bg-muted"><X className="h-4 w-4" /></button> : null}</label>
          <FilterSelect label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "all", label: "Semua status" }, { value: "published", label: "Dipublikasikan" }, { value: "draft", label: "Draf" }]} />
          <FilterSelect label="Audiens" value={audience} onChange={(value) => { setAudience(value); setPage(1); }} options={[{ value: "all", label: "Semua portal" }, ...onboardingAudiences.filter((item) => item.value !== "all")]} />
          <FilterSelect label="Kategori" value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[{ value: "all", label: "Semua kategori" }, ...onboardingCategories]} />
        </div>

        {materialsQuery.isLoading ? <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat materi...</div> : materialsQuery.isError ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><AlertTriangle className="h-9 w-9 text-red-500" /><p className="mt-3 font-bold">Materi tidak dapat dimuat</p><p className="mt-1 text-sm text-muted-foreground">Periksa migrasi database dan hak akses pengelola onboarding.</p></div> : rows.length === 0 ? <div className="min-h-64 p-12 text-center"><Filter className="mx-auto h-9 w-9 text-muted-foreground/40" /><p className="mt-3 font-bold">Tidak ada materi sesuai filter</p><button type="button" onClick={() => { setSearch(""); setStatus("all"); setAudience("all"); setCategory("all"); }} className="mt-3 text-sm font-semibold text-primary hover:underline">Reset filter</button></div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Materi</th><th className="px-4 py-3">Cakupan</th><th className="px-4 py-3">Publikasi</th><th className="px-4 py-3">Monitoring</th><th className="px-4 py-3">Tindakan</th></tr></thead><tbody className="divide-y">{rows.map((material) => <MaterialRow key={material.id} material={material} unitName={unitMap.get(material.unit_id || "")} progress={progressByMaterial[material.id]} onPublish={() => void publish(material)} onDelete={() => void remove(material)} />)}</tbody></table></div>
          <div className="divide-y md:hidden">{rows.map((material) => <MaterialCard key={material.id} material={material} unitName={unitMap.get(material.unit_id || "")} progress={progressByMaterial[material.id]} onPublish={() => void publish(material)} onDelete={() => void remove(material)} />)}</div>
        </>}
        <div className="flex flex-col gap-3 border-t p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-muted-foreground">Menampilkan {rows.length} dari {filtered.length} materi</p><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} title="Halaman sebelumnya" className="flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-24 text-center text-xs font-bold">Halaman {page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} title="Halaman berikutnya" className="flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>
    </div>
  );
};

const MaterialRow = ({ material, unitName, progress, onPublish, onDelete }: any) => <tr className="hover:bg-muted/20"><td className="max-w-sm px-4 py-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div><div><p className="font-bold">{material.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{material.description || "Tanpa deskripsi"}</p><div className="mt-2 flex gap-1.5"><Badge>{labelFor(onboardingMaterialTypes, material.material_type)}</Badge>{material.is_required ? <Badge tone="amber">Wajib</Badge> : null}</div></div></div></td><td className="px-4 py-4"><p className="font-semibold">{unitName || "Lintas unit"}</p><p className="mt-1 text-xs text-muted-foreground">{materialAudience(material).map((item) => labelFor(onboardingAudiences, item)).join(", ")}</p><p className="mt-1 text-xs text-muted-foreground">{labelFor(onboardingCategories, material.category || "general")}</p></td><td className="px-4 py-4"><button type="button" onClick={onPublish} className={`rounded-md px-2.5 py-1 text-xs font-bold ${material.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{material.status === "published" ? "Tayang" : "Draf"}</button><p className="mt-2 text-xs text-muted-foreground">Urutan {material.order_index || 0} | v{material.version_label || "1.0"}</p></td><td className="px-4 py-4"><p className="font-semibold">{progress?.opened || 0} membuka</p><p className="mt-1 text-xs text-muted-foreground">{progress?.completed || 0} selesai | {progress?.acknowledged || 0} setuju</p></td><td className="px-4 py-4"><ActionButtons material={material} onDelete={onDelete} /></td></tr>;
const MaterialCard = ({ material, unitName, progress, onPublish, onDelete }: any) => <article className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{material.title}</p><p className="mt-1 text-xs text-muted-foreground">{unitName || "Lintas unit"} | {labelFor(onboardingCategories, material.category || "general")}</p></div><button type="button" onClick={onPublish} className={`rounded-md px-2 py-1 text-xs font-bold ${material.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100"}`}>{material.status === "published" ? "Tayang" : "Draf"}</button></div><div className="mt-3 flex flex-wrap gap-1.5"><Badge>{labelFor(onboardingMaterialTypes, material.material_type)}</Badge>{material.is_required ? <Badge tone="amber">Wajib</Badge> : null}{materialAudience(material).map((item: string) => <Badge key={item}>{labelFor(onboardingAudiences, item)}</Badge>)}</div><div className="mt-4 flex items-center justify-between border-t pt-3"><p className="text-xs text-muted-foreground"><Users className="mr-1 inline h-3.5 w-3.5" />{progress?.completed || 0}/{progress?.opened || 0} selesai</p><ActionButtons material={material} onDelete={onDelete} /></div></article>;
const ActionButtons = ({ material, onDelete }: { material: OnboardingMaterial; onDelete: () => void }) => <div className="flex items-center gap-1"><Link to={`/onboarding/show/${material.id}`} title="Pratinjau dan detail" className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"><Eye className="h-4 w-4" /></Link><Link to={`/onboarding/edit/${material.id}`} title="Ubah materi" className="flex h-9 w-9 items-center justify-center rounded-md border text-blue-700 hover:bg-blue-50"><Edit3 className="h-4 w-4" /></Link><button type="button" onClick={onDelete} title="Hapus materi" className="flex h-9 w-9 items-center justify-center rounded-md border text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>;
const Badge = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "amber" }) => <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}>{children}</span>;
const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) => <label className="relative"><span className="sr-only">{label}</span><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border bg-background pl-9 pr-8 text-sm font-semibold">{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
