/* Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V4 */
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  Flame,
  Inbox,
  List,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import {
  formatCrmDate,
  leadSourceLabel,
  leadSources,
  leadStageMeta,
  leadStages,
  toWhatsappNumber,
  type LeadStage,
} from "../crm-config";

const db = supabaseClient as any;
const PAGE_SIZE = 15;

const emptyLead = {
  parent_name: "",
  phone: "",
  email: "",
  child_name: "",
  child_birth_date: "",
  desired_unit_id: "",
  desired_grade: "",
  academic_year_id: "",
  source: "whatsapp",
  source_detail: "",
  interest_level: "medium",
  contact_preference: "whatsapp",
  assigned_to: "",
  next_follow_up_at: "",
  notes: "",
  consent_to_contact: true,
};

const activeStages = leadStages.filter((stage) => !["converted", "lost"].includes(stage));

export const AdmissionCrm: React.FC = () => {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [rows, setRows] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "pipeline">("list");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyLead);
  const [filters, setFilters] = useState({ search: "", unit: "", stage: "", source: "", due: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("admission_leads")
      .select("*, units:units!admission_leads_desired_unit_id_fkey(name), academic_years(name), assigned:employees!admission_leads_assigned_to_fkey(id,full_name,position)")
      .order("next_follow_up_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(`CRM belum dapat dimuat: ${error.message}`);
      return;
    }
    setRows(data || []);
  };

  useEffect(() => {
    void Promise.all([
      db.from("units").select("id,name").order("name"),
      db.from("academic_years").select("id,name,is_active").order("start_date", { ascending: false }),
      db.from("employees").select("id,full_name,position,status").eq("status", "active").order("full_name"),
    ]).then(([unitResult, yearResult, employeeResult]) => {
      setUnits(unitResult.data || []);
      setYears(yearResult.data || []);
      setEmployees(employeeResult.data || []);
    });
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
    const search = filters.search.trim().toLocaleLowerCase("id-ID");
    return rows.filter((row) => {
      if (filters.unit && row.desired_unit_id !== filters.unit) return false;
      if (filters.stage && row.stage !== filters.stage) return false;
      if (filters.source && row.source !== filters.source) return false;
      if (filters.due === "overdue" && (!row.next_follow_up_at || new Date(row.next_follow_up_at) >= now || ["converted", "lost"].includes(row.stage))) return false;
      if (filters.due === "today" && (!row.next_follow_up_at || new Date(row.next_follow_up_at) < todayStart || new Date(row.next_follow_up_at) >= tomorrow)) return false;
      if (search && ![row.lead_number, row.parent_name, row.phone, row.email, row.child_name, row.source_detail]
        .filter(Boolean).some((value) => String(value).toLocaleLowerCase("id-ID").includes(search))) return false;
      return true;
    });
  }, [filters, rows]);

  useEffect(() => { setPage(1); }, [filters, view]);

  const metrics = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return {
      active: rows.filter((row) => activeStages.includes(row.stage)).length,
      overdue: rows.filter((row) => row.next_follow_up_at && new Date(row.next_follow_up_at) < now && activeStages.includes(row.stage)).length,
      today: rows.filter((row) => row.next_follow_up_at && new Date(row.next_follow_up_at) >= start && new Date(row.next_follow_up_at) < end && activeStages.includes(row.stage)).length,
      ready: rows.filter((row) => row.stage === "ready_to_apply").length,
    };
  }, [rows]);

  const sourceSummary = useMemo(() => Object.entries(rows.reduce((summary: Record<string, number>, row) => {
    summary[row.source] = (summary[row.source] || 0) + 1;
    return summary;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 4), [rows]);

  const pages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setField = (key: keyof typeof emptyLead, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const createLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.parent_name.trim() || !form.phone.trim()) {
      toast.error("Nama orang tua / wali dan nomor WhatsApp wajib diisi.");
      return;
    }
    setSaving(true);
    const normalizedPhone = form.phone.replace(/\D/g, "");
    const { data: duplicates } = await db.from("admission_leads").select("id,parent_name,stage").eq("phone", normalizedPhone || form.phone.trim()).not("stage", "in", "(converted,lost)").limit(1);
    if (duplicates?.length) {
      setSaving(false);
      toast.error(`Nomor ini masih tercatat sebagai prospek aktif atas nama ${duplicates[0].parent_name}.`);
      return;
    }
    const payload = {
      ...form,
      phone: normalizedPhone || form.phone.trim(),
      email: form.email.trim() || null,
      child_name: form.child_name.trim() || null,
      child_birth_date: form.child_birth_date || null,
      desired_unit_id: form.desired_unit_id || null,
      desired_grade: form.desired_grade === "" ? null : Number(form.desired_grade),
      academic_year_id: form.academic_year_id || null,
      source_detail: form.source_detail.trim() || null,
      assigned_to: form.assigned_to || null,
      next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
      notes: form.notes.trim() || null,
      stage: "new",
    };
    const { error } = await db.from("admission_leads").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(`Prospek gagal disimpan: ${error.message}`);
      return;
    }
    toast.success("Prospek baru masuk ke antrean CRM.");
    setModalOpen(false);
    setForm(emptyLead);
    await load();
  };

  const clearFilters = () => setFilters({ search: "", unit: "", stage: "", source: "", due: "" });
  const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  if (loading) return <div className="grid place-items-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return <div className="space-y-6">
    <PageHeader
      title="CRM Calon Orang Tua"
      description="Kelola pertanyaan awal, minat keluarga, kunjungan, dan tindak lanjut sebelum masuk pendaftaran resmi SPMB."
      action={<button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" />Catat Prospek</button>}
    />

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan CRM">
      {[
        { label: "Prospek aktif", value: metrics.active, icon: Users, tone: "bg-sky-50 text-sky-700" },
        { label: "Terlambat diikuti", value: metrics.overdue, icon: AlertCircle, tone: "bg-rose-50 text-rose-700", filter: "overdue" },
        { label: "Tindak lanjut hari ini", value: metrics.today, icon: CalendarClock, tone: "bg-amber-50 text-amber-700", filter: "today" },
        { label: "Siap mendaftar", value: metrics.ready, icon: UserRoundCheck, tone: "bg-emerald-50 text-emerald-700", stage: "ready_to_apply" },
      ].map(({ label, value, icon: Icon, tone, filter, stage }) => <button key={label} type="button" onClick={() => setFilters((current) => ({ ...current, due: filter || "", stage: stage || "" }))} className="min-w-0 rounded-lg border bg-card p-4 text-left hover:border-primary/40 sm:p-5"><span className={`flex h-9 w-9 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></span><span className="mt-4 block text-2xl font-bold">{value}</span><span className="mt-1 block text-xs text-muted-foreground sm:text-sm">{label}</span></button>)}
    </section>

    <section className="border-y bg-card py-4">
      <div className="flex flex-col gap-4 px-4 sm:px-5 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-muted-foreground">Sumber prospek teratas</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{sourceSummary.map(([source, value]) => <span key={source}><span className="font-semibold">{leadSourceLabel(source)}</span> <span className="text-muted-foreground">{value}</span></span>)}{sourceSummary.length === 0 && <span className="text-muted-foreground">Belum ada data sumber.</span>}</div>
        </div>
        <div className="grid grid-cols-2 rounded-md border p-1">
          <button type="button" onClick={() => setView("list")} className={`flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-semibold ${view === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}><List className="h-4 w-4" />Daftar</button>
          <button type="button" onClick={() => setView("pipeline")} className={`flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-semibold ${view === "pipeline" ? "bg-muted text-foreground" : "text-muted-foreground"}`}><Columns3 className="h-4 w-4" />Pipeline</button>
        </div>
      </div>
    </section>

    <section className="rounded-lg border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_190px_190px_180px]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className={`${inputClass} pl-9`} placeholder="Cari wali, anak, nomor, atau kode CRM" /></label>
        <select value={filters.unit} onChange={(event) => setFilters((current) => ({ ...current, unit: event.target.value }))} className={inputClass}><option value="">Semua unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
        <select value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))} className={inputClass}><option value="">Semua tahapan</option>{leadStages.map((stage) => <option key={stage} value={stage}>{leadStageMeta[stage].label}</option>)}</select>
        <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className={inputClass}><option value="">Semua sumber</option>{leadSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select>
        <select value={filters.due} onChange={(event) => setFilters((current) => ({ ...current, due: event.target.value }))} className={inputClass}><option value="">Semua jadwal</option><option value="today">Hari ini</option><option value="overdue">Terlambat</option></select>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" />{filteredRows.length} prospek sesuai filter</span>{Object.values(filters).some(Boolean) && <button type="button" onClick={clearFilters} className="font-semibold text-primary hover:underline">Hapus filter</button>}</div>
    </section>

    {view === "list" ? <section className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3 text-left">Keluarga / calon murid</th><th className="px-5 py-3 text-left">Tahapan</th><th className="px-5 py-3 text-left">Tujuan</th><th className="px-5 py-3 text-left">PIC</th><th className="px-5 py-3 text-left">Tindak lanjut</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{visibleRows.map((row) => {
        const stage = row.stage as LeadStage;
        const overdue = row.next_follow_up_at && new Date(row.next_follow_up_at) < new Date() && activeStages.includes(stage);
        const wa = toWhatsappNumber(row.phone);
        return <tr key={row.id} className="hover:bg-muted/20"><td className="px-5 py-4"><Link to={`${base}/crm/${row.id}`} className="font-bold hover:text-primary hover:underline">{row.parent_name}</Link><p className="mt-1 text-xs text-muted-foreground">{row.child_name || "Nama calon murid belum diisi"} · {row.lead_number}</p><p className="mt-1 text-xs text-muted-foreground">{row.phone} · {leadSourceLabel(row.source)}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${leadStageMeta[stage]?.tone || "bg-muted"}`}>{leadStageMeta[stage]?.shortLabel || stage}</span>{row.interest_level === "high" && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><Flame className="h-3.5 w-3.5" />Minat tinggi</p>}</td><td className="px-5 py-4"><p className="font-medium">{row.units?.name || "Belum ditentukan"}</p><p className="mt-1 text-xs text-muted-foreground">{row.academic_years?.name || "Tahun belum dipilih"}</p></td><td className="px-5 py-4"><p className="font-medium">{row.assigned?.full_name || "Belum ada PIC"}</p><p className="mt-1 text-xs text-muted-foreground">{row.assigned?.position || "Perlu ditugaskan"}</p></td><td className="px-5 py-4"><p className={overdue ? "font-bold text-rose-700" : "font-medium"}>{formatCrmDate(row.next_follow_up_at)}</p><p className="mt-1 text-xs text-muted-foreground">Terakhir: {formatCrmDate(row.last_contacted_at)}</p></td><td className="px-5 py-4"><div className="flex justify-end gap-2">{wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="Buka WhatsApp" className="grid h-9 w-9 place-items-center rounded-md border text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" /></a>}<Link to={`${base}/crm/${row.id}`} className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold hover:bg-muted">Buka</Link></div></td></tr>;
      })}{visibleRows.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted-foreground"><Inbox className="mx-auto mb-3 h-9 w-9 opacity-40" />Belum ada prospek sesuai filter.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t px-5 py-3 text-sm"><span className="text-muted-foreground">Halaman {page} dari {pages}</span><div className="flex gap-2"><button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid h-9 w-9 place-items-center rounded-md border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Halaman berikutnya" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="grid h-9 w-9 place-items-center rounded-md border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
    </section> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{activeStages.map((stage) => {
      const stageRows = filteredRows.filter((row) => row.stage === stage);
      return <div key={stage} className="min-w-0"><div className="mb-3 flex items-center justify-between border-b pb-2"><div><h2 className="text-sm font-bold">{leadStageMeta[stage].shortLabel}</h2><p className="text-xs text-muted-foreground">{leadStageMeta[stage].description}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{stageRows.length}</span></div><div className="space-y-3">{stageRows.slice(0, 20).map((row) => <Link key={row.id} to={`${base}/crm/${row.id}`} className="block rounded-lg border bg-card p-4 hover:border-primary/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{row.parent_name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{row.child_name || row.phone}</p></div>{row.interest_level === "high" && <Flame className="h-4 w-4 shrink-0 text-rose-600" />}</div><div className="mt-4 border-t pt-3 text-xs"><p className="font-medium">{row.units?.name || "Unit belum dipilih"}</p><p className={`mt-1 ${row.next_follow_up_at && new Date(row.next_follow_up_at) < new Date() ? "font-bold text-rose-700" : "text-muted-foreground"}`}>{formatCrmDate(row.next_follow_up_at)}</p></div></Link>)}{stageRows.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Belum ada prospek</div>}</div></div>;
    })}</section>}

    {modalOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="new-lead-title"><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-background shadow-xl"><div className="flex items-start justify-between gap-4 border-b bg-muted/30 p-5"><div><h2 id="new-lead-title" className="text-lg font-bold">Catat Prospek Orang Tua</h2><p className="mt-1 text-sm text-muted-foreground">Cukup isi kontak awal. Akun portal belum dibuat pada tahap ini.</p></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Tutup" className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-muted"><X className="h-5 w-5" /></button></div><form onSubmit={createLead} className="overflow-y-auto"><div className="space-y-6 p-5 sm:p-6">
      <fieldset><legend className="font-bold">Kontak keluarga</legend><p className="mt-1 text-sm text-muted-foreground">Informasi minimum untuk komunikasi dan pencegahan duplikasi.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Nama orang tua / wali *"><input className={inputClass} value={form.parent_name} onChange={(event) => setField("parent_name", event.target.value)} required /></Field><Field label="Nomor WhatsApp / telepon *"><input className={inputClass} value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="0812..." required /></Field><Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(event) => setField("email", event.target.value)} /></Field><Field label="Cara kontak pilihan"><select className={inputClass} value={form.contact_preference} onChange={(event) => setField("contact_preference", event.target.value)}><option value="whatsapp">WhatsApp</option><option value="phone">Telepon</option><option value="email">Email</option><option value="in_person">Tatap muka</option></select></Field></div></fieldset>
      <fieldset className="border-t pt-6"><legend className="font-bold">Minat pendidikan</legend><p className="mt-1 text-sm text-muted-foreground">Boleh dilengkapi bertahap selama proses follow-up.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Nama calon murid"><input className={inputClass} value={form.child_name} onChange={(event) => setField("child_name", event.target.value)} /></Field><Field label="Tanggal lahir"><input type="date" className={inputClass} value={form.child_birth_date} onChange={(event) => setField("child_birth_date", event.target.value)} /></Field><Field label="Unit tujuan"><select className={inputClass} value={form.desired_unit_id} onChange={(event) => setField("desired_unit_id", event.target.value)}><option value="">Belum ditentukan</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field><Field label="Tingkat / kelas tujuan"><input type="number" min="0" max="12" className={inputClass} value={form.desired_grade} onChange={(event) => setField("desired_grade", event.target.value)} placeholder="0 untuk PAUD" /></Field><Field label="Tahun ajaran"><select className={inputClass} value={form.academic_year_id} onChange={(event) => setField("academic_year_id", event.target.value)}><option value="">Belum ditentukan</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_active ? " · aktif" : ""}</option>)}</select></Field><Field label="Tingkat minat"><select className={inputClass} value={form.interest_level} onChange={(event) => setField("interest_level", event.target.value)}><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Awal / masih bertanya</option></select></Field></div></fieldset>
      <fieldset className="border-t pt-6"><legend className="font-bold">Sumber dan tindak lanjut</legend><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Sumber prospek"><select className={inputClass} value={form.source} onChange={(event) => setField("source", event.target.value)}>{leadSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></Field><Field label="Rincian sumber"><input className={inputClass} value={form.source_detail} onChange={(event) => setField("source_detail", event.target.value)} placeholder="Nama pemberi referensi, lembaga, atau acara" /></Field><Field label="PIC follow-up"><select className={inputClass} value={form.assigned_to} onChange={(event) => setField("assigned_to", event.target.value)}><option value="">Belum ditugaskan</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.position || "Pegawai"}</option>)}</select></Field><Field label="Jadwal follow-up pertama"><input type="datetime-local" className={inputClass} value={form.next_follow_up_at} onChange={(event) => setField("next_follow_up_at", event.target.value)} /></Field><label className="text-sm font-semibold md:col-span-2">Catatan awal<textarea className="mt-2 min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Kebutuhan keluarga, pertanyaan utama, hasil survei awal, atau pertimbangan lainnya." /></label><label className="flex items-start gap-3 rounded-lg border p-4 text-sm md:col-span-2"><input type="checkbox" checked={form.consent_to_contact} onChange={(event) => setField("consent_to_contact", event.target.checked)} className="mt-0.5" /><span><span className="block font-semibold">Keluarga bersedia dihubungi kembali</span><span className="mt-1 block text-xs text-muted-foreground">Gunakan data kontak hanya untuk informasi sekolah dan tindak lanjut SPMB.</span></span></label></div></fieldset>
    </div><div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background p-4 sm:px-6"><button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-md border px-4 text-sm font-semibold hover:bg-muted">Batal</button><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Simpan Prospek</button></div></form></div></div>}
  </div>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="text-sm font-semibold">{label}<span className="mt-2 block">{children}</span></label>;
