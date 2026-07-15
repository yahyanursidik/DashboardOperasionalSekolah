import React, { useMemo, useState } from "react";
import { useCreate, useList, useUpdate, type CrudFilters } from "@refinedev/core";
import { CheckCircle2, Landmark, LockKeyhole, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { belongsToFinanceUnit, formatCurrency } from "../finance-utils";

const initialForm = { name: "", category_id: "", account_id: "", program_id: "", period_type: "annual", planned_amount: 0, notes: "" };
type FinanceBudget = { id: string; name: string; category_id?: string | null; planned_amount: number; notes?: string | null; period_type: string; status: string; finance_categories?: { name?: string | null; fund_type?: string | null } | null; finance_accounts?: { code?: string | null; name?: string | null } | null; finance_programs?: { name?: string | null } | null };
type FinanceCategory = { id: string; name: string; unit_id?: string | null };
type FinanceAccount = { id: string; code: string; name: string; unit_id?: string | null };
type FinanceProgram = { id: string; name: string; unit_id: string; academic_year_id?: string | null; is_active: boolean };
type SchoolExpense = { id: string; category_id?: string | null; status: string; amount?: number | null };

export const FinanceBudgets: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const filters: CrudFilters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data, isLoading } = useList<FinanceBudget>({
    resource: "finance_budgets",
    filters,
    meta: { select: "*, finance_categories(name, fund_type), finance_accounts(code, name), finance_programs(name)" },
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const { data: categoriesData } = useList<FinanceCategory>({
    resource: "finance_categories",
    filters: [{ field: "type", operator: "eq", value: "expense" }, { field: "is_active", operator: "eq", value: true }],
    pagination: { mode: "off" },
  });
  const { data: accountsData } = useList<FinanceAccount>({
    resource: "finance_accounts",
    filters: [{ field: "account_type", operator: "eq", value: "expense" }, { field: "is_active", operator: "eq", value: true }],
    pagination: { mode: "off" },
    sorters: [{ field: "code", order: "asc" }],
  });
  const { data: programData } = useList<FinanceProgram>({ resource: "finance_programs", filters: [{ field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const categories = { data: (categoriesData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId)) };
  const accounts = { data: (accountsData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId)) };
  const programs = (programData?.data || []).filter((item) => (!activeUnitId || item.unit_id === activeUnitId) && (!activeYearId || !item.academic_year_id || item.academic_year_id === activeYearId));
  const { data: expenses } = useList<SchoolExpense>({ resource: "school_expenses", filters, pagination: { mode: "off" } });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update } = useUpdate();

  const realizedByCategory = useMemo(() => {
    const result = new Map<string, number>();
    (expenses?.data || []).filter((item) => !["rejected", "void"].includes(item.status)).forEach((item) => {
      if (item.category_id) result.set(item.category_id, (result.get(item.category_id) || 0) + Number(item.amount || 0));
    });
    return result;
  }, [expenses?.data]);

  const budgets = data?.data || [];
  const totalPlan = budgets.reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const totalRealized = budgets.reduce((sum, item) => sum + (item.category_id ? realizedByCategory.get(item.category_id) || 0 : 0), 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUnitId || !activeYearId) {
      toast.error("Pilih satu unit dan tahun ajaran sebelum membuat anggaran.");
      return;
    }
    create({
      resource: "finance_budgets",
      values: {
        ...form,
        category_id: form.category_id || null,
        account_id: form.account_id || null,
        program_id: form.program_id || null,
        unit_id: activeUnitId,
        academic_year_id: activeYearId,
        status: "draft",
      },
    }, {
      onSuccess: () => {
        toast.success("Pos anggaran berhasil ditambahkan.");
        setForm(initialForm);
        setIsOpen(false);
      },
    });
  };

  const changeStatus = (id: string, status: string) => update({ resource: "finance_budgets", id, values: { status } }, {
    onSuccess: () => toast.success(status === "approved" ? "Anggaran disetujui." : status === "locked" ? "Anggaran dikunci." : "Anggaran diajukan."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="RKAS & Anggaran"
        description="Susun rencana pendapatan dan belanja per unit, tahun ajaran, akun, dan sumber dana."
        action={<button onClick={() => setIsOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Tambah Pos Anggaran</button>}
      />
      <FinanceSectionNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Rencana Anggaran</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totalPlan)}</p><p className="mt-2 text-xs text-muted-foreground">{budgets.length} pos anggaran</p></div>
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Realisasi Tercatat</p><p className="mt-2 text-2xl font-bold text-rose-700">{formatCurrency(totalRealized)}</p><p className="mt-2 text-xs text-muted-foreground">{totalPlan > 0 ? ((totalRealized / totalPlan) * 100).toFixed(1) : 0}% terserap</p></div>
        <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">Sisa Anggaran</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(totalPlan - totalRealized)}</p><p className="mt-2 text-xs text-muted-foreground">Berdasarkan pengeluaran pada periode aktif</p></div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Memuat anggaran...</div> : budgets.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center"><Landmark className="mb-3 h-10 w-10 text-muted-foreground/30" /><p className="font-semibold">Belum ada RKAS pada periode ini</p><p className="mt-1 max-w-md text-sm text-muted-foreground">Tambahkan pos anggaran agar belanja sekolah dapat dikendalikan terhadap rencana yang disetujui.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Pos Anggaran</th><th className="px-4 py-3">Akun/Kategori</th><th className="px-4 py-3">Periode</th><th className="px-4 py-3 text-right">Rencana</th><th className="px-4 py-3 text-right">Realisasi</th><th className="px-4 py-3">Serapan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y">
                {budgets.map((budget) => {
                  const realized = budget.category_id ? realizedByCategory.get(budget.category_id) || 0 : 0;
                  const ratio = Number(budget.planned_amount) > 0 ? (realized / Number(budget.planned_amount)) * 100 : 0;
                  return (
                    <tr key={budget.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3"><p className="font-semibold">{budget.name}</p><p className="mt-1 text-xs text-muted-foreground">{budget.finance_programs?.name || budget.notes || "Tanpa program"}</p></td>
                      <td className="px-4 py-3"><p>{budget.finance_accounts ? `${budget.finance_accounts.code} - ${budget.finance_accounts.name}` : budget.finance_categories?.name || "Belum dipetakan"}</p><p className="mt-1 text-xs text-muted-foreground">{budget.finance_categories?.fund_type || "operational"}</p></td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{budget.period_type}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(budget.planned_amount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatCurrency(realized)}</td>
                      <td className="w-36 px-4 py-3"><div className="mb-1 text-xs font-semibold">{ratio.toFixed(1)}%</div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${ratio > 100 ? "bg-rose-600" : ratio > 80 ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></div></td>
                      <td className="px-4 py-3"><span className="rounded-full border px-2 py-1 text-xs font-semibold capitalize">{budget.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        {budget.status === "draft" && <button onClick={() => changeStatus(budget.id, "submitted")} title="Ajukan anggaran" className="rounded-md p-2 text-blue-700 hover:bg-blue-50"><Send className="h-4 w-4" /></button>}
                        {budget.status === "submitted" && <button onClick={() => changeStatus(budget.id, "approved")} title="Setujui anggaran" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>}
                        {budget.status === "approved" && <button onClick={() => changeStatus(budget.id, "locked")} title="Kunci anggaran" className="rounded-md p-2 text-violet-700 hover:bg-violet-50"><LockKeyhole className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">Tambah Pos Anggaran</h2><p className="mt-1 text-xs text-muted-foreground">Anggaran dibuat pada unit dan tahun ajaran yang sedang aktif.</p></div><button onClick={() => setIsOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
            <form onSubmit={submit} className="space-y-4 p-5">
              <label className="block"><span className="mb-1 block text-sm font-medium">Nama Pos Anggaran</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Contoh: Operasional pembelajaran semester 1" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="mb-1 block text-sm font-medium">Akun Beban</span><select value={form.account_id} onChange={(event) => setForm({ ...form, account_id: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih akun</option>{accounts?.data?.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></label>
                <label><span className="mb-1 block text-sm font-medium">Kategori Pengeluaran</span><select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih kategori</option>{categories?.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              </div>
              <label className="block"><span className="mb-1 block text-sm font-medium">Program/Kegiatan (Opsional)</span><select value={form.program_id} onChange={(event) => setForm({ ...form, program_id: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Tanpa program khusus</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="mb-1 block text-sm font-medium">Periode</span><select value={form.period_type} onChange={(event) => setForm({ ...form, period_type: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="annual">Tahunan</option><option value="semester">Semester</option><option value="monthly">Bulanan</option><option value="program">Program/Kegiatan</option></select></label>
                <label><span className="mb-1 block text-sm font-medium">Nilai Anggaran</span><input required min={1} type="number" value={form.planned_amount} onChange={(event) => setForm({ ...form, planned_amount: Number(event.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm" /></label>
              </div>
              <label className="block"><span className="mb-1 block text-sm font-medium">Catatan</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Tujuan, batasan, atau sumber dana" /></label>
              <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setIsOpen(false)} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={isCreating} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{isCreating ? "Menyimpan..." : "Simpan Draf"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
