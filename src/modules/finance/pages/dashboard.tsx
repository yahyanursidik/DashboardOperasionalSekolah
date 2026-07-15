import React, { useState } from "react";
import { useList, type CrudFilters } from "@refinedev/core";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowRight, Banknote, BookOpenCheck, CheckCircle2, Clock3, FileBarChart, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { formatCurrency, getFinanceBasePath } from "../finance-utils";

type InvoiceRecord = { id: string; status: string; amount?: number | null; discount?: number | null; paid_amount?: number | null; due_date?: string | null };
type VerificationRecord = { id: string; student_invoices?: { unit_id?: string | null; academic_year_id?: string | null } | null };
type ExpenseRecord = { id: string; status: string; amount?: number | null };
type BudgetRecord = { id: string; status: string; planned_amount?: number | null };
type ReceiptRecord = { id: string; status: string; amount?: number | null };

export const FinanceDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const location = useLocation();
  const basePath = getFinanceBasePath(location.pathname);
  const [todayTimestamp] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  });
  const filters: CrudFilters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data: invoicesData, isLoading: loadingInvoices } = useList<InvoiceRecord>({
    resource: "student_invoices",
    filters,
    pagination: { mode: "off" },
  });
  const { data: verificationsData } = useList<VerificationRecord>({
    resource: "payment_transactions",
    filters: [{ field: "status", operator: "eq", value: "pending_verification" }],
    meta: { select: "*, student_invoices(unit_id, academic_year_id)" },
    pagination: { mode: "off" },
  });
  const { data: expensesData } = useList<ExpenseRecord>({ resource: "school_expenses", filters, pagination: { mode: "off" } });
  const { data: budgetsData } = useList<BudgetRecord>({ resource: "finance_budgets", filters, pagination: { mode: "off" } });
  const { data: receiptsData } = useList<ReceiptRecord>({ resource: "finance_receipts", filters, pagination: { mode: "off" } });

  const invoices = (invoicesData?.data || []).filter((invoice) => invoice.status !== "cancelled");
  const pendingVerifications = (verificationsData?.data || []).filter((item) => {
    if (activeUnitId && item.student_invoices?.unit_id !== activeUnitId) return false;
    if (activeYearId && item.student_invoices?.academic_year_id !== activeYearId) return false;
    return true;
  });
  const expenses = (expensesData?.data || []).filter((item) => !["rejected", "void"].includes(item.status));
  const totalBilled = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount) - Number(invoice.discount || 0)), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const otherReceipts = (receiptsData?.data || []).filter((receipt) => receipt.status === "posted").reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);
  const totalIncome = totalPaid + otherReceipts;
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const receivables = Math.max(0, totalBilled - totalPaid);
  const overdue = invoices.filter((invoice) => {
    const remaining = Number(invoice.amount) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0);
    return remaining > 0 && invoice.due_date && new Date(invoice.due_date).getTime() < todayTimestamp;
  });
  const submittedExpenses = expenses.filter((expense) => expense.status === "submitted");
  const approvedBudget = (budgetsData?.data || []).filter((budget) => ["approved", "locked"].includes(budget.status)).reduce((sum, budget) => sum + Number(budget.planned_amount || 0), 0);
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  const priorities = [
    { label: "Bukti pembayaran menunggu verifikasi", count: pendingVerifications.length, href: `${basePath}/verifications`, icon: Clock3, tone: "text-amber-700 bg-amber-50" },
    { label: "Pengeluaran menunggu persetujuan", count: submittedExpenses.length, href: `${basePath}/expenses`, icon: ShieldCheck, tone: "text-violet-700 bg-violet-50" },
    { label: "Tagihan melewati jatuh tempo", count: overdue.length, href: `${basePath}/reports`, icon: AlertTriangle, tone: "text-rose-700 bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Keuangan & Bendahara"
        description="Kondisi penagihan, kas, anggaran, dan pekerjaan bendahara pada unit serta tahun ajaran aktif."
        action={<Link to={`${basePath}/invoices`} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><ReceiptText className="h-4 w-4" /> Buat Tagihan</Link>}
      />
      <FinanceSectionNav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Penerimaan", value: formatCurrency(totalIncome), detail: `${formatCurrency(otherReceipts)} dari sumber lain`, icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Piutang Siswa", value: formatCurrency(receivables), detail: `${overdue.length} telah jatuh tempo`, icon: ReceiptText, tone: "bg-amber-50 text-amber-700" },
          { label: "Pengeluaran", value: formatCurrency(totalExpenses), detail: `${expenses.length} transaksi`, icon: WalletCards, tone: "bg-rose-50 text-rose-700" },
          { label: "Arus Kas Bersih", value: formatCurrency(totalIncome - totalExpenses), detail: "Penerimaan dikurangi pengeluaran", icon: FileBarChart, tone: "bg-blue-50 text-blue-700" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-5">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-bold">{loadingInvoices ? "..." : item.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border bg-card">
          <div className="border-b p-5"><h2 className="font-bold">Prioritas Hari Ini</h2><p className="mt-1 text-sm text-muted-foreground">Pekerjaan yang perlu segera ditindaklanjuti oleh bendahara.</p></div>
          <div className="divide-y">
            {priorities.map((item) => (
              <Link key={item.label} to={item.href} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.count > 0 ? `${item.count} item memerlukan tindakan` : "Tidak ada antrean"}</p></div>
                <span className="text-xl font-bold">{item.count}</span><ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-bold">Kesehatan Keuangan</h2>
          <p className="mt-1 text-sm text-muted-foreground">Indikator ringkas untuk rapat pengendalian.</p>
          <div className="mt-6 space-y-6">
            <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium">Kolektabilitas Tagihan</span><span className="font-bold">{collectionRate.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${collectionRate >= 90 ? "bg-emerald-600" : collectionRate >= 75 ? "bg-amber-500" : "bg-rose-600"}`} style={{ width: `${Math.min(collectionRate, 100)}%` }} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Anggaran Disetujui</p><p className="mt-1 font-bold">{formatCurrency(approvedBudget)}</p></div><div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Saldo Operasional</p><p className={`mt-1 font-bold ${totalIncome - totalExpenses < 0 ? "text-rose-700" : "text-emerald-700"}`}>{formatCurrency(totalIncome - totalExpenses)}</p></div></div>
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><p>Penerimaan, pengeluaran, dan jurnal kini dipisahkan per unit, tahun ajaran, serta sumber dana untuk memudahkan audit dan pertanggungjawaban.</p></div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-bold">Akses Cepat</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Catat Pembayaran", detail: "Tunai, transfer, QRIS, atau VA", href: `${basePath}/invoices`, icon: Banknote },
            { label: "Penerimaan Lain", detail: "Program, hibah, infak, dan sumber lain", href: `${basePath}/receipts`, icon: Banknote },
            { label: "Catat Pengeluaran", detail: "Draf dan persetujuan berjenjang", href: `${basePath}/expenses`, icon: WalletCards },
            { label: "Susun RKAS", detail: "Anggaran dan pemantauan realisasi", href: `${basePath}/budgets`, icon: FileBarChart },
            { label: "Master Tarif", detail: "Biaya per unit, kelas, dan program", href: `${basePath}/tariffs`, icon: BookOpenCheck },
          ].map((item) => <Link key={item.label} to={item.href} className="flex items-center gap-3 rounded-md border p-4 hover:border-primary/40 hover:bg-muted/30"><item.icon className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div></Link>)}
        </div>
      </section>
    </div>
  );
};
