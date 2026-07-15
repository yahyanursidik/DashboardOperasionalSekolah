import React, { useMemo, useState } from "react";
import { useList, type CrudFilters } from "@refinedev/core";
import { ArrowDownLeft, ArrowUpRight, Download, Landmark, Search, WalletCards } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { belongsToFinanceUnit, downloadCsv, formatCurrency, formatDate } from "../finance-utils";

type LedgerRow = {
  id: string;
  date: string;
  type: "income" | "expense";
  reference: string;
  description: string;
  method: string;
  account: string;
  amount: number;
};
type CashAccount = { id: string; name: string; unit_id?: string | null };
type PaymentRecord = { id: string; payment_date: string; receipt_number?: string | null; reference_number?: string | null; payment_method?: string | null; cash_account_id?: string | null; amount_paid?: number | null; student_invoices?: { title?: string | null; unit_id?: string | null; academic_year_id?: string | null } | null; students?: { full_name?: string | null } | null; external_students?: { full_name?: string | null } | null };
type ExpenseRecord = { id: string; expense_date: string; status: string; reference_number?: string | null; invoice_number?: string | null; title: string; vendor_name?: string | null; payment_method?: string | null; cash_account_id?: string | null; amount?: number | null; finance_categories?: { name?: string | null } | null };
type ReceiptRecord = { id: string; receipt_date: string; receipt_number: string; status: string; payer_name?: string | null; description: string; payment_method: string; cash_account_id: string; amount: number; finance_categories?: { name?: string | null } | null; finance_programs?: { name?: string | null } | null };

export const FinanceCashbook: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [search, setSearch] = useState("");
  const [flow, setFlow] = useState<"all" | "income" | "expense">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const paymentFilters: CrudFilters = [{ field: "status", operator: "eq", value: "verified" }];
  const expenseFilters: CrudFilters = [];
  if (activeUnitId) expenseFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) expenseFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data: paymentData, isLoading: loadingPayments } = useList<PaymentRecord>({
    resource: "payment_transactions",
    filters: paymentFilters,
    meta: { select: "*, student_invoices(title, unit_id, academic_year_id), students(full_name), external_students(full_name)" },
    pagination: { mode: "off" },
    sorters: [{ field: "payment_date", order: "desc" }],
  });

  const { data: expenseData, isLoading: loadingExpenses } = useList<ExpenseRecord>({
    resource: "school_expenses",
    filters: expenseFilters,
    meta: { select: "*, finance_categories(name)" },
    pagination: { mode: "off" },
    sorters: [{ field: "expense_date", order: "desc" }],
  });
  const receiptFilters: CrudFilters = [{ field: "status", operator: "eq", value: "posted" }];
  if (activeUnitId) receiptFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) receiptFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  const { data: receiptData, isLoading: loadingReceipts } = useList<ReceiptRecord>({ resource: "finance_receipts", filters: receiptFilters, meta: { select: "*, finance_categories(name), finance_programs(name)" }, pagination: { mode: "off" }, sorters: [{ field: "receipt_date", order: "desc" }] });
  const { data: cashAccountData } = useList<CashAccount>({ resource: "finance_cash_accounts", pagination: { mode: "off" } });

  const rows = useMemo<LedgerRow[]>(() => {
    const accountNames = new Map<string, string>((cashAccountData?.data || []).filter((account) => belongsToFinanceUnit(account.unit_id, activeUnitId)).map((account) => [account.id, account.name]));
    const payments = (paymentData?.data || [])
      .filter((payment) => {
        if (activeUnitId && payment.student_invoices?.unit_id !== activeUnitId) return false;
        if (activeYearId && payment.student_invoices?.academic_year_id !== activeYearId) return false;
        return true;
      })
      .map((payment) => ({
        id: `income-${payment.id}`,
        date: payment.payment_date,
        type: "income" as const,
        reference: payment.receipt_number || payment.reference_number || "Pembayaran siswa",
        description: `${payment.student_invoices?.title || "Pembayaran"} - ${payment.students?.full_name || payment.external_students?.full_name || "Siswa"}`,
        method: String(payment.payment_method || "-").replace(/_/g, " "),
        account: (payment.cash_account_id ? accountNames.get(payment.cash_account_id) : undefined) || "Kas/Bank penerimaan",
        amount: Number(payment.amount_paid || 0),
      }));

    const expenses = (expenseData?.data || [])
      .filter((expense) => !["rejected", "void"].includes(expense.status))
      .map((expense) => ({
        id: `expense-${expense.id}`,
        date: expense.expense_date,
        type: "expense" as const,
        reference: expense.reference_number || expense.invoice_number || "Pengeluaran",
        description: `${expense.title}${expense.vendor_name ? ` - ${expense.vendor_name}` : ""}`,
        method: String(expense.payment_method || "-").replace(/_/g, " "),
        account: (expense.cash_account_id ? accountNames.get(expense.cash_account_id) : undefined) || expense.finance_categories?.name || "Operasional",
        amount: Number(expense.amount || 0),
      }));

    const receipts = (receiptData?.data || []).map((receipt) => ({
      id: `receipt-${receipt.id}`,
      date: receipt.receipt_date,
      type: "income" as const,
      reference: receipt.receipt_number,
      description: `${receipt.description}${receipt.payer_name ? ` - ${receipt.payer_name}` : ""}`,
      method: String(receipt.payment_method || "-").replace(/_/g, " "),
      account: accountNames.get(receipt.cash_account_id) || receipt.finance_programs?.name || receipt.finance_categories?.name || "Penerimaan lain",
      amount: Number(receipt.amount || 0),
    }));

    return [...payments, ...receipts, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [paymentData?.data, receiptData?.data, expenseData?.data, cashAccountData?.data, activeUnitId, activeYearId]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (flow !== "all" && row.type !== flow) return false;
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (needle && !`${row.reference} ${row.description} ${row.account}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, search, flow, dateFrom, dateTo]);

  const totalIncome = filteredRows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
  const totalExpense = filteredRows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);

  const handleExport = () => downloadCsv("buku-kas-keuangan.csv", filteredRows.map((row) => ({
    Tanggal: formatDate(row.date),
    Jenis: row.type === "income" ? "Masuk" : "Keluar",
    Referensi: row.reference,
    Keterangan: row.description,
    Akun: row.account,
    Metode: row.method,
    Nominal: row.amount,
  })));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buku Kas & Bank"
        description="Satu buku mutasi untuk seluruh penerimaan terverifikasi dan pengeluaran sekolah."
        action={(
          <button onClick={handleExport} disabled={filteredRows.length === 0} className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Download className="h-4 w-4" /> Ekspor CSV
          </button>
        )}
      />
      <FinanceSectionNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><ArrowDownLeft className="h-5 w-5" /></div>
          <p className="text-sm text-muted-foreground">Kas Masuk</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-rose-50 text-rose-700"><ArrowUpRight className="h-5 w-5" /></div>
          <p className="text-sm text-muted-foreground">Kas Keluar</p>
          <p className="mt-1 text-xl font-bold text-rose-700">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Landmark className="h-5 w-5" /></div>
          <p className="text-sm text-muted-foreground">Mutasi Bersih</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[minmax(220px,1fr)_160px_150px_150px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari referensi atau keterangan" className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" />
        </label>
        <select value={flow} onChange={(event) => setFlow(event.target.value as typeof flow)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Semua Mutasi</option>
          <option value="income">Kas Masuk</option>
          <option value="expense">Kas Keluar</option>
        </select>
        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Tanggal mulai" className="rounded-md border bg-background px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Tanggal akhir" className="rounded-md border bg-background px-3 py-2 text-sm" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {loadingPayments || loadingReceipts || loadingExpenses ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Memuat mutasi kas...</div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center text-muted-foreground">
            <WalletCards className="mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold text-foreground">Belum ada mutasi sesuai filter</p>
            <p className="mt-1 text-sm">Pembayaran terverifikasi, penerimaan lain, dan pengeluaran tercatat akan tampil di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Referensi</th><th className="px-4 py-3">Keterangan</th><th className="px-4 py-3">Akun/Pos</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3 text-right">Masuk</th><th className="px-4 py-3 text-right">Keluar</th></tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                    <td className="px-4 py-3 font-medium">{row.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.account}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{row.method}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{row.type === "income" ? formatCurrency(row.amount) : "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-700">{row.type === "expense" ? formatCurrency(row.amount) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
