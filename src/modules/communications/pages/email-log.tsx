import React, { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Loader2, Mail, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useList } from "@/lib/refine-compat";
import { PageHeader } from "../../../components/layout/PageHeader";
import { describeNotificationResult, sendNotificationEvent, type NotificationEvent } from "../../../lib/email";

type EmailRow = {
  id: string;
  event_type: NotificationEvent;
  source_id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: "queued" | "sending" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

const eventLabels: Record<NotificationEvent, string> = {
  announcement: "Pengumuman",
  report_published: "Rapor terbit",
  payment_verified: "Pembayaran",
};

const statusStyles: Record<EmailRow["status"], { label: string; tone: string }> = {
  queued: { label: "Antre", tone: "bg-slate-100 text-slate-700" },
  sending: { label: "Mengirim", tone: "bg-amber-100 text-amber-800" },
  sent: { label: "Terkirim", tone: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Gagal", tone: "bg-rose-100 text-rose-800" },
};

const PAGE_SIZE = 50;

export const EmailLogPage: React.FC = () => {
  const [status, setStatus] = useState("");
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retryingSource, setRetryingSource] = useState<string | null>(null);

  const filters: Array<{ field: string; operator: "eq" | "contains"; value: string }> = [];
  if (status) filters.push({ field: "status", operator: "eq", value: status });
  if (eventType) filters.push({ field: "event_type", operator: "eq", value: eventType });
  if (search.trim()) filters.push({ field: "recipient_email", operator: "contains", value: search.trim().toLowerCase() });

  const { data, isLoading, refetch } = useList({
    resource: "email_messages",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { currentPage: page, pageSize: PAGE_SIZE, mode: "server" },
    meta: { select: "id, event_type, source_id, recipient_email, recipient_name, subject, status, attempts, last_error, created_at, sent_at" },
  });
  const rows = (data?.data || []) as EmailRow[];
  const total = Number(data?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const retry = async (row: EmailRow) => {
    setRetryingSource(row.source_id);
    const result = await sendNotificationEvent(row.event_type, [row.source_id], { retryFailed: true });
    setRetryingSource(null);
    if (result.success && !result.totals?.failed) toast.success(describeNotificationResult(result));
    else toast.error(describeNotificationResult(result));
    void refetch();
  };

  const selectClass = "rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader title="Log Email" description="Status pengiriman email notifikasi per penerima (Mailketing)." />
      <Link to="/communications" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Pusat Komunikasi
      </Link>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari alamat email penerima..."
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Semua jenis</option>
          {Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Semua status</option>
          {Object.entries(statusStyles).map(([value, style]) => <option key={value} value={value}>{style.label}</option>)}
        </select>
        <button type="button" onClick={() => void refetch()} className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Muat ulang
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Penerima</th>
                <th className="px-4 py-3">Subjek</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground"><Mail className="mx-auto mb-2 h-6 w-6" />Belum ada email yang tercatat.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(row.sent_at || row.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.recipient_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{row.recipient_email}</p>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate" title={row.subject}>{row.subject}</p>
                    {row.status === "failed" && row.last_error && <p className="mt-1 text-xs text-rose-700" title={row.last_error}>{row.last_error.slice(0, 120)}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs">{eventLabels[row.event_type] || row.event_type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[row.status]?.tone || ""}`}>{statusStyles[row.status]?.label || row.status}</span>
                    {row.attempts > 1 && <span className="ml-1 text-[10px] text-muted-foreground">{row.attempts}x</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(row.status === "failed" || row.status === "queued") && (
                      <button
                        type="button"
                        disabled={retryingSource === row.source_id}
                        onClick={() => void retry(row)}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                        title="Kirim ulang semua email yang gagal/antre untuk sumber yang sama"
                      >
                        {retryingSource === row.source_id ? "Mengirim..." : "Kirim ulang"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>{total.toLocaleString("id-ID")} email · Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 font-medium disabled:opacity-40">Sebelumnya</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 font-medium disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
};
