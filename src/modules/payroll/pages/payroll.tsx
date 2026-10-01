/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Download, Loader2, Plus, RefreshCw, RotateCcw, Settings2, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { PayslipView } from "../components/PayslipView";
import { calcLabels, periodLabel, rupiah, runStatusLabels } from "../payroll-utils";

const db = supabaseClient as any;
type Tab = "runs" | "salaries" | "components";
const inputClass = "rounded-md border bg-background px-3 py-2 text-sm";

export const PayrollPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("runs");
  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
    { key: "runs", label: "Periode Gaji", icon: Wallet },
    { key: "salaries", label: "Gaji Pegawai", icon: Users },
    { key: "components", label: "Komponen Gaji", icon: Settings2 },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Penggajian" description="Hitung gaji bulanan dari absensi, izin, dan lembur; setujui, tandai dibayar, dan rilis slip ke portal pegawai." />
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>
      {tab === "runs" && <RunsTab />}
      {tab === "salaries" && <SalariesTab />}
      {tab === "components" && <ComponentsTab />}
    </div>
  );
};

const RunsTab: React.FC = () => {
  const { appName } = useSystemSettings();
  const [runs, setRuns] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(() => ({ month: new Date().toISOString().slice(0, 7), unit_id: "", work_days: "22" }));
  const [detail, setDetail] = useState<{ slip: any; lines: any[] } | null>(null);

  const loadRuns = useCallback(async () => {
    const { data, error } = await db.from("payroll_runs").select("*, units(name)").order("period_month", { ascending: false }).order("created_at", { ascending: false });
    if (error) toast.error("Periode gaji belum dapat dimuat", { description: error.message });
    setRuns(data || []);
  }, []);
  const loadSlips = useCallback(async (runId: string) => {
    const { data } = await db.from("payroll_slips").select("*").eq("run_id", runId).order("employee_name");
    setSlips(data || []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void loadRuns();
    void db.from("units").select("id, name").order("name").then(({ data }: any) => setUnits(data || []));
  }, [loadRuns]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load slips of the selected run
    if (selectedId) void loadSlips(selectedId); else setSlips([]);
  }, [selectedId, loadSlips]);

  const selected = runs.find((run) => run.id === selectedId) || null;
  const totals = useMemo(() => slips.reduce((acc, slip) => ({ gross: acc.gross + Number(slip.gross_amount), deductions: acc.deductions + Number(slip.deduction_amount), net: acc.net + Number(slip.net_amount) }), { gross: 0, deductions: 0, net: 0 }), [slips]);

  const createRun = async (event: React.FormEvent) => {
    event.preventDefault();
    const unit = units.find((item) => item.id === draft.unit_id);
    const title = `Gaji ${periodLabel(`${draft.month}-01`)}${unit ? ` · ${unit.name}` : ""}`;
    const { data, error } = await db.from("payroll_runs").insert({ period_month: `${draft.month}-01`, unit_id: draft.unit_id || null, work_days: Number(draft.work_days), title }).select("id").single();
    if (error) return toast.error("Periode belum dibuat", { description: error.message.includes("duplicate") ? "Periode untuk bulan dan unit ini sudah ada." : error.message });
    toast.success("Periode gaji dibuat. Klik Hitung untuk membuat slip.");
    await loadRuns();
    setSelectedId(data.id);
  };

  const call = async (fn: string, args: Record<string, unknown>, success: string) => {
    setBusy(true);
    const { data, error } = await db.rpc(fn, args);
    setBusy(false);
    if (error) { toast.error(error.message); return null; }
    toast.success(success.replace("{n}", String(data ?? "")));
    await loadRuns();
    if (selectedId) await loadSlips(selectedId);
    return data;
  };

  const openSlip = async (slip: any) => {
    const { data } = await db.from("payroll_slip_lines").select("*").eq("slip_id", slip.id).order("kind").order("sort_order");
    setDetail({ slip, lines: data || [] });
  };

  const exportRun = async () => {
    if (!selected) return;
    const ExcelJS = (await import("exceljs")).default;
    const { data: lines } = await db.from("payroll_slip_lines").select("slip_id, name, kind, amount").in("slip_id", slips.map((slip) => slip.id));
    const componentNames = [...new Set((lines || []).map((line: any) => `${line.kind === "earning" ? "+" : "−"} ${line.name}`))] as string[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rekap Gaji", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Nama", key: "name", width: 28 }, { header: "Jabatan", key: "position", width: 16 }, { header: "Unit", key: "unit", width: 12 },
      { header: "Hadir", key: "present", width: 7 }, { header: "Izin", key: "leave", width: 6 }, { header: "Alpa", key: "absent", width: 6 },
      { header: "Telat (mnt)", key: "late", width: 9 }, { header: "Lembur (jam)", key: "ot", width: 9 },
      ...componentNames.map((name) => ({ header: name, key: name, width: 18 })),
      { header: "Total Pendapatan", key: "gross", width: 18 }, { header: "Total Potongan", key: "deduction", width: 18 }, { header: "Gaji Bersih", key: "net", width: 18 },
    ];
    for (const slip of slips) {
      const row: Record<string, unknown> = { name: slip.employee_name, position: slip.position, unit: slip.unit_name, present: slip.present_days, leave: slip.leave_days, absent: slip.absent_days, late: slip.late_minutes, ot: Number(slip.overtime_hours), gross: Number(slip.gross_amount), deduction: Number(slip.deduction_amount), net: Number(slip.net_amount) };
      for (const line of (lines || []).filter((item: any) => item.slip_id === slip.id)) row[`${line.kind === "earning" ? "+" : "−"} ${line.name}`] = Number(line.amount);
      sheet.addRow(row);
    }
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column, index) => { if (index >= 8) column.numFmt = "#,##0"; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${selected.title.replace(/[\\/:*?"<>|]+/g, "_")}.xlsx`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-3">
        <form onSubmit={(event) => void createRun(event)} className="space-y-2 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Periode baru</p>
          <input type="month" value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} className={`${inputClass} w-full`} required aria-label="Bulan" />
          <select value={draft.unit_id} onChange={(e) => setDraft({ ...draft, unit_id: e.target.value })} className={`${inputClass} w-full`} aria-label="Unit"><option value="">Semua unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <label className="block text-xs text-muted-foreground">Hari kerja efektif<input type="number" min={1} max={31} value={draft.work_days} onChange={(e) => setDraft({ ...draft, work_days: e.target.value })} className={`${inputClass} mt-1 w-full`} required /></label>
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Buat periode</button>
        </form>
        <div className="space-y-2">
          {runs.map((run) => (
            <button key={run.id} type="button" onClick={() => setSelectedId(run.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedId === run.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"}`}>
              <p className="font-semibold">{run.title}</p>
              <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{run.units?.name || "Semua unit"} · {run.work_days} hari kerja</span><span className={`rounded-full px-2 py-0.5 font-semibold ${runStatusLabels[run.status]?.tone}`}>{runStatusLabels[run.status]?.label}</span></p>
            </button>
          ))}
          {runs.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada periode gaji.</p>}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        {!selected ? <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Pilih atau buat periode gaji.</p> : (
          <>
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{selected.title}</p>
                <p className="text-xs text-muted-foreground">{selected.generated_at ? `Dihitung ${new Date(selected.generated_at).toLocaleString("id-ID")}` : "Belum dihitung"}{selected.paid_at ? ` · dibayar ${new Date(selected.paid_at).toLocaleDateString("id-ID")}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status === "draft" && <button type="button" disabled={busy} onClick={() => void call("payroll_generate", { p_run_id: selected.id }, "{n} slip dihitung.")} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"><RefreshCw className="h-4 w-4" /> {selected.generated_at ? "Hitung ulang" : "Hitung"}</button>}
                {selected.status === "draft" && <button type="button" disabled={busy || !slips.length} onClick={() => confirm("Setujui periode ini? Slip akan tampil di portal pegawai.") && void call("payroll_set_status", { p_run_id: selected.id, p_status: "approved" }, "Periode disetujui; slip dirilis ke pegawai.")} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Setujui</button>}
                {selected.status === "approved" && <button type="button" disabled={busy} onClick={() => confirm("Tandai gaji periode ini sudah dibayar?") && void call("payroll_set_status", { p_run_id: selected.id, p_status: "paid" }, "Periode ditandai dibayar.")} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"><Banknote className="h-4 w-4" /> Tandai dibayar</button>}
                {selected.status === "approved" && <button type="button" disabled={busy} onClick={() => confirm("Buka kembali sebagai draf? Slip akan ditarik dari portal pegawai.") && void call("payroll_set_status", { p_run_id: selected.id, p_status: "draft" }, "Periode dibuka kembali sebagai draf.")} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Buka kembali</button>}
                {slips.length > 0 && <button type="button" onClick={() => void exportRun()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium"><Download className="h-4 w-4" /> Excel</button>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Total pendapatan</p><p className="font-bold">{rupiah(totals.gross)}</p></div>
              <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Total potongan</p><p className="font-bold">{rupiah(totals.deductions)}</p></div>
              <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Total dibayarkan ({slips.length} pegawai)</p><p className="font-bold">{rupiah(totals.net)}</p></div>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3 text-center">Hadir/Izin/Alpa</th><th className="px-4 py-3 text-center">Telat</th><th className="px-4 py-3 text-center">Lembur</th><th className="px-4 py-3 text-right">Pendapatan</th><th className="px-4 py-3 text-right">Potongan</th><th className="px-4 py-3 text-right">Bersih</th></tr></thead>
                  <tbody className="divide-y">
                    {slips.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Belum ada slip. {selected.status === "draft" ? "Klik Hitung." : ""}</td></tr>}
                    {slips.map((slip) => (
                      <tr key={slip.id} onClick={() => void openSlip(slip)} className="cursor-pointer hover:bg-muted/30">
                        <td className="px-4 py-3"><p className="font-medium">{slip.employee_name}</p><p className="text-xs text-muted-foreground">{slip.position || "-"} · {slip.unit_name || "-"}</p></td>
                        <td className="px-4 py-3 text-center">{slip.present_days}/{slip.leave_days}/<span className={slip.absent_days ? "text-rose-700" : ""}>{slip.absent_days}</span></td>
                        <td className="px-4 py-3 text-center">{slip.late_minutes} m</td>
                        <td className="px-4 py-3 text-center">{Number(slip.overtime_hours).toLocaleString("id-ID")} j</td>
                        <td className="px-4 py-3 text-right">{rupiah(slip.gross_amount)}</td>
                        <td className="px-4 py-3 text-right text-rose-700">{rupiah(slip.deduction_amount)}</td>
                        <td className="px-4 py-3 text-right font-bold">{rupiah(slip.net_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {detail && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="slip-title">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="slip-title" className="text-lg font-semibold">{detail.slip.employee_name}</h2><p className="text-xs text-muted-foreground">{selected.title}</p></div><button type="button" onClick={() => setDetail(null)} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <div className="overflow-y-auto p-5"><PayslipView slip={detail.slip} lines={detail.lines} run={selected} schoolName={appName} /></div>
          </div>
        </div>
      )}
    </section>
  );
};

const SalariesTab: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [employeeResult, componentResult, itemResult] = await Promise.all([
      db.from("employees").select("id, full_name, position, units!employees_unit_id_fkey(name)").eq("status", "active").order("full_name"),
      db.from("payroll_components").select("*").eq("is_active", true).order("kind").order("sort_order"),
      db.from("employee_salary_items").select("employee_id, component_id, amount, is_active"),
    ]);
    setEmployees(employeeResult.data || []);
    setComponents(componentResult.data || []);
    setItems(itemResult.data || []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  const choose = (id: string) => {
    setEmployeeId(id);
    setValues(Object.fromEntries(items.filter((item) => item.employee_id === id && item.is_active).map((item) => [item.component_id, String(item.amount)])));
  };
  const basicId = components.find((component) => component.code === "gaji_pokok")?.id;
  const baseOf = (id: string) => items.find((item) => item.employee_id === id && item.component_id === basicId && item.is_active)?.amount;

  const save = async () => {
    if (!employeeId) return;
    setSaving(true);
    const upserts = components.filter((component) => values[component.id] !== undefined && values[component.id] !== "")
      .map((component) => ({ employee_id: employeeId, component_id: component.id, amount: Number(values[component.id]), is_active: true, updated_at: new Date().toISOString() }));
    const cleared = components.filter((component) => (values[component.id] ?? "") === "").map((component) => component.id);
    const results = await Promise.all([
      upserts.length ? db.from("employee_salary_items").upsert(upserts, { onConflict: "employee_id,component_id" }) : Promise.resolve({ error: null }),
      cleared.length ? db.from("employee_salary_items").delete().eq("employee_id", employeeId).in("component_id", cleared) : Promise.resolve({ error: null }),
    ]);
    setSaving(false);
    const error = results.find((result: any) => result.error)?.error;
    if (error) return toast.error("Gaji belum tersimpan", { description: error.message });
    toast.success("Pengaturan gaji pegawai tersimpan.");
    void load();
  };

  const selected = employees.find((employee) => employee.id === employeeId);
  return (
    <section className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-xl border bg-card p-2">
        {employees.map((employee) => (
          <button key={employee.id} type="button" onClick={() => choose(employee.id)} className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${employeeId === employee.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <span><span className="block font-medium">{employee.full_name}</span><span className="text-xs text-muted-foreground">{employee.position || "-"} · {employee.units?.name || "-"}</span></span>
            <span className={`text-xs ${baseOf(employee.id) ? "text-muted-foreground" : "text-amber-700"}`}>{baseOf(employee.id) ? rupiah(baseOf(employee.id)) : "Belum diatur"}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4">
        {!selected ? <p className="p-8 text-center text-sm text-muted-foreground">Pilih pegawai untuk mengatur gaji pokok dan tunjangannya.</p> : (
          <div className="space-y-4">
            <div><p className="font-semibold">{selected.full_name}</p><p className="text-xs text-muted-foreground">Kosongkan nilai untuk memakai tarif default komponen.</p></div>
            <div className="divide-y rounded-lg border">
              {components.map((component) => (
                <label key={component.id} className="grid items-center gap-2 px-3 py-2 text-sm sm:grid-cols-[1fr_12rem]">
                  <span><span className="font-medium">{component.name}</span><span className="block text-xs text-muted-foreground">{component.kind === "earning" ? "Pendapatan" : "Potongan"} · {calcLabels[component.calc]} · default {component.calc === "percent_of_base" ? `${component.default_amount}%` : rupiah(component.default_amount)}</span></span>
                  <input type="number" min={0} step={component.calc === "percent_of_base" ? "0.01" : "1000"} value={values[component.id] ?? ""} placeholder="Default" onChange={(e) => setValues({ ...values, [component.id]: e.target.value })} className={`${inputClass} text-right`} aria-label={component.name} />
                </label>
              ))}
            </div>
            <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button></div>
          </div>
        )}
      </div>
    </section>
  );
};

const ComponentsTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState({ name: "", kind: "earning", calc: "fixed", default_amount: "0" });
  const load = useCallback(async () => {
    const { data } = await db.from("payroll_components").select("*").order("kind").order("sort_order");
    setRows(data || []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  const update = async (row: any, values: Record<string, unknown>) => {
    const { error } = await db.from("payroll_components").update({ ...values, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) return toast.error(error.message);
    void load();
  };
  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const { error } = await db.from("payroll_components").insert({ code: `${code}_${Date.now().toString(36)}`, name: draft.name.trim(), kind: draft.kind, calc: draft.calc, default_amount: Number(draft.default_amount), sort_order: rows.length + 1 });
    if (error) return toast.error("Komponen belum tersimpan", { description: error.message });
    setDraft({ ...draft, name: "", default_amount: "0" });
    void load();
  };

  return (
    <section className="space-y-4">
      <form onSubmit={(event) => void add(event)} className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-[1fr_9rem_14rem_9rem_auto]">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nama komponen (mis. Tunjangan Wali Kelas)" className={inputClass} required />
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={inputClass}><option value="earning">Pendapatan</option><option value="deduction">Potongan</option></select>
        <select value={draft.calc} onChange={(e) => setDraft({ ...draft, calc: e.target.value })} className={inputClass}>{Object.entries(calcLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input type="number" min={0} value={draft.default_amount} onChange={(e) => setDraft({ ...draft, default_amount: e.target.value })} className={inputClass} aria-label="Tarif default" />
        <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Tambah</button>
      </form>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Komponen</th><th className="px-4 py-3">Cara hitung</th><th className="px-4 py-3 text-right">Tarif default</th><th className="px-4 py-3 text-right">Status</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className={row.is_active ? "" : "opacity-50"}>
                <td className="px-4 py-2.5"><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.kind === "earning" ? "Pendapatan" : "Potongan"}</p></td>
                <td className="px-4 py-2.5 text-muted-foreground">{calcLabels[row.calc]}</td>
                <td className="px-4 py-2.5 text-right">
                  <input type="number" min={0} step={row.calc === "percent_of_base" ? "0.01" : "1000"} defaultValue={row.default_amount} onBlur={(e) => Number(e.target.value) !== Number(row.default_amount) && void update(row, { default_amount: Number(e.target.value) })} className={`${inputClass} w-36 text-right`} aria-label={`Tarif ${row.name}`} />
                  {row.calc === "percent_of_base" && <span className="ml-1 text-xs text-muted-foreground">%</span>}
                </td>
                <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => void update(row, { is_active: !row.is_active })} className="text-xs font-semibold text-primary hover:underline">{row.is_active ? "Nonaktifkan" : "Aktifkan"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
