import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, ClipboardCheck, Clock3, Package, ShoppingCart, Truck, Wrench } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SarprasSectionNav } from "../components/SarprasSectionNav";

type Row = Record<string, unknown>;
const dashboardReferenceTime = Date.now();

const badge = (value: string) => {
  if (["urgent", "Rusak Berat", "Menunggu"].includes(value)) return "bg-red-50 text-red-700";
  if (["high", "Rusak Ringan", "in_progress", "scheduled"].includes(value)) return "bg-amber-50 text-amber-700";
  return "bg-muted text-muted-foreground";
};

export const SarprasDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const filters = activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [];
  const common = { filters, pagination: { mode: "off" as const } };
  const { data: assetsData, isLoading: assetsLoading } = useList<Row>({ resource: "assets", ...common });
  const { data: loansData } = useList<Row>({ resource: "asset_loans", ...common, sorters: [{ field: "end_date", order: "asc" }] });
  const { data: procurementData } = useList<Row>({ resource: "procurements", ...common, sorters: [{ field: "created_at", order: "desc" }] });
  const { data: maintenanceData, isError: maintenanceUnavailable } = useList<Row>({ resource: "asset_maintenance_requests", ...common, sorters: [{ field: "created_at", order: "desc" }] });
  const { data: stocktakeData } = useList<Row>({ resource: "asset_stocktakes", ...common, sorters: [{ field: "created_at", order: "desc" }] });
  const { data: roomsData } = useList<Row>({ resource: "rooms", ...common });

  const assets = assetsData?.data || [];
  const loans = loansData?.data || [];
  const procurements = procurementData?.data || [];
  const maintenance = maintenanceData?.data || [];
  const stocktakes = stocktakeData?.data || [];
  const damaged = assets.filter((item) => item.condition !== "Baik" && item.status !== "Dihapus");
  const openLoans = loans.filter((item) => ["Menunggu", "Disetujui"].includes(String(item.status)));
  const overdue = openLoans.filter((item) => item.status === "Disetujui" && new Date(String(item.end_date)).getTime() < dashboardReferenceTime);
  const openMaintenance = maintenance.filter((item) => !["completed", "rejected"].includes(String(item.status)));
  const urgentMaintenance = openMaintenance.filter((item) => ["urgent", "high"].includes(String(item.priority)));
  const pendingProcurements = procurements.filter((item) => !["Diterima", "Selesai", "Ditolak"].includes(String(item.status)));
  const hasActiveStocktake = stocktakes.some((item) => ["draft", "in_progress"].includes(String(item.status)));

  const priorities = useMemo(() => [
    ...urgentMaintenance.map((item) => ({ id: String(item.id), title: String(item.title), meta: `${item.ticket_number || "Tiket"} - ${item.location || "Lokasi belum diisi"}`, value: String(item.priority), href: "/sarpras/maintenance" })),
    ...overdue.map((item) => ({ id: String(item.id), title: `Peminjaman melewati batas waktu`, meta: `Jatuh tempo ${new Date(String(item.end_date)).toLocaleDateString("id-ID")}`, value: "Terlambat", href: "/sarpras/asset-loans" })),
    ...pendingProcurements.filter((item) => item.priority === "urgent").map((item) => ({ id: String(item.id), title: String(item.item_name), meta: `Pengadaan mendesak - ${item.quantity || 1} unit`, value: "urgent", href: "/sarpras/procurements" })),
  ].slice(0, 6), [overdue, pendingProcurements, urgentMaintenance]);

  const metrics = [
    { label: "Aset tercatat", value: assets.length, detail: `${damaged.length} perlu perhatian`, icon: Package, tone: "bg-blue-50 text-blue-700", href: "/sarpras/assets" },
    { label: "Pemeliharaan terbuka", value: openMaintenance.length, detail: `${urgentMaintenance.length} prioritas tinggi`, icon: Wrench, tone: "bg-amber-50 text-amber-700", href: "/sarpras/maintenance" },
    { label: "Pinjaman aktif", value: openLoans.length, detail: `${overdue.length} terlambat`, icon: Truck, tone: "bg-cyan-50 text-cyan-700", href: "/sarpras/asset-loans" },
    { label: "Pengadaan berjalan", value: pendingProcurements.length, detail: "dari usulan sampai diterima", icon: ShoppingCart, tone: "bg-emerald-50 text-emerald-700", href: "/sarpras/procurements" },
  ];

  return <div className="space-y-6">
    <PageHeader title="Pusat Kendali Sarpras" description="Pantau kelayakan fasilitas, tindak lanjut kerusakan, peminjaman, pengadaan, dan akurasi inventaris per unit." />
    <SarprasSectionNav />
    {maintenanceUnavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Pembaruan basis data Sarpras belum diterapkan.</strong> Terapkan migrasi terbaru agar pemeliharaan dan stok opname dapat digunakan.</div>}

    <section aria-label="Indikator utama Sarpras" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => <Link key={item.label} to={item.href} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
        <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div>
        <div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-bold">{assetsLoading ? "-" : item.value}</p><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
      </Link>)}
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">Prioritas Hari Ini</h2><p className="text-xs text-muted-foreground">Kerusakan mendesak, keterlambatan, dan kebutuhan kritis.</p></div><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
        {priorities.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><CheckCircle2 className="mb-3 h-9 w-9 text-emerald-500" /><p className="font-semibold">Tidak ada antrean kritis.</p><p className="mt-1 text-sm text-muted-foreground">Operasional Sarpras dalam kondisi terkendali.</p></div> : <div className="divide-y">{priorities.map((item) => <Link key={`${item.href}-${item.id}`} to={item.href} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30"><div className="min-w-0"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.meta}</p></div><span className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${badge(item.value)}`}>{item.value === "urgent" ? "Darurat" : item.value}</span></Link>)}</div>}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-bold">Kontrol Mutu Inventaris</h2><p className="mt-1 text-xs text-muted-foreground">Kelengkapan yang perlu dijaga pada unit aktif.</p>
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" />Ruangan aktif</span><strong>{roomsData?.data?.filter((item) => item.status === "Aktif").length || 0}</strong></div>
          <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><ClipboardCheck className="h-4 w-4 text-muted-foreground" />Stok opname berjalan</span><strong>{hasActiveStocktake ? "Ada" : "Belum"}</strong></div>
          <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-muted-foreground" />Aset belum diperiksa</span><strong>{assets.filter((item) => !item.last_stocktake_at).length}</strong></div>
        </div>
        <Link to="/sarpras/stocktakes" className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold hover:bg-muted"><ClipboardCheck className="h-4 w-4" />Buka Stok Opname</Link>
      </section>
    </div>
  </div>;
};
