/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Gauge, Loader2, Pencil, Plus, RotateCcw, Save, Settings2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { formatAdmissionDate } from "../admissions-config";
import { classTargetLabel, getQuotaUsage, isAdmissionQuotaSchemaError } from "../quota-utils";

const db = supabaseClient as any;
const emptyBatch = { unit_id: "", academic_year_id: "", name: "Gelombang 1", registration_start_at: "", registration_end_at: "", registration_fee: "0", announcement_at: "", notes: "", status: "draft" };
type QuotaDraft = { new: string; transfer: string; waitlist: boolean };
type QuotaDrafts = Record<string, QuotaDraft>;

const toLocalDateTime = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export const AdmissionsSettings: React.FC = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [form, setForm] = useState(emptyBatch);
  const [quotaDrafts, setQuotaDrafts] = useState<QuotaDrafts>({});
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparingClasses, setPreparingClasses] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [policy, setPolicy] = useState({ contact_name: "", contact_phone: "", selection_policy: "", announcement_message: "", is_public: true });

  const load = async () => {
    setLoading(true);
    const [u, y, c, b, q, a] = await Promise.all([
      db.from("units").select("id,name").order("name"),
      db.from("academic_years").select("id,name,is_active,start_date").order("start_date", { ascending: false }),
      db.from("classes").select("id,name,grade_level,capacity,unit_id,academic_year_id").order("grade_level").order("name"),
      db.from("admission_batches").select("*,units(name),academic_years(name)").order("registration_start_at", { ascending: false }),
      db.from("admission_quota_plans").select("*,classes(name,grade_level,capacity),admission_batches(name,unit_id,academic_year_id,status)").order("created_at"),
      db.from("admissions_applicants").select("id,batch_id,desired_class_id,entry_type,workflow_status,status,archived_at"),
    ]);
    setUnits(u.data || []); setYears(y.data || []); setClasses(c.data || []); setBatches(b.data || []); setPlans(q.data || []); setApplicants(a.data || []);
    setSchemaMissing(Boolean(b.error || q.error) && (isAdmissionQuotaSchemaError(b.error) || isAdmissionQuotaSchemaError(q.error)));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!form.unit_id || !form.academic_year_id) return;
    db.from("admission_settings").select("*").eq("unit_id", form.unit_id).eq("academic_year_id", form.academic_year_id).maybeSingle().then(({ data }: any) => setPolicy(data ? { contact_name: data.contact_name || "", contact_phone: data.contact_phone || "", selection_policy: data.selection_policy || "", announcement_message: data.announcement_message || "", is_public: data.is_public } : { contact_name: "", contact_phone: "", selection_policy: "", announcement_message: "", is_public: true }));
  }, [form.unit_id, form.academic_year_id]);

  const targetClasses = useMemo(() => classes.filter((row) => row.unit_id === form.unit_id && row.academic_year_id === form.academic_year_id), [classes, form.unit_id, form.academic_year_id]);
  const sourceYear = useMemo(() => years.find((year) => year.id !== form.academic_year_id && classes.some((row) => row.unit_id === form.unit_id && row.academic_year_id === year.id)), [years, classes, form.unit_id, form.academic_year_id]);
  const totals = useMemo(() => plans.reduce((sum, plan) => { const usage = getQuotaUsage(plan, applicants); return { quota: sum.quota + Number(plan.quota), reserved: sum.reserved + usage.reserved, remaining: sum.remaining + usage.remaining }; }, { quota: 0, reserved: 0, remaining: 0 }), [plans, applicants]);
  const draftTotal = targetClasses.reduce((sum, row) => sum + Number(quotaDrafts[row.id]?.new || 0) + Number(quotaDrafts[row.id]?.transfer || 0), 0);
  const hasOverCapacity = targetClasses.some((row) => row.capacity && Number(quotaDrafts[row.id]?.new || 0) + Number(quotaDrafts[row.id]?.transfer || 0) > row.capacity);
  const input = "w-full h-10 px-3 border rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500";

  const resetEditor = () => { setForm(emptyBatch); setQuotaDrafts({}); setEditingBatchId(null); setPolicy({ contact_name: "", contact_phone: "", selection_policy: "", announcement_message: "", is_public: true }); };
  const changeScope = (key: "unit_id" | "academic_year_id", value: string) => { setForm((current) => ({ ...current, [key]: value })); setQuotaDrafts({}); setEditingBatchId(null); setPolicy({ contact_name: "", contact_phone: "", selection_policy: "", announcement_message: "", is_public: true }); };
  const updateQuota = (classId: string, key: keyof QuotaDraft, value: string | boolean) => setQuotaDrafts((current) => ({ ...current, [classId]: { new: current[classId]?.new || "", transfer: current[classId]?.transfer || "", waitlist: current[classId]?.waitlist ?? true, [key]: value } }));
  const fillClassCapacity = () => setQuotaDrafts(Object.fromEntries(targetClasses.map((row) => [row.id, { new: String(row.capacity || ""), transfer: "", waitlist: true }])));
  const prepareTargetClasses = async () => {
    if (!form.unit_id || !form.academic_year_id) return;
    setPreparingClasses(true);
    const { data, error } = await db.rpc("admission_prepare_target_classes", { p_unit_id: form.unit_id, p_academic_year_id: form.academic_year_id, p_source_academic_year_id: sourceYear?.id || null });
    setPreparingClasses(false);
    if (error) { toast.error(`Struktur kelas belum dapat disiapkan: ${error.message}`); return; }
    toast.success(Number(data) > 0 ? `${data} kelas tujuan berhasil disiapkan.` : "Struktur kelas tujuan sudah tersedia.");
    await load();
  };

  const editBatch = (row: any) => {
    const matchingClasses = classes.filter((item) => item.unit_id === row.unit_id && item.academic_year_id === row.academic_year_id);
    const drafts = Object.fromEntries(matchingClasses.map((item) => {
      const newPlan = plans.find((plan) => plan.batch_id === row.id && plan.class_id === item.id && plan.entry_type === "new");
      const transferPlan = plans.find((plan) => plan.batch_id === row.id && plan.class_id === item.id && plan.entry_type === "transfer");
      return [item.id, { new: newPlan ? String(newPlan.quota) : "", transfer: transferPlan ? String(transferPlan.quota) : "", waitlist: newPlan?.allow_waitlist ?? transferPlan?.allow_waitlist ?? true }];
    }));
    setEditingBatchId(row.id);
    setForm({ unit_id: row.unit_id, academic_year_id: row.academic_year_id, name: row.name, registration_start_at: toLocalDateTime(row.registration_start_at), registration_end_at: toLocalDateTime(row.registration_end_at), registration_fee: String(row.registration_fee || 0), announcement_at: toLocalDateTime(row.announcement_at), notes: row.notes || "", status: row.status });
    setQuotaDrafts(drafts);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveConfiguration = async () => {
    if (!form.unit_id || !form.academic_year_id || !form.name.trim() || !form.registration_start_at || !form.registration_end_at) { toast.error("Lengkapi unit, tahun ajaran, nama, dan periode pendaftaran."); return; }
    if (new Date(form.registration_end_at) <= new Date(form.registration_start_at)) { toast.error("Waktu penutupan harus setelah pembukaan."); return; }
    if (targetClasses.length === 0) { toast.error("Belum ada kelas pada unit dan tahun ajaran ini. Buat kelas terlebih dahulu."); return; }
    if (draftTotal < 1) { toast.error("Isi sedikitnya satu kuota siswa baru atau pindahan."); return; }
    if (hasOverCapacity) { toast.error("Ada total kuota yang melebihi kapasitas kelas."); return; }
    const quotas = targetClasses.flatMap((row) => ([
      { class_id: row.id, entry_type: "new", quota: Number(quotaDrafts[row.id]?.new || 0), allow_waitlist: quotaDrafts[row.id]?.waitlist ?? true, is_open: true },
      { class_id: row.id, entry_type: "transfer", quota: Number(quotaDrafts[row.id]?.transfer || 0), allow_waitlist: quotaDrafts[row.id]?.waitlist ?? true, is_open: true },
    ]));
    setSaving(true);
    const batchPayload = { ...form, registration_start_at: new Date(form.registration_start_at).toISOString(), registration_end_at: new Date(form.registration_end_at).toISOString(), announcement_at: form.announcement_at ? new Date(form.announcement_at).toISOString() : null };
    const { error } = await db.rpc("admission_save_batch_with_quotas", { p_batch_id: editingBatchId, p_batch: batchPayload, p_quotas: quotas, p_policy: policy });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(editingBatchId ? "Gelombang dan seluruh kuota diperbarui." : "Gelombang dan seluruh kuota berhasil dibuat sekaligus."); resetEditor(); await load(); }
  };
  const updateBatchStatus = async (id: string, status: string) => { const { error } = await db.from("admission_batches").update({ status }).eq("id", id); if (error) toast.error(error.message); else { toast.success("Status gelombang diperbarui."); await load(); } };

  if (loading) return <div className="py-28 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  return <div className="space-y-6">
    <PageHeader title="Pengaturan SPMB" description="Buat gelombang, periode, biaya, dan kuota seluruh kelas dalam satu kali penyimpanan." />
    {schemaMissing && <div className="border border-amber-300 bg-amber-50 rounded-md p-4 flex gap-3 text-amber-950"><AlertTriangle className="w-5 h-5 shrink-0" /><div><p className="font-bold">Skema kuota SPMB belum aktif</p><p className="text-sm mt-1">Jalankan migrasi <code>20260811090000_admission_class_quotas.sql</code> sebelum menyimpan konfigurasi.</p></div></div>}
    <div className="grid sm:grid-cols-3 gap-4"><Metric icon={UsersRound} value={totals.quota} label="Daya tampung terencana" /><Metric icon={CheckCircle2} value={totals.reserved} label="Kursi sudah terisi" /><Metric icon={Gauge} value={totals.remaining} label="Kursi masih tersedia" /></div>

    <section className="bg-white border rounded-lg overflow-hidden">
      <div className="p-5 sm:p-6 border-b flex items-start justify-between gap-4"><SectionTitle icon={editingBatchId ? Pencil : Plus} title={editingBatchId ? "Ubah Konfigurasi Gelombang" : "Buat Gelombang dan Kuota"} detail="Isi konteks penerimaan dan pembagian kursi, kemudian simpan satu kali." />{editingBatchId && <button onClick={resetEditor} className="h-10 px-3 border rounded-md text-sm font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4" />Batal ubah</button>}</div>
      <div className="p-5 sm:p-6"><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Field label="Unit *"><select className={input} value={form.unit_id} onChange={(e) => changeScope("unit_id", e.target.value)} disabled={Boolean(editingBatchId)}><option value="">Pilih unit</option>{units.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Tahun ajaran *"><select className={input} value={form.academic_year_id} onChange={(e) => changeScope("academic_year_id", e.target.value)} disabled={Boolean(editingBatchId)}><option value="">Pilih tahun</option>{years.map((x) => <option key={x.id} value={x.id}>{x.name}{x.is_active ? " · aktif" : ""}</option>)}</select></Field>
        <Field label="Nama gelombang *"><input className={input} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></Field>
        <Field label="Status"><select className={input} value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}><option value="draft">Draf</option><option value="published">Diterbitkan ke portal</option><option value="closed">Ditutup</option></select></Field>
        <Field label="Mulai pendaftaran *"><input type="datetime-local" className={input} value={form.registration_start_at} onChange={(e) => setForm((v) => ({ ...v, registration_start_at: e.target.value }))} /></Field>
        <Field label="Tutup pendaftaran *"><input type="datetime-local" className={input} value={form.registration_end_at} onChange={(e) => setForm((v) => ({ ...v, registration_end_at: e.target.value }))} /></Field>
        <Field label="Rencana pengumuman"><input type="datetime-local" className={input} value={form.announcement_at} onChange={(e) => setForm((v) => ({ ...v, announcement_at: e.target.value }))} /></Field>
        <Field label="Biaya pendaftaran"><input type="number" min="0" className={input} value={form.registration_fee} onChange={(e) => setForm((v) => ({ ...v, registration_fee: e.target.value }))} /></Field>
      </div></div>

      <div className="border-t p-5 sm:p-6"><SectionTitle icon={Settings2} title="Kontak dan Kebijakan Portal" detail="Tersimpan bersama gelombang dan kuota; tidak perlu penyimpanan terpisah." /><div className="grid md:grid-cols-2 gap-4 mt-5"><Field label="Nama kontak panitia"><input className={input} value={policy.contact_name} onChange={(e) => setPolicy((v) => ({ ...v, contact_name: e.target.value }))} /></Field><Field label="WhatsApp panitia"><input className={input} value={policy.contact_phone} onChange={(e) => setPolicy((v) => ({ ...v, contact_phone: e.target.value }))} /></Field><label className="text-sm font-semibold">Kebijakan seleksi<textarea className="w-full min-h-20 mt-2 p-3 border rounded-md" value={policy.selection_policy} onChange={(e) => setPolicy((v) => ({ ...v, selection_policy: e.target.value }))} /></label><label className="text-sm font-semibold">Pesan pengumuman<textarea className="w-full min-h-20 mt-2 p-3 border rounded-md" value={policy.announcement_message} onChange={(e) => setPolicy((v) => ({ ...v, announcement_message: e.target.value }))} /></label><label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={policy.is_public} onChange={(e) => setPolicy((v) => ({ ...v, is_public: e.target.checked }))} />Tampilkan kontak dan kebijakan di portal pendaftaran</label></div></div>

      <div className="border-t"><div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="font-bold">Pembagian Kuota per Kelas</h3><p className="text-sm text-slate-600 mt-1">Total Siswa Baru + Pindahan tidak boleh melampaui kapasitas rombongan belajar.</p></div><button onClick={fillClassCapacity} disabled={targetClasses.length === 0} className="h-9 px-3 border rounded-md text-sm font-semibold disabled:opacity-40">Isi kapasitas sebagai siswa baru</button></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-y"><tr><th className="text-left px-5 py-3">Kelas tujuan</th><th className="text-left px-5 py-3">Kapasitas kelas</th><th className="text-left px-5 py-3 min-w-36">Siswa baru</th><th className="text-left px-5 py-3 min-w-36">Pindahan</th><th className="text-left px-5 py-3">Total alokasi</th><th className="text-left px-5 py-3">Daftar tunggu</th></tr></thead><tbody className="divide-y">{targetClasses.map((row) => { const allocated = Number(quotaDrafts[row.id]?.new || 0) + Number(quotaDrafts[row.id]?.transfer || 0); const over = row.capacity && allocated > row.capacity; return <tr key={row.id} className={over ? "bg-rose-50" : ""}><td className="px-5 py-4 font-bold">{classTargetLabel(row)}</td><td className="px-5 py-4">{row.capacity || <span className="text-amber-700">Belum diatur</span>}</td><td className="px-5 py-3"><input aria-label={`Kuota siswa baru ${row.name}`} type="number" min="0" max={row.capacity || undefined} className="w-full h-10 px-3 border rounded-md" value={quotaDrafts[row.id]?.new || ""} onChange={(e) => updateQuota(row.id, "new", e.target.value)} placeholder="0" /></td><td className="px-5 py-3"><input aria-label={`Kuota pindahan ${row.name}`} type="number" min="0" max={row.capacity || undefined} className="w-full h-10 px-3 border rounded-md" value={quotaDrafts[row.id]?.transfer || ""} onChange={(e) => updateQuota(row.id, "transfer", e.target.value)} placeholder="0" /></td><td className={`px-5 py-4 font-bold ${over ? "text-rose-700" : ""}`}>{allocated}{row.capacity ? ` / ${row.capacity}` : ""}{over && <p className="text-xs mt-1">Melebihi kapasitas</p>}</td><td className="px-5 py-4"><label className="inline-flex items-center gap-2 font-semibold"><input type="checkbox" checked={quotaDrafts[row.id]?.waitlist ?? true} onChange={(e) => updateQuota(row.id, "waitlist", e.target.checked)} />Diizinkan</label></td></tr>; })}{!form.unit_id || !form.academic_year_id ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Pilih unit dan tahun ajaran untuk menampilkan kelas.</td></tr> : targetClasses.length === 0 && <tr><td colSpan={6} className="p-8 text-center"><p className="font-bold text-slate-900">Struktur kelas {years.find((year) => year.id === form.academic_year_id)?.name} belum tersedia</p><p className="text-sm text-slate-600 mt-2">Siapkan kelas tujuan agar kuota Siswa Baru dan Pindahan dapat diisi di sini.</p><button onClick={prepareTargetClasses} disabled={preparingClasses} className="mt-4 h-10 px-4 bg-emerald-700 text-white rounded-md font-semibold inline-flex items-center gap-2 disabled:opacity-50">{preparingClasses ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}{sourceYear ? `Salin Struktur Kelas ${sourceYear.name}` : "Buat Struktur Kelas Standar"}</button><p className="text-xs text-slate-500 mt-3">Hanya nama kelas, tingkat, dan kapasitas yang disiapkan. Siswa dan jadwal tidak disalin.</p></td></tr>}</tbody></table></div>
      </div>
      <div className="p-5 sm:p-6 border-t bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="text-sm text-slate-600">Total daya tampung konfigurasi</p><p className="text-2xl font-bold">{draftTotal} kursi</p></div><button onClick={saveConfiguration} disabled={saving || schemaMissing || hasOverCapacity} className="h-11 px-5 bg-emerald-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editingBatchId ? "Simpan Seluruh Perubahan" : "Simpan Gelombang dan Kuota"}</button></div>
    </section>

    <section className="bg-white border rounded-lg overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold text-lg">Konfigurasi Gelombang</h2><p className="text-sm text-slate-600 mt-1">Buka satu gelombang untuk mengubah periode dan seluruh kuotanya sekaligus.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="text-left p-4">Unit / tahun</th><th className="text-left p-4">Gelombang</th><th className="text-left p-4">Periode</th><th className="text-left p-4">Kuota</th><th className="text-left p-4">Status</th><th className="text-right p-4">Aksi</th></tr></thead><tbody className="divide-y">{batches.map((row) => { const batchPlans = plans.filter((plan) => plan.batch_id === row.id); const batchQuota = batchPlans.reduce((sum, plan) => sum + Number(plan.quota), 0); return <tr key={row.id}><td className="p-4"><p className="font-bold">{row.units?.name}</p><p className="text-xs text-slate-500 mt-1">{row.academic_years?.name}</p></td><td className="p-4"><p className="font-semibold">{row.name}</p><p className="text-xs text-slate-500 mt-1">{batchPlans.length} alokasi kelas/jalur</p></td><td className="p-4"><p>{formatAdmissionDate(row.registration_start_at)}</p><p className="text-xs text-slate-500 mt-1">s.d. {formatAdmissionDate(row.registration_end_at)}</p></td><td className="p-4 font-bold">{batchQuota} kursi</td><td className="p-4">{row.status === "published" ? "Diterbitkan" : row.status === "closed" ? "Ditutup" : "Draf"}</td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => editBatch(row)} title="Ubah gelombang dan kuota" className="w-9 h-9 border rounded-md grid place-items-center text-emerald-700"><Pencil className="w-4 h-4" /></button>{row.status !== "published" && <button onClick={() => updateBatchStatus(row.id, "published")} className="h-9 px-3 border rounded-md text-xs font-semibold text-emerald-700">Terbitkan</button>}{row.status !== "closed" && <button onClick={() => updateBatchStatus(row.id, "closed")} className="h-9 px-3 border rounded-md text-xs font-semibold">Tutup</button>}</div></td></tr>; })}{batches.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Belum ada gelombang pendaftaran.</td></tr>}</tbody></table></div></section>

  </div>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="text-sm font-semibold">{label}<span className="block mt-2">{children}</span></label>;
const SectionTitle = ({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) => <div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-md grid place-items-center shrink-0"><Icon className="w-5 h-5" /></div><div><h2 className="font-bold text-lg">{title}</h2><p className="text-sm text-slate-600">{detail}</p></div></div>;
const Metric = ({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) => <div className="bg-white border rounded-lg p-5"><Icon className="w-5 h-5 text-emerald-700" /><p className="text-2xl font-bold mt-4">{value}</p><p className="text-sm text-slate-600 mt-1">{label}</p></div>;
