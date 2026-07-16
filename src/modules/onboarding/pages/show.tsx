/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useShow } from "@refinedev/core";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, Edit3, FileCheck2, Loader2, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { labelFor, materialAudience, onboardingAudiences, onboardingCategories, onboardingMaterialTypes, type OnboardingMaterial } from "../onboarding-config";
import { OnboardingViewer } from "../onboarding-viewer";

export const OnboardingShow: React.FC = () => {
  const { queryResult } = useShow<OnboardingMaterial>({ resource: "onboarding_materials" });
  const record = queryResult.data?.data;
  const [unitName, setUnitName] = useState("");
  const [progress, setProgress] = useState({ opened: 0, completed: 0, acknowledged: 0 });

  useEffect(() => {
    if (!record) return;
    const load = async () => {
      const [unitResult, progressResult] = await Promise.all([
        record.unit_id ? supabaseClient.from("units").select("name").eq("id", record.unit_id).maybeSingle() : Promise.resolve({ data: null }),
        supabaseClient.from("onboarding_progress").select("progress_percent,acknowledged_at").eq("material_id", record.id),
      ]);
      setUnitName((unitResult.data as any)?.name || "");
      if (!progressResult.error) setProgress({ opened: progressResult.data?.length || 0, completed: (progressResult.data || []).filter((item: any) => Number(item.progress_percent) >= 100).length, acknowledged: (progressResult.data || []).filter((item: any) => item.acknowledged_at).length });
    };
    void load();
  }, [record]);

  if (queryResult.isLoading) return <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat materi...</div>;
  if (!record) return <div className="rounded-md border border-dashed p-12 text-center"><p className="font-bold">Materi tidak ditemukan</p><Link to="/onboarding" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Kembali ke daftar</Link></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Detail & Pratinjau Materi" description="Tinjau isi, cakupan publikasi, serta penyelesaian pengguna sebelum atau selama materi ditayangkan." action={<div className="flex gap-2"><Link to="/onboarding" className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Kembali</Link><Link to={`/onboarding/edit/${record.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"><Edit3 className="h-4 w-4" />Ubah</Link></div>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Status" value={record.status === "published" ? "Dipublikasikan" : "Draf"} detail={`Versi ${record.version_label || "1.0"}`} />
        <Metric label="Cakupan" value={unitName || "Lintas unit"} detail={materialAudience(record).map((item) => labelFor(onboardingAudiences, item)).join(", ")} />
        <Metric label="Estimasi" value={`${record.estimated_minutes || 5} menit`} detail={record.is_required ? "Materi wajib" : "Materi pendukung"} />
        <Metric label="Penyelesaian" value={`${progress.completed}/${progress.opened}`} detail={`${progress.acknowledged} persetujuan`} />
      </section>
      <section className="overflow-hidden rounded-md border bg-card">
        <div className="border-b p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{labelFor(onboardingCategories, record.category || "general")}</span><span className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">{labelFor(onboardingMaterialTypes, record.material_type)}</span>{record.is_required ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Wajib</span> : null}</div><h2 className="mt-3 text-xl font-bold">{record.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{record.description || "Tidak ada deskripsi tambahan."}</p></div><div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />Urutan {record.order_index || 0}</div></div>{record.acknowledgement_required ? <div className="mt-4 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Persetujuan diwajibkan</p><p className="mt-1">{record.acknowledgement_text}</p></div></div> : null}</div>
        <OnboardingViewer material={record} />
      </section>
      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border bg-card p-4"><Users className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-bold">{progress.opened}</p><p className="text-xs text-muted-foreground">Pengguna membuka</p></div><div className="rounded-md border bg-card p-4"><FileCheck2 className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-bold">{progress.completed}</p><p className="text-xs text-muted-foreground">Materi selesai</p></div><div className="rounded-md border bg-card p-4"><ShieldCheck className="h-5 w-5 text-violet-600" /><p className="mt-3 text-2xl font-bold">{progress.acknowledged}</p><p className="text-xs text-muted-foreground">Persetujuan versi tercatat</p></div></section>
    </div>
  );
};

const Metric = ({ label, value, detail }: { label: string; value: string; detail: string }) => <div className="rounded-md border bg-card p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-2 truncate text-lg font-bold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></div>;
