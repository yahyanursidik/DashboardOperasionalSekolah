import React, { useState } from "react";
import { useList, type CrudFilters } from "@refinedev/core";
import { AlertTriangle, Download, FileBarChart, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { downloadCsv, formatCurrency, formatDate } from "../finance-utils";

type AgingBucket = { label: string; amount: number; count: number; color: string };
type InvoiceRecord = {
  id: string;
  invoice_number?: string | null;
  title: string;
  due_date?: string | null;
  amount: number;
  discount?: number | null;
  paid_amount?: number | null;
  status: string;
  students?: { full_name?: string | null; nis?: string | null } | null;
  external_students?: { full_name?: string | null; school_origin?: string | null } | null;
  finance_categories?: { name?: string | null } | null;
};
type ExpenseRecord = { id: string; amount?: number | null; status: string };
type ReceiptRecord = { id: string; amount?: number | null; status: string };

export const FinanceReports: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [todayTimestamp] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  });
  const filters: CrudFilters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data: invoiceData, isLoading } = useList<InvoiceRecord>({
    resource: "student_invoices",
    filters,
    meta: { select: "*, students(full_name, nis), external_students(full_name, school_origin), finance_categories(name)" },
    pagination: { mode: "off" },
    sorters: [{ field: "due_date", order: "asc" }],
  });
  const { data: expenseData } = useList<ExpenseRecord>({
    resource: "school_expenses",
    filters,
    pagination: { mode: "off" },
  });
  const { data: receiptData } = useList<ReceiptRecord>({ resource: "finance_receipts", filters, pagination: { mode: "off" } });

  const invoices = invoiceData?.data || [];
  const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
  const billed = activeInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount) - Number(invoice.discount || 0)), 0);
  const collected = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const otherReceipts = (receiptData?.data || []).filter((receipt) => receipt.status === "posted").reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);
  const totalIncome = collected + otherReceipts;
  const expenses = (expenseData?.data || [])
    .filter((expense) => !["rejected", "void"].includes(expense.status))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const collectionRate = billed > 0 ? (collected / billed) * 100 : 0;

  const overdue = activeInvoices.filter((invoice) => {
    const remaining = Number(invoice.amount) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0);
    return remaining > 0 && invoice.due_date && new Date(invoice.due_date).getTime() < todayTimestamp;
  });

  const aging: AgingBucket[] = (() => {
    const buckets: AgingBucket[] = [
      { label: "Belum jatuh tempo", amount: 0, count: 0, color: "bg-blue-500" },
      { label: "1-30 hari", amount: 0, count: 0, color: "bg-amber-400" },
      { label: "31-60 hari", amount: 0, count: 0, color: "bg-orange-500" },
      { label: "> 60 hari", amount: 0, count: 0, color: "bg-rose-600" },
    ];
    activeInvoices.forEach((invoice) => {
      const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0));
      if (remaining === 0) return;
      const dueTimestamp = invoice.due_date ? new Date(invoice.due_date).getTime() : todayTimestamp;
      const days = Math.floor((todayTimestamp - dueTimestamp) / 86400000);
      const bucket = days <= 0 ? buckets[0] : days <= 30 ? buckets[1] : days <= 60 ? buckets[2] : buckets[3];
      bucket.amount += remaining;
      bucket.count += 1;
    });
    return buckets;
  })();

  const maxAging = Math.max(...aging.map((bucket) => bucket.amount), 1);

  const exportReceivables = () => downloadCsv("laporan-piutang-siswa.csv", activeInvoices.map((invoice) => ({
    Nomor: invoice.invoice_number || invoice.id,
    Siswa: invoice.students?.full_name || invoice.external_students?.full_name || "-",
    NIS: invoice.students?.nis || "-",
    Tagihan: invoice.title,
    Kategori: invoice.finance_categories?.name || "-",
    Jatuh_Tempo: formatDate(invoice.due_date),
    Nilai_Tagihan: Number(invoice.amount) - Number(invoice.discount || 0),
    Terbayar: Number(invoice.paid_amount || 0),
    Sisa: Math.max(0, Number(invoice.amount) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0)),
    Status: invoice.status,
  })));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Pengendalian"
        description="Pantau kolektabilitas, umur piutang, arus dana, dan area yang membutuhkan tindak lanjut."
        action={<button onClick={exportReceivables} disabled={activeInvoices.length === 0} className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4" /> Ekspor Piutang</button>}
      />
      <FinanceSectionNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tagihan Bersih", value: formatCurrency(billed), detail: `${activeInvoices.length} tagihan`, icon: FileBarChart, tone: "text-blue-700 bg-blue-50" },
          { label: "Total Penerimaan", value: formatCurrency(totalIncome), detail: `${collectionRate.toFixed(1)}% tagihan tertagih · ${formatCurrency(otherReceipts)} lainnya`, icon: TrendingUp, tone: "text-emerald-700 bg-emerald-50" },
          { label: "Pengeluaran", value: formatCurrency(expenses), detail: "Tercatat periode ini", icon: ShieldCheck, tone: "text-violet-700 bg-violet-50" },
          { label: "Tunggakan Jatuh Tempo", value: formatCurrency(overdue.reduce((sum, item) => sum + Math.max(0, Number(item.amount) - Number(item.discount || 0) - Number(item.paid_amount || 0)), 0)), detail: `${overdue.length} tagihan`, icon: AlertTriangle, tone: "text-rose-700 bg-rose-50" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-5">
            <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-bold">{item.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-bold">Umur Piutang</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sisa tagihan dikelompokkan berdasarkan keterlambatan.</p>
          <div className="mt-6 space-y-5">
            {aging.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{bucket.label} <span className="text-muted-foreground">({bucket.count})</span></span>
                  <span className="font-semibold">{formatCurrency(bucket.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${bucket.color}`} style={{ width: `${Math.max(bucket.amount > 0 ? 4 : 0, (bucket.amount / maxAging) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b p-5">
            <h2 className="text-base font-bold">Prioritas Penagihan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tagihan paling lama melewati jatuh tempo ditampilkan lebih dahulu.</p>
          </div>
          {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Memuat laporan...</div> : overdue.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Tidak ada tunggakan jatuh tempo pada periode ini.</div>
          ) : (
            <div className="max-h-[430px] overflow-auto divide-y">
              {overdue.slice(0, 20).map((invoice) => {
                const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0));
                const days = Math.max(1, Math.floor((todayTimestamp - new Date(invoice.due_date || todayTimestamp).getTime()) / 86400000));
                return (
                  <div key={invoice.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{invoice.students?.full_name || invoice.external_students?.full_name || "Siswa"}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{invoice.title} · terlambat {days} hari</p>
                    </div>
                    <div className="shrink-0 text-right"><p className="font-bold text-rose-700">{formatCurrency(remaining)}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(invoice.due_date)}</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
