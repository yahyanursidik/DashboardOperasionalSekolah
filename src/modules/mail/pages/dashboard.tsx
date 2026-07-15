import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, ArrowRight, CheckCircle2, Clock3, FileCheck2, Inbox, Send, Workflow } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { OfficeSectionNav } from "../components/OfficeSectionNav";

type Row = Record<string, unknown>;
const referenceTime = Date.now();

export const MailDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const unitFilters = activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : [];
  const common = { filters: unitFilters, pagination: { mode: "off" as const } };
  const { data: mailData, isLoading } = useList<Row>({ resource: "mail_records", ...common, sorters: [{ field: "created_at", order: "desc" }] });
  const { data: dispositionData } = useList<Row>({ resource: "mail_dispositions", pagination: { mode: "off" }, sorters: [{ field: "created_at", order: "desc" }] });
  const { data: documentData, isError: governanceUnavailable } = useList<Row>({ resource: "documents", ...common, sorters: [{ field: "created_at", order: "desc" }] });
  const mails = mailData?.data || [];
  const dispositions = dispositionData?.data || [];
  const documents = documentData?.data || [];
  const incoming = mails.filter((item) => item.type === "incoming");
  const outgoing = mails.filter((item) => item.type === "outgoing");
  const openDispositions = dispositions.filter((item) => !["completed", "returned"].includes(String(item.status)));
  const overdue = openDispositions.filter((item) => item.due_date && new Date(String(item.due_date)).getTime() < referenceTime);
  const waitingVerification = documents.filter((item) => item.status === "menunggu_verifikasi");
  const expiring = documents.filter((item) => item.expiry_date && new Date(String(item.expiry_date)).getTime() <= referenceTime + 60 * 86400000 && item.archive_status !== "destroyed");
  const responseDue = mails.filter((item) => item.response_required && item.due_date && !["completed", "archived", "sent"].includes(String(item.status)));

  const priorities = useMemo(() => [
    ...overdue.map((item) => ({ id: String(item.id), title: "Disposisi melewati tenggat", meta: String(item.instruction || "Tindak lanjut surat"), tone: "Terlambat", href: "/mail/dispositions" })),
    ...responseDue.map((item) => ({ id: String(item.id), title: String(item.title), meta: `Respons diperlukan sebelum ${new Date(String(item.due_date)).toLocaleDateString("id-ID")}`, tone: String(item.priority) === "urgent" ? "Darurat" : "Tenggat", href: `/mail/show/${item.id}` })),
    ...expiring.map((item) => ({ id: String(item.id), title: String(item.file_name), meta: `Masa berlaku ${new Date(String(item.expiry_date)).toLocaleDateString("id-ID")}`, tone: "Kedaluwarsa", href: `/documents/show/${item.id}` })),
  ].slice(0, 7), [expiring, overdue, responseDue]);

  const metrics = [
    { label: "Surat masuk", value: incoming.length, detail: `${responseDue.length} memerlukan respons`, icon: Inbox, tone: "bg-blue-50 text-blue-700", href: "/mail/incoming" },
    { label: "Surat keluar", value: outgoing.length, detail: `${outgoing.filter((item) => item.status === "awaiting_approval").length} menunggu persetujuan`, icon: Send, tone: "bg-emerald-50 text-emerald-700", href: "/mail/outgoing" },
    { label: "Disposisi aktif", value: openDispositions.length, detail: `${overdue.length} melewati tenggat`, icon: Workflow, tone: "bg-amber-50 text-amber-700", href: "/mail/dispositions" },
    { label: "Arsip digital", value: documents.length, detail: `${waitingVerification.length} perlu verifikasi`, icon: Archive, tone: "bg-cyan-50 text-cyan-700", href: "/documents" },
  ];

  return <div className="space-y-6">
    <PageHeader title="Pusat Administrasi Sekolah" description="Kendalikan agenda surat, disposisi, dokumen resmi, masa berlaku, retensi, dan bukti tindak lanjut seluruh unit." />
    <OfficeSectionNav />
    {governanceUnavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Pembaruan basis data administrasi belum diterapkan.</strong> Terapkan migrasi terbaru untuk mengaktifkan tata kelola dan retensi dokumen.</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((item) => <Link key={item.label} to={item.href} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-bold">{isLoading ? "-" : item.value}</p><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></div></Link>)}</section>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><section className="overflow-hidden rounded-lg border bg-card"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">Prioritas Administrasi</h2><p className="text-xs text-muted-foreground">Tenggat surat, disposisi, dan dokumen yang perlu keputusan.</p></div><AlertTriangle className="h-5 w-5 text-amber-600" /></div>{priorities.length === 0 ? <div className="flex min-h-60 flex-col items-center justify-center p-6 text-center"><CheckCircle2 className="mb-3 h-9 w-9 text-emerald-500" /><p className="font-semibold">Tidak ada antrean kritis.</p><p className="mt-1 text-sm text-muted-foreground">Administrasi dalam kondisi terkendali.</p></div> : <div className="divide-y">{priorities.map((item) => <Link key={`${item.href}-${item.id}`} to={item.href} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30"><div className="min-w-0"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.meta}</p></div><span className="shrink-0 rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{item.tone}</span></Link>)}</div>}</section><section className="rounded-lg border bg-card p-5"><h2 className="font-bold">Kendali Mutu Dokumen</h2><p className="mt-1 text-xs text-muted-foreground">Kelengkapan dan kepatuhan arsip unit aktif.</p><div className="mt-5 space-y-4"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><FileCheck2 className="h-4 w-4 text-muted-foreground" />Menunggu verifikasi</span><strong>{waitingVerification.length}</strong></div><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-muted-foreground" />Jatuh tempo 60 hari</span><strong>{expiring.length}</strong></div><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Archive className="h-4 w-4 text-muted-foreground" />Tanpa lokasi fisik</span><strong>{documents.filter((item) => !item.physical_location).length}</strong></div></div><Link to="/documents/governance" className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold hover:bg-muted"><Archive className="h-4 w-4" />Buka Tata Kelola Arsip</Link></section></div>
  </div>;
};
