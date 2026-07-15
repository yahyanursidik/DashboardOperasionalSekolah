import React, { useState } from "react";
import { useCreate, useList, useUpdate, type CrudFilters } from "@refinedev/core";
import { BookOpenCheck, CheckCircle2, CircleDollarSign, Plus, Scale, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { belongsToFinanceUnit, formatCurrency, formatDate, getFundTypeLabel } from "../finance-utils";

type JournalLine = { account_id: string; description: string; debit: number; credit: number };
type FinanceAccount = { id: string; code: string; name: string; account_type: string; normal_balance: string; fund_type?: string | null; description?: string | null; unit_id?: string | null };
type PostedJournalLine = { id: string; debit?: number | null; credit?: number | null };
type JournalEntry = { id: string; entry_number: string; entry_date: string; description: string; status: string; finance_journal_lines?: PostedJournalLine[] | null };

const emptyAccount = { code: "", name: "", account_type: "asset", normal_balance: "debit", fund_type: "operational", description: "" };
const emptyLines = (): JournalLine[] => [
  { account_id: "", description: "", debit: 0, credit: 0 },
  { account_id: "", description: "", debit: 0, credit: 0 },
];

export const FinanceAccounting: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [tab, setTab] = useState<"accounts" | "journals">("accounts");
  const [accountOpen, setAccountOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [journalForm, setJournalForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), description: "", lines: emptyLines() });
  const [savingJournal, setSavingJournal] = useState(false);

  const accountFilters: CrudFilters = [{ field: "is_active", operator: "eq", value: true }];
  const journalFilters: CrudFilters = [];
  if (activeUnitId) journalFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) journalFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data: accountData, isLoading: loadingAccounts } = useList<FinanceAccount>({
    resource: "finance_accounts",
    filters: accountFilters,
    pagination: { mode: "off" },
    sorters: [{ field: "code", order: "asc" }],
  });
  const { data: journalData, isLoading: loadingJournals, refetch: refetchJournals } = useList<JournalEntry>({
    resource: "finance_journal_entries",
    filters: journalFilters,
    meta: { select: "*, finance_journal_lines(*, finance_accounts(code, name))" },
    pagination: { mode: "off" },
    sorters: [{ field: "entry_date", order: "desc" }],
  });
  const { mutate: createAccount, isLoading: creatingAccount } = useCreate();
  const { mutate: updateJournal } = useUpdate();

  const accounts = (accountData?.data || []).filter((account) => belongsToFinanceUnit(account.unit_id, activeUnitId));
  const journals = journalData?.data || [];
  const debitTotal = journalForm.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const creditTotal = journalForm.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const balanced = debitTotal > 0 && debitTotal === creditTotal;

  const accountCounts = accounts.reduce((result: Record<string, number>, account) => {
    result[account.account_type] = (result[account.account_type] || 0) + 1;
    return result;
  }, {});

  const submitAccount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUnitId) {
      toast.error("Pilih satu unit sebelum menambahkan akun.");
      return;
    }
    createAccount({ resource: "finance_accounts", values: { ...accountForm, unit_id: activeUnitId || null, is_active: true } }, {
      onSuccess: () => {
        toast.success("Akun baru ditambahkan ke bagan akun.");
        setAccountOpen(false);
        setAccountForm(emptyAccount);
      },
    });
  };

  const updateLine = (index: number, values: Partial<JournalLine>) => setJournalForm((current) => ({
    ...current,
    lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...values } : line),
  }));

  const submitJournal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUnitId || !activeYearId) {
      toast.error("Pilih satu unit dan tahun ajaran sebelum membuat jurnal.");
      return;
    }
    if (!balanced) {
      toast.error("Total debit dan kredit harus sama dan lebih dari nol.");
      return;
    }
    if (journalForm.lines.some((line) => !line.account_id || (Number(line.debit) <= 0 && Number(line.credit) <= 0))) {
      toast.error("Lengkapi akun dan nominal pada setiap baris jurnal.");
      return;
    }
    setSavingJournal(true);
    let entryId: string | null = null;
    try {
      const entryNumber = `JU-${journalForm.entry_date.replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
      const { data: entry, error: entryError } = await supabaseClient.from("finance_journal_entries").insert({
        entry_number: entryNumber,
        entry_date: journalForm.entry_date,
        description: journalForm.description,
        unit_id: activeUnitId,
        academic_year_id: activeYearId,
        source_type: "manual",
        status: "draft",
      }).select("id").single();
      if (entryError) throw entryError;
      const createdEntry = entry as unknown as { id: string };
      entryId = createdEntry.id;
      const { error: linesError } = await supabaseClient.from("finance_journal_lines").insert(journalForm.lines.map((line) => ({ ...line, journal_entry_id: createdEntry.id })));
      if (linesError) throw linesError;
      toast.success("Jurnal berimbang berhasil disimpan sebagai draf.");
      setJournalOpen(false);
      setJournalForm({ entry_date: new Date().toISOString().slice(0, 10), description: "", lines: emptyLines() });
      refetchJournals();
    } catch (error: unknown) {
      if (entryId) await supabaseClient.from("finance_journal_entries").delete().eq("id", entryId);
      toast.error(error instanceof Error ? error.message : "Jurnal gagal disimpan.");
    } finally {
      setSavingJournal(false);
    }
  };

  const postJournal = (id: string) => updateJournal({
    resource: "finance_journal_entries",
    id,
    values: { status: "posted", posted_at: new Date().toISOString() },
  }, { onSuccess: () => toast.success("Jurnal telah diposting dan dikunci.") });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Akuntansi Sekolah"
        description="Kelola bagan akun dan jurnal berpasangan untuk pelaporan yang tertib, transparan, dan dapat diaudit."
        action={<button onClick={() => tab === "accounts" ? setAccountOpen(true) : setJournalOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> {tab === "accounts" ? "Tambah Akun" : "Buat Jurnal"}</button>}
      />
      <FinanceSectionNav />

      <div className="flex w-full max-w-md rounded-md bg-muted p-1">
        <button onClick={() => setTab("accounts")} className={`flex-1 rounded px-4 py-2 text-sm font-semibold ${tab === "accounts" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Bagan Akun</button>
        <button onClick={() => setTab("journals")} className={`flex-1 rounded px-4 py-2 text-sm font-semibold ${tab === "journals" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Jurnal Umum</button>
      </div>

      {tab === "accounts" ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[['asset', 'Aset'], ['liability', 'Liabilitas'], ['equity', 'Dana Bersih'], ['income', 'Pendapatan'], ['expense', 'Beban']].map(([key, label]) => <div key={key} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{accountCounts[key] || 0}</p></div>)}
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            {loadingAccounts ? <div className="p-10 text-center text-sm text-muted-foreground">Memuat bagan akun...</div> : accounts.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">Belum ada bagan akun. Jalankan migrasi keuangan atau tambahkan akun baru.</div> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama Akun</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Saldo Normal</th><th className="px-4 py-3">Sumber Dana</th><th className="px-4 py-3">Keterangan</th></tr></thead><tbody className="divide-y">{accounts.map((account) => <tr key={account.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-mono font-bold">{account.code}</td><td className="px-4 py-3 font-semibold">{account.name}</td><td className="px-4 py-3 capitalize text-muted-foreground">{account.account_type}</td><td className="px-4 py-3 capitalize">{account.normal_balance}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{getFundTypeLabel(account.fund_type || undefined)}</span></td><td className="px-4 py-3 text-muted-foreground">{account.description || "-"}</td></tr>)}</tbody></table></div>
            )}
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {loadingJournals ? <div className="p-10 text-center text-sm text-muted-foreground">Memuat jurnal...</div> : journals.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center"><BookOpenCheck className="mb-3 h-10 w-10 text-muted-foreground/30" /><p className="font-semibold">Belum ada jurnal</p><p className="mt-1 text-sm text-muted-foreground">Buat jurnal berimbang untuk transaksi penyesuaian dan pencatatan akuntansi lainnya.</p></div>
          ) : (
            <div className="divide-y">{journals.map((journal) => {
              const debit = (journal.finance_journal_lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0);
              return <div key={journal.id} className="p-5 hover:bg-muted/30"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{journal.entry_number}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${journal.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{journal.status === 'posted' ? 'Diposting' : 'Draf'}</span></div><p className="mt-2 font-semibold">{journal.description}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(journal.entry_date)} · {(journal.finance_journal_lines || []).length} baris</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-xs text-muted-foreground">Total jurnal</p><p className="font-bold">{formatCurrency(debit)}</p></div>{journal.status === 'draft' && <button onClick={() => postJournal(journal.id)} title="Posting jurnal" className="rounded-md border p-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>}</div></div></div>;
            })}</div>
          )}
        </div>
      )}

      {accountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-lg bg-background shadow-xl"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-bold">Tambah Akun</h2><button onClick={() => setAccountOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div><form onSubmit={submitAccount} className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-[120px_1fr]"><label><span className="mb-1 block text-sm font-medium">Kode</span><input required value={accountForm.code} onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm font-mono" /></label><label><span className="mb-1 block text-sm font-medium">Nama Akun</span><input required value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Jenis Akun</span><select value={accountForm.account_type} onChange={(event) => { const type = event.target.value; setAccountForm({ ...accountForm, account_type: type, normal_balance: ['asset', 'expense'].includes(type) ? 'debit' : 'credit' }); }} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="asset">Aset</option><option value="liability">Liabilitas</option><option value="equity">Dana Bersih/Ekuitas</option><option value="income">Pendapatan</option><option value="expense">Beban</option></select></label><label><span className="mb-1 block text-sm font-medium">Saldo Normal</span><select value={accountForm.normal_balance} onChange={(event) => setAccountForm({ ...accountForm, normal_balance: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="debit">Debit</option><option value="credit">Kredit</option></select></label></div><label className="block"><span className="mb-1 block text-sm font-medium">Klasifikasi Dana</span><select value={accountForm.fund_type} onChange={(event) => setAccountForm({ ...accountForm, fund_type: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="operational">Operasional</option><option value="tuition">Dana Pendidikan</option><option value="bos">Dana BOS</option><option value="ziswaf">ZISWAF</option><option value="scholarship">Beasiswa</option><option value="building">Sarpras/Gedung</option><option value="activity">Kegiatan</option></select></label><label className="block"><span className="mb-1 block text-sm font-medium">Keterangan</span><textarea rows={2} value={accountForm.description} onChange={(event) => setAccountForm({ ...accountForm, description: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setAccountOpen(false)} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={creatingAccount} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Simpan Akun</button></div></form></div></div>
      )}

      {journalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background shadow-xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4"><div><h2 className="font-bold">Buat Jurnal Umum</h2><p className="mt-1 text-xs text-muted-foreground">Sistem hanya menerima jurnal dengan total debit dan kredit yang sama.</p></div><button onClick={() => setJournalOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div><form onSubmit={submitJournal} className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-[170px_1fr]"><label><span className="mb-1 block text-sm font-medium">Tanggal</span><input required type="date" value={journalForm.entry_date} onChange={(event) => setJournalForm({ ...journalForm, entry_date: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></label><label><span className="mb-1 block text-sm font-medium">Keterangan Jurnal</span><input required value={journalForm.description} onChange={(event) => setJournalForm({ ...journalForm, description: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Contoh: Penyesuaian beban dibayar di muka" /></label></div><div className="space-y-3"><div className="grid grid-cols-[minmax(180px,1fr)_130px_130px_40px] gap-2 px-1 text-xs font-bold uppercase text-muted-foreground"><span>Akun</span><span>Debit</span><span>Kredit</span><span /></div>{journalForm.lines.map((line, index) => <div key={index} className="grid grid-cols-[minmax(180px,1fr)_130px_130px_40px] gap-2"><select required value={line.account_id} onChange={(event) => updateLine(index, { account_id: event.target.value })} className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih akun</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select><input type="number" min={0} value={line.debit} onChange={(event) => updateLine(index, { debit: Number(event.target.value), credit: Number(event.target.value) > 0 ? 0 : line.credit })} className="min-w-0 rounded-md border px-3 py-2 text-right text-sm" /><input type="number" min={0} value={line.credit} onChange={(event) => updateLine(index, { credit: Number(event.target.value), debit: Number(event.target.value) > 0 ? 0 : line.debit })} className="min-w-0 rounded-md border px-3 py-2 text-right text-sm" /><button type="button" disabled={journalForm.lines.length <= 2} onClick={() => setJournalForm({ ...journalForm, lines: journalForm.lines.filter((_, lineIndex) => lineIndex !== index) })} className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => setJournalForm({ ...journalForm, lines: [...journalForm.lines, { account_id: "", description: "", debit: 0, credit: 0 }] })} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus className="h-4 w-4" /> Tambah Baris</button></div><div className={`flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center ${balanced ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2"><Scale className={`h-5 w-5 ${balanced ? 'text-emerald-700' : 'text-amber-700'}`} /><span className="text-sm font-semibold">{balanced ? 'Jurnal sudah berimbang' : 'Debit dan kredit belum berimbang'}</span></div><div className="flex gap-6 text-sm"><span>Debit <strong>{formatCurrency(debitTotal)}</strong></span><span>Kredit <strong>{formatCurrency(creditTotal)}</strong></span></div></div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setJournalOpen(false)} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={!balanced || savingJournal} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CircleDollarSign className="h-4 w-4" /> {savingJournal ? 'Menyimpan...' : 'Simpan Draf Jurnal'}</button></div></form></div></div>
      )}
    </div>
  );
};
