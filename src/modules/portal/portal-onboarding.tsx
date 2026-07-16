/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { isMissingSupabaseRelation } from "../../lib/supabase/schema-errors";
import {
  isPublishedNow,
  labelFor,
  materialAudience,
  onboardingCategories,
  onboardingMaterialTypes,
  type OnboardingMaterial,
} from "../onboarding/onboarding-config";
import { OnboardingViewer } from "../onboarding/onboarding-viewer";

type Audience = "parents" | "teachers" | "staff";
type Progress = { progress_percent: number; acknowledged_at?: string | null; acknowledgement_version?: string | null };

const portalCopy: Record<Audience, { title: string; description: string }> = {
  parents: { title: "Panduan Keluarga", description: "Panduan sekolah, pendampingan anak, layanan, dan kebijakan yang perlu dipahami keluarga." },
  teachers: { title: "Panduan Pengajar", description: "Orientasi pembelajaran, SOP, mutu layanan, perlindungan siswa, dan kebijakan kerja pengajar." },
  staff: { title: "Panduan Staf", description: "SOP operasional, keselamatan, layanan sekolah, dan kebijakan kerja sesuai tugas staf." },
};

const localProgressKey = (audience: Audience) => `onboarding_progress_${audience}`;

const readLocalProgress = (audience: Audience) => {
  try { return JSON.parse(localStorage.getItem(localProgressKey(audience)) || "{}"); } catch { return {}; }
};

export const OnboardingPortalLibrary: React.FC<{ audience: Audience; unitId?: string | null }> = ({ audience, unitId }) => {
  const [materials, setMaterials] = useState<OnboardingMaterial[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [selected, setSelected] = useState<OnboardingMaterial | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"all" | "required" | "incomplete">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [materialResult, progressResult] = await Promise.all([
        supabaseClient.from("onboarding_materials").select("*").eq("status", "published").order("order_index").order("created_at", { ascending: false }),
        supabaseClient.from("onboarding_progress").select("material_id,progress_percent,acknowledged_at,acknowledgement_version"),
      ]);
      if (materialResult.error) toast.error(`Panduan tidak dapat dimuat: ${materialResult.error.message}`);
      const scoped = ((materialResult.data || []) as unknown as OnboardingMaterial[]).filter((item: any) => {
        const material = item as OnboardingMaterial;
        const audiences = materialAudience(material);
        const audienceMatch = audiences.includes("all") || audiences.includes(audience) || (item.audience === undefined && audience === "parents");
        const unitMatch = !material.unit_id || Boolean(unitId && material.unit_id === unitId);
        return audienceMatch && unitMatch && isPublishedNow(material);
      });
      setMaterials(scoped);
      if (progressResult.error) {
        if (!isMissingSupabaseRelation(progressResult.error, "onboarding_progress")) console.error("Onboarding progress error", progressResult.error);
        setProgress(readLocalProgress(audience));
      } else {
        setProgress(Object.fromEntries((progressResult.data || []).map((item: any) => [item.material_id, item])));
      }
      setIsLoading(false);
    };
    void load();
  }, [audience, unitId]);

  const categories = useMemo(() => Array.from(new Set(materials.map((item) => item.category || "general"))), [materials]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (category !== "all" && (material.category || "general") !== category) return false;
      if (view === "required" && !material.is_required) return false;
      if (view === "incomplete" && Number(progress[material.id]?.progress_percent || 0) >= 100) return false;
      if (!keyword) return true;
      return [material.title, material.description, labelFor(onboardingCategories, material.category || "general")].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [category, materials, progress, search, view]);
  const requiredCount = materials.filter((item) => item.is_required).length;
  const completedCount = materials.filter((item) => Number(progress[item.id]?.progress_percent || 0) >= 100).length;

  const saveProgress = async (material: OnboardingMaterial, complete: boolean) => {
    setIsSaving(true);
    const { data: authData } = await supabaseClient.auth.getUser();
    const previous = progress[material.id];
    const next: Progress = {
      progress_percent: complete ? 100 : Math.max(Number(previous?.progress_percent || 0), 25),
      acknowledged_at: complete && material.acknowledgement_required ? new Date().toISOString() : previous?.acknowledged_at || null,
      acknowledgement_version: complete && material.acknowledgement_required ? material.version_label || "1.0" : previous?.acknowledgement_version || null,
    };
    if (authData.user) {
      const progressPayload: Record<string, unknown> = {
        material_id: material.id, user_id: authData.user.id, progress_percent: next.progress_percent,
        last_opened_at: new Date().toISOString(),
      };
      if (complete) {
        progressPayload.completed_at = new Date().toISOString();
        progressPayload.acknowledged_at = next.acknowledged_at;
        progressPayload.acknowledgement_version = next.acknowledgement_version;
      }
      const { error } = await supabaseClient.from("onboarding_progress").upsert(progressPayload, { onConflict: "material_id,user_id" });
      if (error && !isMissingSupabaseRelation(error, "onboarding_progress")) {
        setIsSaving(false);
        return toast.error(`Progres tidak dapat disimpan: ${error.message}`);
      }
    }
    setProgress((current) => {
      const updated = { ...current, [material.id]: next };
      localStorage.setItem(localProgressKey(audience), JSON.stringify(updated));
      return updated;
    });
    setIsSaving(false);
    if (complete) toast.success(material.acknowledgement_required ? "Persetujuan dan versi materi berhasil dicatat." : "Materi ditandai selesai.");
  };

  const openMaterial = (material: OnboardingMaterial) => {
    setSelected(material);
    void saveProgress(material, false);
  };

  if (isLoading) return <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat panduan sekolah...</div>;

  const copy = portalCopy[audience];
  return (
    <div className="space-y-6 p-4 md:p-0">
      <section className="border-y bg-white py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-emerald-700">Pusat belajar sekolah</p><h1 className="mt-1 text-2xl font-bold text-gray-950">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{copy.description}</p></div><div className="grid grid-cols-3 gap-2"><Summary value={materials.length} label="Materi" /><Summary value={requiredCount} label="Wajib" /><Summary value={completedCount} label="Selesai" /></div></div>
      </section>

      <section className="grid gap-3 rounded-md border bg-white p-4 lg:grid-cols-[minmax(240px,1fr)_auto_auto]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari panduan atau kebijakan..." className="h-10 w-full rounded-md border bg-gray-50 pl-9 pr-9 text-sm" />{search ? <button type="button" onClick={() => setSearch("")} title="Hapus pencarian" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md hover:bg-gray-100"><X className="h-4 w-4" /></button> : null}</label>
        <div className="flex overflow-x-auto rounded-md border p-1">{(["all", "required", "incomplete"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`min-h-8 whitespace-nowrap rounded px-3 text-xs font-bold ${view === item ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{item === "all" ? "Semua" : item === "required" ? "Wajib" : "Belum selesai"}</button>)}</div>
        <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border bg-white pl-9 pr-8 text-sm font-semibold"><option value="all">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{labelFor(onboardingCategories, item)}</option>)}</select></label>
      </section>

      {filtered.length === 0 ? <section className="rounded-md border border-dashed bg-white p-12 text-center"><BookOpenCheck className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-3 font-bold text-gray-900">Belum ada materi sesuai pilihan</h2><p className="mt-1 text-sm text-gray-500">Materi mungkin sedang disiapkan atau seluruh materi telah Anda selesaikan.</p></section> : <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((material) => { const current = progress[material.id]; const done = Number(current?.progress_percent || 0) >= 100; return <button key={material.id} type="button" onClick={() => openMaterial(material)} className="flex min-h-48 flex-col rounded-md border bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><FileText className="h-5 w-5" /></div><div className="flex gap-1.5">{material.is_required ? <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">WAJIB</span> : null}<span className={`rounded-md px-2 py-1 text-[10px] font-bold ${done ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{done ? "SELESAI" : `${current?.progress_percent || 0}%`}</span></div></div><p className="mt-4 text-xs font-bold text-emerald-700">{labelFor(onboardingCategories, material.category || "general")}</p><h2 className="mt-1 line-clamp-2 text-base font-bold text-gray-950">{material.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">{material.description || "Buka untuk mempelajari materi."}</p><div className="mt-auto flex items-center justify-between border-t pt-4 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{material.estimated_minutes || 5} menit</span><span className="font-semibold">{labelFor(onboardingMaterialTypes, material.material_type)}</span></div></button>; })}</section>}

      {selected ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="onboarding-viewer-title" onClick={(event) => event.stopPropagation()} className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:rounded-lg"><header className="flex items-start justify-between gap-4 border-b p-4 sm:p-5"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{labelFor(onboardingCategories, selected.category || "general")}</span>{selected.is_required ? <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Materi wajib</span> : null}</div><h2 id="onboarding-viewer-title" className="mt-2 text-lg font-bold text-gray-950">{selected.title}</h2><p className="mt-1 line-clamp-2 text-xs text-gray-500">{selected.description}</p></div><button type="button" onClick={() => setSelected(null)} title="Tutup materi" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600"><X className="h-5 w-5" /></button></header><div className="flex-1 overflow-y-auto"><OnboardingViewer material={selected} /></div><footer className="border-t bg-white p-4 sm:p-5">{selected.acknowledgement_required ? <div className="mb-3 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>{selected.acknowledgement_text || "Saya telah membaca dan memahami materi ini."}</p></div> : null}<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-gray-500">Versi {selected.version_label || "1.0"}. Persetujuan hanya berlaku untuk versi ini.</p><button type="button" disabled={isSaving || Number(progress[selected.id]?.progress_percent || 0) >= 100} onClick={() => void saveProgress(selected, true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-200 disabled:text-gray-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{Number(progress[selected.id]?.progress_percent || 0) >= 100 ? "Sudah selesai" : selected.acknowledgement_required ? "Saya Memahami & Menyetujui" : "Tandai Selesai"}</button></div></footer></section></div> : null}
    </div>
  );
};

const Summary = ({ value, label }: { value: number; label: string }) => <div className="min-w-20 rounded-md border bg-gray-50 px-3 py-2 text-center"><p className="text-xl font-bold text-gray-950">{value}</p><p className="text-[10px] font-bold uppercase text-gray-500">{label}</p></div>;

export const PortalOnboarding: React.FC = () => {
  const { student } = useOutletContext<any>();
  return <OnboardingPortalLibrary audience="parents" unitId={student?.unit_id || student?.classes?.unit_id || student?.classes?.units?.id} />;
};

export const TeacherOnboarding: React.FC = () => {
  const { employee } = useOutletContext<any>();
  return <OnboardingPortalLibrary audience="teachers" unitId={employee?.unit_id} />;
};

export const StaffOnboarding: React.FC = () => {
  const { employee } = useOutletContext<any>();
  return <OnboardingPortalLibrary audience="staff" unitId={employee?.unit_id} />;
};
