import React, { useMemo, useState } from "react";
import { useCreate, useList, useUpdate } from "@refinedev/core";
import { BadgeDollarSign, CheckCircle2, Layers3, Plus, Power, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { belongsToFinanceUnit, formatCurrency } from "../finance-utils";

type Category = { id: string; name: string; unit_id?: string | null };
type Program = { id: string; unit_id: string; academic_year_id?: string | null; category_id?: string | null; code: string; name: string; program_type: string; description?: string | null; is_active: boolean; units?: { name?: string | null } | null };
type FeeRate = { id: string; unit_id: string; academic_year_id: string; category_id: string; program_id?: string | null; name: string; grade_level?: number | null; audience: string; billing_cycle: string; amount: number; notes?: string | null; is_active: boolean; units?: { name?: string | null } | null; finance_categories?: { name?: string | null } | null; finance_programs?: { name?: string | null } | null };

const emptyProgram = { code: "", name: "", program_type: "additional", category_id: "", description: "" };
const emptyRate = { name: "", category_id: "", program_id: "", grade_level: "", audience: "all", billing_cycle: "once", amount: 0, notes: "" };

const programTypeLabel: Record<string, string> = {
  extracurricular: "Ekstrakurikuler", additional: "Program Tambahan", donation: "Donasi/Infak",
  facility: "Pemanfaatan Fasilitas", grant: "Hibah", other: "Lainnya",
};
const cycleLabel: Record<string, string> = { once: "Sekali", monthly: "Bulanan", semester: "Semester", annual: "Tahunan", program: "Per Program" };

export const FinanceTariffs: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [tab, setTab] = useState<"rates" | "programs">("rates");
  const [programOpen, setProgramOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [programForm, setProgramForm] = useState(emptyProgram);
  const [rateForm, setRateForm] = useState(emptyRate);

  const { data: categoriesData } = useList<Category>({
    resource: "finance_categories",
    filters: [{ field: "type", operator: "eq", value: "income" }, { field: "is_active", operator: "eq", value: true }],
    pagination: { mode: "off" },
  });
  const { data: programsData, refetch: refetchPrograms } = useList<Program>({
    resource: "finance_programs", meta: { select: "*, units(name)" }, pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const { data: ratesData, refetch: refetchRates } = useList<FeeRate>({
    resource: "finance_fee_rates", meta: { select: "*, units(name), finance_categories(name), finance_programs(name)" }, pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update } = useUpdate();

  const categories = useMemo(() => (categoriesData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId)), [categoriesData?.data, activeUnitId]);
  const programs = useMemo(() => (programsData?.data || []).filter((item) => (!activeUnitId || item.unit_id === activeUnitId) && (!activeYearId || !item.academic_year_id || item.academic_year_id === activeYearId)), [programsData?.data, activeUnitId, activeYearId]);
  const rates = useMemo(() => (ratesData?.data || []).filter((item) => (!activeUnitId || item.unit_id === activeUnitId) && (!activeYearId || item.academic_year_id === activeYearId)), [ratesData?.data, activeUnitId, activeYearId]);

  const requireScope = () => {
    if (!activeUnitId || !activeYearId) {
      toast.error("Pilih satu unit dan tahun ajaran sebelum menambah master keuangan.");
      return false;
    }
    return true;
  };

  const submitProgram = (event: React.FormEvent) => {
    event.preventDefault();
    if (!requireScope()) return;
    create({ resource: "finance_programs", values: { ...programForm, unit_id: activeUnitId, academic_year_id: activeYearId, category_id: programForm.category_id || null, is_active: true } }, {
      onSuccess: () => { toast.success("Program pendapatan ditambahkan."); setProgramForm(emptyProgram); setProgramOpen(false); refetchPrograms(); },
      onError: (error) => toast.error(error.message || "Program gagal disimpan."),
    });
  };

  const submitRate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!requireScope()) return;
    if (!rateForm.category_id || rateForm.amount < 0) return toast.error("Kategori dan nominal tarif wajib valid.");
    create({ resource: "finance_fee_rates", values: { ...rateForm, unit_id: activeUnitId, academic_year_id: activeYearId, program_id: rateForm.program_id || null, grade_level: rateForm.grade_level ? Number(rateForm.grade_level) : null, is_active: true } }, {
      onSuccess: () => { toast.success("Tarif unit berhasil ditambahkan."); setRateForm(emptyRate); setRateOpen(false); refetchRates(); },
      onError: (error) => toast.error(error.message || "Tarif gagal disimpan."),
    });
  };

  const toggleActive = (resource: string, id: string, isActive: boolean) => update({ resource, id, values: { is_active: !isActive } }, {
    onSuccess: () => { toast.success(isActive ? "Master dinonaktifkan." : "Master diaktifkan kembali."); refetchPrograms(); refetchRates(); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Master Tarif & Program" description="Tetapkan biaya berbeda untuk setiap unit, tahun ajaran, jenjang, dan program sekolah." action={(
        <button onClick={() => { if (!requireScope()) return; if (tab === "rates") setRateOpen(true); else setProgramOpen(true); }} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> {tab === "rates" ? "Tambah Tarif" : "Tambah Program"}</button>
      )} />
      <FinanceSectionNav />

      <div className="inline-flex rounded-md border bg-card p-1">
        <button onClick={() => setTab("rates")} className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold ${tab === "rates" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><BadgeDollarSign className="h-4 w-4" /> Tarif Biaya</button>
        <button onClick={() => setTab("programs")} className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold ${tab === "programs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Layers3 className="h-4 w-4" /> Program Pendapatan</button>
      </div>

      {tab === "rates" ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Tarif</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Kategori/Program</th><th className="px-4 py-3">Sasaran</th><th className="px-4 py-3 text-right">Nominal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y">{rates.map((rate) => <tr key={rate.id} className="hover:bg-muted/30"><td className="px-4 py-3"><p className="font-semibold">{rate.name}</p><p className="mt-1 text-xs text-muted-foreground">{cycleLabel[rate.billing_cycle] || rate.billing_cycle}</p></td><td className="px-4 py-3">{rate.units?.name || "-"}</td><td className="px-4 py-3"><p>{rate.finance_categories?.name || "-"}</p><p className="mt-1 text-xs text-muted-foreground">{rate.finance_programs?.name || "Tanpa program"}</p></td><td className="px-4 py-3"><p className="capitalize">{rate.audience === "all" ? "Semua siswa" : rate.audience}</p><p className="mt-1 text-xs text-muted-foreground">{rate.grade_level ? `Kelas ${rate.grade_level}` : "Semua kelas"}</p></td><td className="px-4 py-3 text-right font-bold">{formatCurrency(rate.amount)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${rate.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{rate.is_active ? "Aktif" : "Nonaktif"}</span></td><td className="px-4 py-3 text-right"><button onClick={() => toggleActive("finance_fee_rates", rate.id, rate.is_active)} title={rate.is_active ? "Nonaktifkan tarif" : "Aktifkan tarif"} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Power className="h-4 w-4" /></button></td></tr>)}</tbody>
          </table></div>
          {rates.length === 0 && <div className="p-12 text-center"><BadgeDollarSign className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-semibold">Belum ada tarif pada konteks ini</p><p className="mt-1 text-sm text-muted-foreground">Pilih satu unit dan tahun ajaran, lalu buat tarif SPP, program, atau ekstrakurikuler.</p></div>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <div key={program.id} className="rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-bold text-primary">{program.code}</p><h3 className="mt-1 truncate font-bold">{program.name}</h3><p className="mt-1 text-xs text-muted-foreground">{program.units?.name || "-"} · {programTypeLabel[program.program_type] || program.program_type}</p></div><button onClick={() => toggleActive("finance_programs", program.id, program.is_active)} title={program.is_active ? "Nonaktifkan program" : "Aktifkan program"} className="rounded-md border p-2 text-muted-foreground hover:bg-muted"><Power className="h-4 w-4" /></button></div><p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{program.description || "Tanpa keterangan tambahan."}</p><div className="mt-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${program.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{program.is_active ? "Aktif" : "Nonaktif"}</span></div></div>)}{programs.length === 0 && <div className="col-span-full rounded-lg border bg-card p-12 text-center"><Layers3 className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-semibold">Belum ada program pendapatan</p></div>}</div>
      )}

      {programOpen && <Modal title="Tambah Program Pendapatan" onClose={() => setProgramOpen(false)}><form onSubmit={submitProgram} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Kode Program"><input required value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value.toUpperCase() })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="EKSKUL-ROBOTIK" /></Field><Field label="Jenis Program"><select value={programForm.program_type} onChange={(e) => setProgramForm({ ...programForm, program_type: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">{Object.entries(programTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div><Field label="Nama Program"><input required value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Robotik Elementary" /></Field><Field label="Kategori Pemasukan Default"><select value={programForm.category_id} onChange={(e) => setProgramForm({ ...programForm, category_id: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Tanpa kategori default</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Keterangan"><textarea rows={3} value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></Field><SubmitButtons loading={isCreating} onCancel={() => setProgramOpen(false)} /></form></Modal>}

      {rateOpen && <Modal title="Tambah Tarif Unit" onClose={() => setRateOpen(false)}><form onSubmit={submitRate} className="space-y-4"><Field label="Nama Tarif"><input required value={rateForm.name} onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="SPP Bulanan Kelas 1" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Kategori"><select required value={rateForm.category_id} onChange={(e) => setRateForm({ ...rateForm, category_id: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Program (Opsional)"><select value={rateForm.program_id} onChange={(e) => setRateForm({ ...rateForm, program_id: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Tanpa program</option>{programs.filter((program) => program.is_active).map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Kelas/Jenjang"><input type="number" min="1" value={rateForm.grade_level} onChange={(e) => setRateForm({ ...rateForm, grade_level: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Semua kelas" /></Field><Field label="Sasaran"><select value={rateForm.audience} onChange={(e) => setRateForm({ ...rateForm, audience: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="all">Semua</option><option value="internal">Siswa Internal</option><option value="external">Peserta Eksternal</option></select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Siklus"><select value={rateForm.billing_cycle} onChange={(e) => setRateForm({ ...rateForm, billing_cycle: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">{Object.entries(cycleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Nominal"><input required type="number" min="0" value={rateForm.amount} onChange={(e) => setRateForm({ ...rateForm, amount: Number(e.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm" /></Field></div><Field label="Catatan"><input value={rateForm.notes} onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></Field><SubmitButtons loading={isCreating} onCancel={() => setRateOpen(false)} /></form></Modal>}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span>{children}</label>;
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-background shadow-xl"><div className="sticky top-0 flex items-center justify-between border-b bg-background px-5 py-4"><h2 className="font-bold">{title}</h2><button onClick={onClose} className="rounded-md p-2 hover:bg-muted" aria-label="Tutup"><X className="h-4 w-4" /></button></div><div className="p-5">{children}</div></div></div>;
const SubmitButtons: React.FC<{ loading: boolean; onCancel: () => void }> = ({ loading, onCancel }) => <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan"}</button></div>;
