import React, { useMemo, useState } from "react";
import { useCreate, useList } from "@refinedev/core";
import { BadgeDollarSign, Download, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { belongsToFinanceUnit, downloadCsv, formatCurrency, formatDate } from "../finance-utils";

type Category = { id: string; name: string; unit_id?: string | null };
type Program = { id: string; name: string; unit_id: string; academic_year_id?: string | null; is_active: boolean };
type CashAccount = { id: string; code: string; name: string; unit_id?: string | null; is_active: boolean };
type Receipt = { id: string; receipt_number: string; receipt_date: string; payer_name?: string | null; description: string; amount: number; payment_method: string; reference_number?: string | null; status: string; units?: { name?: string | null } | null; finance_categories?: { name?: string | null } | null; finance_programs?: { name?: string | null } | null; finance_cash_accounts?: { name?: string | null } | null };

const initialForm = { category_id: "", program_id: "", cash_account_id: "", receipt_date: new Date().toISOString().slice(0, 10), payer_name: "", description: "", amount: 0, payment_method: "transfer", reference_number: "" };

export const FinanceReceipts: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  const filters = [
    ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
  ];
  const { data, isLoading, refetch } = useList<Receipt>({ resource: "finance_receipts", filters, meta: { select: "*, units(name), finance_categories(name), finance_programs(name), finance_cash_accounts(name)" }, pagination: { mode: "off" }, sorters: [{ field: "receipt_date", order: "desc" }] });
  const { data: categoryData } = useList<Category>({ resource: "finance_categories", filters: [{ field: "type", operator: "eq", value: "income" }, { field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const { data: programData } = useList<Program>({ resource: "finance_programs", filters: [{ field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const { data: cashData } = useList<CashAccount>({ resource: "finance_cash_accounts", filters: [{ field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const { mutate: create, isLoading: creating } = useCreate();

  const categories = (categoryData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId));
  const programs = (programData?.data || []).filter((item) => (!activeUnitId || item.unit_id === activeUnitId) && (!activeYearId || !item.academic_year_id || item.academic_year_id === activeYearId));
  const cashAccounts = (cashData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId));
  const rows = useMemo(() => (data?.data || []).filter((item) => !search.trim() || `${item.receipt_number} ${item.payer_name || ""} ${item.description} ${item.finance_programs?.name || ""}`.toLowerCase().includes(search.toLowerCase())), [data?.data, search]);
  const total = rows.filter((item) => item.status === "posted").reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const startCreate = () => {
    if (!activeUnitId || !activeYearId) return toast.error("Pilih satu unit dan tahun ajaran sebelum mencatat penerimaan.");
    setOpen(true);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUnitId || !activeYearId || !form.category_id || !form.cash_account_id || !form.description.trim() || form.amount <= 0) return toast.error("Lengkapi unit, tahun ajaran, kategori, kas, keterangan, dan nominal.");
    create({ resource: "finance_receipts", values: { ...form, unit_id: activeUnitId, academic_year_id: activeYearId, program_id: form.program_id || null, receipt_number: `RCV-${Date.now()}`, status: "posted" } }, {
      onSuccess: () => { toast.success("Penerimaan berhasil dicatat dan dijurnal."); setOpen(false); setForm(initialForm); refetch(); },
      onError: (error) => toast.error(error.message || "Penerimaan gagal disimpan."),
    });
  };
  const exportRows = () => downloadCsv("penerimaan-lain.csv", rows.map((item) => ({ Nomor: item.receipt_number, Tanggal: formatDate(item.receipt_date), Unit: item.units?.name || "-", Pemberi: item.payer_name || "-", Keterangan: item.description, Kategori: item.finance_categories?.name || "-", Program: item.finance_programs?.name || "-", Kas: item.finance_cash_accounts?.name || "-", Metode: item.payment_method, Nominal: item.amount, Status: item.status })));

  return (
    <div className="space-y-6">
      <PageHeader title="Penerimaan Lain" description="Catat pemasukan selain pembayaran tagihan siswa, seperti program tambahan, hibah, infak, atau pemanfaatan fasilitas." action={<button onClick={startCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Catat Penerimaan</button>} />
      <FinanceSectionNav />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Total Penerimaan Sesuai Filter</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(total)}</p><p className="mt-1 text-xs text-muted-foreground">{rows.length} transaksi penerimaan</p></div>
        <button onClick={exportRows} disabled={rows.length === 0} className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border bg-background px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4" /> Ekspor CSV</button>
      </div>
      <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor, pemberi, keterangan, atau program" className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" /></label>
      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Memuat penerimaan...</div> : rows.length === 0 ? <div className="p-12 text-center"><BadgeDollarSign className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-semibold">Belum ada penerimaan lain</p><p className="mt-1 text-sm text-muted-foreground">Pembayaran tagihan siswa tetap dicatat dari halaman Tagihan.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Tanggal/No.</th><th className="px-4 py-3">Pemberi & Keterangan</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Kategori/Program</th><th className="px-4 py-3">Kas & Metode</th><th className="px-4 py-3 text-right">Nominal</th></tr></thead><tbody className="divide-y">{rows.map((item) => <tr key={item.id} className="hover:bg-muted/30"><td className="px-4 py-3"><p>{formatDate(item.receipt_date)}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{item.receipt_number}</p></td><td className="px-4 py-3"><p className="font-semibold">{item.payer_name || "Tanpa nama pemberi"}</p><p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{item.description}</p></td><td className="px-4 py-3">{item.units?.name || "-"}</td><td className="px-4 py-3"><p>{item.finance_categories?.name || "-"}</p><p className="mt-1 text-xs text-muted-foreground">{item.finance_programs?.name || "Tanpa program"}</p></td><td className="px-4 py-3"><p>{item.finance_cash_accounts?.name || "-"}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{item.payment_method.replace(/_/g, " ")}</p></td><td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div>}
      </div>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-background shadow-xl"><div className="sticky top-0 flex items-center justify-between border-b bg-background px-5 py-4"><div><h2 className="font-bold">Catat Penerimaan</h2><p className="mt-1 text-xs text-muted-foreground">Transaksi masuk ke buku kas dan jurnal unit aktif.</p></div><button onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-muted" aria-label="Tutup"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal"><input required type="date" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></Field><Field label="Metode"><select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="cash">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="virtual_account">Virtual Account</option></select></Field></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Kategori Pemasukan"><select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Program (Opsional)"><select value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Tanpa program</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
        <Field label="Kas/Rekening Tujuan"><select required value={form.cash_account_id} onChange={(e) => setForm({ ...form, cash_account_id: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih kas atau rekening</option>{cashAccounts.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama Pemberi/Pembayar"><input value={form.payer_name} onChange={(e) => setForm({ ...form, payer_name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></Field><Field label="Nomor Referensi"><input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></Field></div>
        <Field label="Keterangan"><input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Contoh: Infak kegiatan Ramadan" /></Field><Field label="Nominal"><input required min="1" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm font-semibold" /></Field>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={creating} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{creating ? "Menyimpan..." : "Simpan & Jurnal"}</button></div>
      </form></div></div>}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span>{children}</label>;
