import React, { useMemo, useState } from "react";
import { useCreate, useList, useUpdate, type CrudFilters } from "@refinedev/core";
import { CheckCircle2, ChevronLeft, ChevronRight, CreditCard, FileText, Plus, Search, Send, ShieldCheck, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { formatCurrency, formatDate, getExpenseStatusLabel } from "../finance-utils";
import { belongsToFinanceUnit } from "../finance-utils";

const initialForm = {
  title: "", amount: 0, category_id: "", description: "", vendor_name: "", invoice_number: "",
  expense_date: new Date().toISOString().slice(0, 10), payment_method: "transfer", reference_number: "", cash_account_id: "", program_id: "",
};
type FinanceCategory = { id: string; name: string; fund_type?: string | null; unit_id?: string | null };
type CashAccount = { id: string; code: string; name: string; unit_id?: string | null };
type ExpenseRecord = { id: string; title: string; amount?: number | null; status?: string | null; expense_date: string; description?: string | null; vendor_name?: string | null; invoice_number?: string | null; reference_number?: string | null; proof_image_url?: string | null; finance_categories?: FinanceCategory | null };

export const SchoolExpenses: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const baseFilters: CrudFilters = [];
  if (activeUnitId) baseFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) baseFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  const { data: categoriesData } = useList<FinanceCategory>({
    resource: "finance_categories",
    filters: [{ field: "type", operator: "eq", value: "expense" }],
    pagination: { mode: "off" },
  });
  const { data: cashAccountsData } = useList<CashAccount>({
    resource: "finance_cash_accounts",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    pagination: { mode: "off" },
  });
  const categories = { data: (categoriesData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId)) };
  const cashAccounts = { data: (cashAccountsData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId)) };
  const { data, isLoading } = useList<ExpenseRecord>({
    resource: "school_expenses",
    filters: baseFilters,
    meta: { select: "*, finance_categories(name, fund_type)" },
    pagination: { mode: "off" },
    sorters: [{ field: "expense_date", order: "desc" }],
  });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update } = useUpdate();

  const filtered = useMemo(() => (data?.data || []).filter((item) => {
    if (status !== "all" && (item.status || "paid") !== status) return false;
    const needle = search.trim().toLowerCase();
    return !needle || `${item.title} ${item.vendor_name || ""} ${item.invoice_number || ""} ${item.finance_categories?.name || ""}`.toLowerCase().includes(needle);
  }), [data?.data, search, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totals = filtered.reduce((result, item) => {
    const itemStatus = item.status || "paid";
    if (["rejected", "void"].includes(itemStatus)) return result;
    result.total += Number(item.amount || 0);
    if (itemStatus === "submitted") result.pending += Number(item.amount || 0);
    if (["approved", "paid"].includes(itemStatus)) result.approved += Number(item.amount || 0);
    return result;
  }, { total: 0, pending: 0, approved: 0 });

  const submit = (event: React.SyntheticEvent, submitForApproval = false) => {
    event.preventDefault();
    if (!activeUnitId || !activeYearId) {
      toast.error("Pilih satu unit dan tahun ajaran sebelum mencatat pengeluaran.");
      return;
    }
    if (!form.title.trim() || !form.category_id || form.amount <= 0 || !form.expense_date) {
      toast.error("Lengkapi judul, kategori, nominal, dan tanggal pengeluaran.");
      return;
    }
    create({
      resource: "school_expenses",
      values: {
        ...form,
        cash_account_id: form.cash_account_id || null,
        program_id: form.program_id || null,
        unit_id: activeUnitId,
        academic_year_id: activeYearId,
        status: submitForApproval ? "submitted" : "draft",
        submitted_at: submitForApproval ? new Date().toISOString() : null,
      },
    }, { onSuccess: () => {
      toast.success(submitForApproval ? "Pengeluaran diajukan untuk persetujuan." : "Pengeluaran disimpan sebagai draf.");
      setForm(initialForm);
      setIsOpen(false);
    }});
  };

  const changeStatus = (id: string, nextStatus: string) => update({ resource: "school_expenses", id, values: {
    status: nextStatus,
    ...(nextStatus === "submitted" ? { submitted_at: new Date().toISOString() } : {}),
    ...(nextStatus === "approved" ? { approved_at: new Date().toISOString() } : {}),
  } }, { onSuccess: () => toast.success(nextStatus === "approved" ? "Pengeluaran disetujui." : nextStatus === "paid" ? "Pengeluaran ditandai sudah dibayar." : nextStatus === "rejected" ? "Pengeluaran ditolak." : "Pengeluaran diajukan.") });

  const badgeClass = (value?: string) => {
    if (value === "paid") return "bg-emerald-100 text-emerald-800";
    if (value === "approved") return "bg-blue-100 text-blue-800";
    if (value === "submitted") return "bg-amber-100 text-amber-800";
    if (value === "rejected" || value === "void") return "bg-rose-100 text-rose-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pengeluaran & Persetujuan" description="Catat pengajuan, periksa bukti, setujui, lalu tandai pembayaran tanpa kehilangan jejak proses." action={<button onClick={() => setIsOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Catat Pengeluaran</button>} />
      <FinanceSectionNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Total Pengajuan</p><p className="mt-2 text-xl font-bold">{formatCurrency(totals.total)}</p></div>
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Menunggu Persetujuan</p><p className="mt-2 text-xl font-bold text-amber-700">{formatCurrency(totals.pending)}</p></div>
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Disetujui/Dibayar</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(totals.approved)}</p></div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_220px]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari judul, pemasok, nomor bukti, atau kategori" className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" /></label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="all">Semua Status</option><option value="draft">Draf</option><option value="submitted">Menunggu Persetujuan</option><option value="approved">Disetujui</option><option value="paid">Dibayar</option><option value="rejected">Ditolak</option></select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Memuat data pengeluaran...</div> : pageRows.length === 0 ? <div className="flex flex-col items-center p-12 text-center"><CreditCard className="mb-3 h-10 w-10 text-muted-foreground/30" /><p className="font-semibold">Belum ada pengeluaran sesuai filter</p><p className="mt-1 text-sm text-muted-foreground">Catat pengeluaran sebagai draf atau langsung ajukan untuk persetujuan.</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Pengeluaran</th><th className="px-4 py-3">Pemasok/Bukti</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3 text-right">Nominal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Tindakan</th></tr></thead><tbody className="divide-y">{pageRows.map((item) => {
            const itemStatus = item.status || "paid";
            return <tr key={item.id} className="hover:bg-muted/30"><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(item.expense_date)}</td><td className="px-4 py-3"><p className="font-semibold">{item.title}</p><p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{item.description || "Tanpa catatan"}</p></td><td className="px-4 py-3"><p>{item.vendor_name || "-"}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{item.invoice_number || item.reference_number || "-"}</p></td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{item.finance_categories?.name || "-"}</span></td><td className="px-4 py-3 text-right font-bold text-rose-700">{formatCurrency(item.amount)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(itemStatus)}`}>{getExpenseStatusLabel(itemStatus)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{item.proof_image_url && <a href={item.proof_image_url} target="_blank" rel="noreferrer" title="Lihat bukti" className="rounded-md p-2 text-slate-600 hover:bg-muted"><FileText className="h-4 w-4" /></a>}{itemStatus === "draft" && <button onClick={() => changeStatus(item.id, "submitted")} title="Ajukan" className="rounded-md p-2 text-blue-700 hover:bg-blue-50"><Send className="h-4 w-4" /></button>}{itemStatus === "submitted" && <><button onClick={() => changeStatus(item.id, "rejected")} title="Tolak" className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><XCircle className="h-4 w-4" /></button><button onClick={() => changeStatus(item.id, "approved")} title="Setujui" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"><ShieldCheck className="h-4 w-4" /></button></>}{itemStatus === "approved" && <button onClick={() => changeStatus(item.id, "paid")} title="Tandai dibayar" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>}</div></td></tr>;
          })}</tbody></table></div>
        )}
        {filtered.length > pageSize && <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span className="text-muted-foreground">Halaman {page} dari {pageCount} · {filtered.length} data</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </div>

      {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4"><div><h2 className="font-bold">Catat Pengeluaran</h2><p className="mt-1 text-xs text-muted-foreground">Lengkapi pihak penerima dan bukti agar proses persetujuan lebih cepat.</p></div><button onClick={() => setIsOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div><form className="space-y-4 p-5" onSubmit={(event) => submit(event, false)}><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Judul Pengeluaran</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Contoh: Pembelian alat kebersihan" /></label><label><span className="mb-1 block text-sm font-medium">Kategori</span><select required value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih kategori</option>{categories?.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-3"><label><span className="mb-1 block text-sm font-medium">Nominal</span><input required min={1} type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm" /></label><label><span className="mb-1 block text-sm font-medium">Tanggal</span><input required type="date" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label><label><span className="mb-1 block text-sm font-medium">Metode</span><select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="transfer">Transfer</option><option value="cash">Tunai</option><option value="qris">QRIS</option><option value="virtual_account">Virtual Account</option></select></label></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Pemasok/Penerima</span><input value={form.vendor_name} onChange={(event) => setForm({ ...form, vendor_name: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label><label><span className="mb-1 block text-sm font-medium">Nomor Nota/Invoice</span><input value={form.invoice_number} onChange={(event) => setForm({ ...form, invoice_number: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Rekening Kas/Bank</span><select value={form.cash_account_id} onChange={(event) => setForm({ ...form, cash_account_id: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Belum ditentukan</option>{cashAccounts?.data?.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></label><label><span className="mb-1 block text-sm font-medium">Nomor Referensi</span><input value={form.reference_number} onChange={(event) => setForm({ ...form, reference_number: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Nomor transfer/cek" /></label></div><label className="block"><span className="mb-1 block text-sm font-medium">Uraian dan Tujuan</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label><div className="flex flex-col justify-end gap-3 border-t pt-4 sm:flex-row"><button type="button" onClick={() => setIsOpen(false)} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={isCreating} type="submit" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">Simpan Draf</button><button disabled={isCreating} type="button" onClick={(event) => submit(event as unknown as React.FormEvent, true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /> Ajukan Persetujuan</button></div></form></div></div>}
    </div>
  );
};
