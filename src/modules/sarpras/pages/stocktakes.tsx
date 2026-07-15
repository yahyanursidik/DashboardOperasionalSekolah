/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { CheckCircle2, ClipboardCheck, Loader2, MapPin, PackageCheck, Play, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { SarprasSectionNav } from "../components/SarprasSectionNav";

const findings = [
  { value: "unchecked", label: "Belum diperiksa" }, { value: "found", label: "Sesuai" },
  { value: "moved", label: "Pindah lokasi" }, { value: "damaged", label: "Rusak" }, { value: "missing", label: "Tidak ditemukan" },
];

export const StocktakesList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { data: sessionsData, refetch: refetchSessions, isLoading } = useList({ resource: "asset_stocktakes", filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [], pagination: { mode: "off" }, sorters: [{ field: "created_at", order: "desc" }], meta: { select: "*,units(name)" } });
  const sessions = sessionsData?.data || [];
  const selected = sessions.find((item: any) => item.id === selectedId) || sessions[0];
  const { data: itemsData, refetch: refetchItems, isLoading: itemsLoading } = useList({ resource: "asset_stocktake_items", filters: selected?.id ? [{ field: "stocktake_id", operator: "eq", value: selected.id }] : [], pagination: { mode: "off" }, sorters: [{ field: "created_at", order: "asc" }], meta: { select: "*,assets(name,code,category,location,condition,status)" }, queryOptions: { enabled: Boolean(selected?.id) } });
  const items = (itemsData?.data || []).filter((item: any) => !search || [item.assets?.name, item.assets?.code, item.expected_location].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));
  const { mutateAsync: updateItem } = useUpdate();
  const summary = useMemo(() => ({ total: itemsData?.data?.length || 0, checked: (itemsData?.data || []).filter((item: any) => item.finding !== "unchecked").length, exceptions: (itemsData?.data || []).filter((item: any) => ["moved", "damaged", "missing"].includes(item.finding)).length }), [itemsData?.data]);

  const start = async () => {
    if (!title.trim()) return toast.error("Nama kegiatan stok opname wajib diisi.");
    setIsStarting(true);
    const { data, error } = await supabaseClient.rpc("start_asset_stocktake", { target_unit_id: activeUnitId || null, target_title: title.trim(), target_location: location.trim() || null });
    setIsStarting(false);
    if (error) return toast.error("Stok opname gagal dimulai", { description: error.message });
    toast.success("Stok opname dimulai dan daftar aset sudah disiapkan."); setTitle(""); setLocation(""); setSelectedId(String(data)); await refetchSessions();
  };

  const mark = async (item: any, finding: string) => {
    try {
      await updateItem({ resource: "asset_stocktake_items", id: item.id, values: { finding, actual_location: finding === "moved" ? (item.actual_location || item.expected_location) : item.expected_location, actual_condition: finding === "damaged" ? "Rusak Ringan" : item.expected_condition, checked_at: new Date().toISOString() } });
      await refetchItems();
    } catch (error) { toast.error("Hasil pemeriksaan gagal disimpan", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
  };

  const updateDetail = async (item: any, values: Record<string, unknown>) => {
    await updateItem({ resource: "asset_stocktake_items", id: item.id, values }); await refetchItems();
  };

  const complete = async () => {
    if (!selected) return;
    if (summary.checked < summary.total) return toast.error(`${summary.total - summary.checked} aset belum diperiksa.`);
    setIsCompleting(true);
    const { error } = await supabaseClient.rpc("complete_asset_stocktake", { target_stocktake_id: selected.id });
    setIsCompleting(false);
    if (error) return toast.error("Stok opname belum dapat diselesaikan", { description: error.message });
    toast.success("Stok opname selesai dan data aset diperbarui."); await refetchSessions();
  };

  return <div className="space-y-6">
    <PageHeader title="Stok Opname Aset" description="Verifikasi keberadaan, lokasi, dan kondisi inventaris secara berkala sebagai bukti pengendalian aset sekolah." />
    <SarprasSectionNav />
    <section className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)_auto]"><label className="text-sm font-semibold">Nama kegiatan<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Stok Opname ${new Date().getFullYear()}`} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label><label className="text-sm font-semibold">Lingkup lokasi (opsional)<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Contoh: Gedung A" className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label><button onClick={() => void start()} disabled={isStarting} className="mt-auto flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Mulai Pemeriksaan</button></section>
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="self-start overflow-hidden rounded-lg border bg-card xl:sticky xl:top-20"><div className="border-b px-4 py-3"><h2 className="font-bold">Riwayat Kegiatan</h2><p className="text-xs text-muted-foreground">Pilih sesi untuk melihat hasil.</p></div>{isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : sessions.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Belum ada stok opname.</div> : <div className="divide-y">{sessions.map((session: any) => <button key={session.id} onClick={() => setSelectedId(session.id)} className={`w-full p-4 text-left hover:bg-muted/30 ${selected?.id === session.id ? "bg-primary/5" : ""}`}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{session.title}</p><p className="mt-1 text-xs text-muted-foreground">{session.stocktake_number}</p></div><span className={`rounded px-2 py-1 text-[10px] font-bold ${session.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{session.status === "completed" ? "SELESAI" : "BERJALAN"}</span></div></button>)}</div>}</aside>
      <section className="min-w-0 space-y-4">{!selected ? <div className="flex h-72 flex-col items-center justify-center rounded-lg border bg-card text-center"><ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/40" /><p className="font-semibold">Mulai kegiatan stok opname pertama.</p></div> : <><div className="grid gap-3 sm:grid-cols-3">{[{ label: "Total aset", value: summary.total, icon: PackageCheck, tone: "bg-blue-50 text-blue-700" }, { label: "Sudah diperiksa", value: summary.checked, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }, { label: "Temuan", value: summary.exceptions, icon: TriangleAlert, tone: "bg-amber-50 text-amber-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-4 w-4" /></div><p className="text-xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</div><div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{selected.title}</p><p className="text-xs text-muted-foreground">{selected.units?.name || "Lintas unit"} - {selected.scope_location || "Semua lokasi"}</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari aset" className="h-10 w-52 rounded-md border bg-background pl-9 pr-3 text-sm" /></label>{selected.status !== "completed" && <button onClick={() => void complete()} disabled={isCompleting} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Selesaikan</button>}</div></div><div className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Aset</th><th className="px-4 py-3">Lokasi tercatat</th><th className="px-4 py-3">Kondisi tercatat</th><th className="px-4 py-3">Hasil</th><th className="px-4 py-3">Koreksi temuan</th></tr></thead><tbody className="divide-y">{itemsLoading ? <tr><td colSpan={5} className="h-40 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : items.map((item: any) => <tr key={item.id}><td className="px-4 py-3"><p className="font-semibold">{item.assets?.name}</p><p className="text-xs text-muted-foreground">{item.assets?.code} - {item.assets?.category}</p></td><td className="px-4 py-3"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{item.expected_location || "Belum diatur"}</span></td><td className="px-4 py-3">{item.expected_condition}</td><td className="px-4 py-3"><select disabled={selected.status === "completed"} value={item.finding} onChange={(event) => void mark(item, event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">{findings.map((finding) => <option key={finding.value} value={finding.value}>{finding.label}</option>)}</select></td><td className="px-4 py-3">{item.finding === "moved" ? <input disabled={selected.status === "completed"} defaultValue={item.actual_location || ""} onBlur={(event) => void updateDetail(item, { actual_location: event.target.value })} placeholder="Lokasi aktual" className="h-9 w-full rounded-md border bg-background px-2" /> : item.finding === "damaged" ? <select disabled={selected.status === "completed"} value={item.actual_condition || "Rusak Ringan"} onChange={(event) => void updateDetail(item, { actual_condition: event.target.value })} className="h-9 rounded-md border bg-background px-2"><option>Rusak Ringan</option><option>Rusak Berat</option></select> : <span className="text-xs text-muted-foreground">{item.finding === "missing" ? "Perlu investigasi" : "-"}</span>}</td></tr>)}{!itemsLoading && items.length === 0 && <tr><td colSpan={5} className="h-40 text-center text-muted-foreground">Tidak ada aset dalam lingkup pemeriksaan ini.</td></tr>}</tbody></table></div></div></>}</section>
    </div>
  </div>;
};
