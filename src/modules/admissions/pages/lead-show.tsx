/* Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V4 */
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  History,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  School,
  Send,
  UserRound,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import {
  activityTypes,
  formatCrmDate,
  leadSourceLabel,
  leadSources,
  leadStageMeta,
  leadStages,
  toWhatsappNumber,
  type LeadStage,
} from "../crm-config";

const db = supabaseClient as any;

const activityIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
  visit: School,
  survey: School,
  meeting: UserRoundCheck,
  follow_up: CalendarClock,
  status_change: History,
  note: Edit3,
};

export const AdmissionLeadShow: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [activity, setActivity] = useState({ activity_type: "whatsapp", subject: "", notes: "", outcome: "", occurred_at: "", next_follow_up_at: "", stage: "" });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [leadResult, activityResult] = await Promise.all([
      db.from("admission_leads").select("*, units:units!admission_leads_desired_unit_id_fkey(name), academic_years(name), assigned:employees!admission_leads_assigned_to_fkey(id,full_name,position)").eq("id", id).maybeSingle(),
      db.from("admission_lead_activities").select("*, profiles:profiles!admission_lead_activities_created_by_fkey(full_name,email)").eq("lead_id", id).order("occurred_at", { ascending: false }),
    ]);
    setLoading(false);
    if (leadResult.error || !leadResult.data) {
      toast.error(leadResult.error?.message || "Prospek tidak ditemukan.");
      return;
    }
    setLead(leadResult.data);
    setEditForm({
      parent_name: leadResult.data.parent_name || "",
      phone: leadResult.data.phone || "",
      email: leadResult.data.email || "",
      child_name: leadResult.data.child_name || "",
      child_birth_date: leadResult.data.child_birth_date || "",
      desired_unit_id: leadResult.data.desired_unit_id || "",
      desired_grade: leadResult.data.desired_grade ?? "",
      academic_year_id: leadResult.data.academic_year_id || "",
      source: leadResult.data.source || "other",
      source_detail: leadResult.data.source_detail || "",
      interest_level: leadResult.data.interest_level || "medium",
      assigned_to: leadResult.data.assigned_to || "",
      stage: leadResult.data.stage || "new",
      next_follow_up_at: leadResult.data.next_follow_up_at ? toLocalInput(leadResult.data.next_follow_up_at) : "",
      notes: leadResult.data.notes || "",
      lost_reason: leadResult.data.lost_reason || "",
      consent_to_contact: leadResult.data.consent_to_contact !== false,
    });
    setActivities(activityResult.data || []);
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
  }, [id]);

  const stage = (lead?.stage || "new") as LeadStage;
  const overdue = Boolean(lead?.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date() && !["converted", "lost"].includes(stage));
  const whatsapp = toWhatsappNumber(lead?.phone);
  const canConvert = Boolean(lead?.child_name && lead?.desired_unit_id && lead?.academic_year_id && lead?.stage !== "converted");

  const profileReadiness = useMemo(() => [
    { label: "Kontak wali", ok: Boolean(lead?.parent_name && lead?.phone) },
    { label: "Nama calon murid", ok: Boolean(lead?.child_name) },
    { label: "Unit tujuan", ok: Boolean(lead?.desired_unit_id) },
    { label: "Tahun ajaran", ok: Boolean(lead?.academic_year_id) },
  ], [lead]);

  const saveProfile = async () => {
    if (!editForm.parent_name.trim() || !editForm.phone.trim()) {
      toast.error("Nama wali dan nomor kontak wajib diisi.");
      return;
    }
    if (editForm.stage === "lost" && !editForm.lost_reason.trim()) {
      toast.error("Alasan tidak dilanjutkan wajib dicatat.");
      return;
    }
    setSaving(true);
    const payload = {
      ...editForm,
      email: editForm.email.trim() || null,
      child_name: editForm.child_name.trim() || null,
      child_birth_date: editForm.child_birth_date || null,
      desired_unit_id: editForm.desired_unit_id || null,
      desired_grade: editForm.desired_grade === "" ? null : Number(editForm.desired_grade),
      academic_year_id: editForm.academic_year_id || null,
      source_detail: editForm.source_detail.trim() || null,
      assigned_to: editForm.assigned_to || null,
      next_follow_up_at: editForm.next_follow_up_at ? new Date(editForm.next_follow_up_at).toISOString() : null,
      lost_reason: editForm.stage === "lost" ? editForm.lost_reason.trim() : null,
      notes: editForm.notes.trim() || null,
    };
    const stageChanged = payload.stage !== lead.stage;
    const { error } = await db.from("admission_leads").update(payload).eq("id", lead.id);
    if (!error && stageChanged) await db.from("admission_lead_activities").insert({ lead_id: lead.id, activity_type: "status_change", subject: `Tahapan diubah menjadi ${leadStageMeta[payload.stage as LeadStage].label}`, outcome: payload.stage });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Data prospek diperbarui."); setEditing(false); await load(); }
  };

  const addActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activity.subject.trim()) {
      toast.error("Ringkasan aktivitas wajib diisi.");
      return;
    }
    setSaving(true);
    const { error } = await db.rpc("admission_lead_add_activity", {
      p_lead_id: lead.id,
      p_activity_type: activity.activity_type,
      p_subject: activity.subject.trim(),
      p_notes: activity.notes.trim() || null,
      p_outcome: activity.outcome.trim() || null,
      p_occurred_at: activity.occurred_at ? new Date(activity.occurred_at).toISOString() : new Date().toISOString(),
      p_next_follow_up_at: activity.next_follow_up_at ? new Date(activity.next_follow_up_at).toISOString() : null,
      p_stage: activity.stage || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Aktivitas gagal disimpan: ${error.message}`);
      return;
    }
    toast.success("Aktivitas dan jadwal tindak lanjut tersimpan.");
    setActivity({ activity_type: "whatsapp", subject: "", notes: "", outcome: "", occurred_at: "", next_follow_up_at: "", stage: "" });
    await load();
  };

  const convert = async () => {
    if (!canConvert || converting) return;
    if (!window.confirm(`Ubah prospek ${lead.parent_name} menjadi pendaftar SPMB resmi? Data anak dan wali akan disalin ke formulir pendaftaran draf.`)) return;
    setConverting(true);
    const { data, error } = await db.rpc("admission_lead_convert_to_applicant", { p_lead_id: lead.id });
    setConverting(false);
    if (error) {
      toast.error(`Konversi gagal: ${error.message}`);
      return;
    }
    toast.success("Prospek berhasil menjadi pendaftar SPMB.");
    navigate(`${base}/applicants/${data}`);
  };

  const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  if (loading) return <div className="grid place-items-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!lead) return <div className="py-24 text-center"><h1 className="text-xl font-bold">Prospek tidak ditemukan</h1><Link to={`${base}/crm`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Kembali ke CRM</Link></div>;

  return <div className="space-y-6">
    <PageHeader
      title={lead.parent_name}
      description={`${lead.lead_number} · ${lead.child_name || "Nama calon murid belum diisi"}`}
      action={<div className="flex flex-wrap gap-2">{whatsapp && lead.consent_to_contact !== false && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}<button type="button" onClick={() => setEditing(true)} className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold hover:bg-muted"><Edit3 className="h-4 w-4" />Ubah Data</button></div>}
    />

    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-sm font-bold ${leadStageMeta[stage].tone}`}>{leadStageMeta[stage].label}</span><span className="text-sm text-muted-foreground">Sumber: <span className="font-semibold text-foreground">{leadSourceLabel(lead.source)}</span>{lead.source_detail ? ` · ${lead.source_detail}` : ""}</span></div>
      <div className={`flex items-center gap-2 text-sm ${overdue ? "font-bold text-rose-700" : "text-muted-foreground"}`}><CalendarClock className="h-4 w-4" />Follow-up: {formatCrmDate(lead.next_follow_up_at)}</div>
    </div>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <InfoMetric icon={UserRound} label="Calon murid" value={lead.child_name || "Belum diisi"} />
      <InfoMetric icon={School} label="Unit tujuan" value={lead.units?.name || "Belum dipilih"} />
      <InfoMetric icon={UserRoundCheck} label="PIC follow-up" value={lead.assigned?.full_name || "Belum ditugaskan"} />
      <InfoMetric icon={Clock3} label="Kontak terakhir" value={formatCrmDate(lead.last_contacted_at)} />
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
      <div className="space-y-6">
        <section className="rounded-lg border bg-card">
          <div className="border-b p-5"><h2 className="font-bold">Catat komunikasi atau tindak lanjut</h2><p className="mt-1 text-sm text-muted-foreground">Satu pencatatan memperbarui riwayat, kontak terakhir, jadwal berikutnya, dan tahapan bila diperlukan.</p></div>
          <form onSubmit={addActivity} className="space-y-4 p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Jenis aktivitas"><select className={inputClass} value={activity.activity_type} onChange={(event) => setActivity((current) => ({ ...current, activity_type: event.target.value }))}>{activityTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field><Field label="Waktu aktivitas"><input type="datetime-local" className={inputClass} value={activity.occurred_at} onChange={(event) => setActivity((current) => ({ ...current, occurred_at: event.target.value }))} /></Field><Field label="Ringkasan *"><input className={inputClass} value={activity.subject} onChange={(event) => setActivity((current) => ({ ...current, subject: event.target.value }))} placeholder="Contoh: Menanyakan biaya dan jadwal survei" /></Field><Field label="Hasil komunikasi"><input className={inputClass} value={activity.outcome} onChange={(event) => setActivity((current) => ({ ...current, outcome: event.target.value }))} placeholder="Contoh: Bersedia berkunjung hari Sabtu" /></Field><Field label="Jadwal tindak lanjut berikutnya"><input type="datetime-local" className={inputClass} value={activity.next_follow_up_at} onChange={(event) => setActivity((current) => ({ ...current, next_follow_up_at: event.target.value }))} /></Field><Field label="Perbarui tahapan"><select className={inputClass} value={activity.stage} onChange={(event) => setActivity((current) => ({ ...current, stage: event.target.value }))}><option value="">Tetap di {leadStageMeta[stage].label}</option>{leadStages.filter((value) => !["converted", "lost"].includes(value)).map((value) => <option key={value} value={value}>{leadStageMeta[value].label}</option>)}</select></Field><label className="text-sm font-semibold md:col-span-2">Catatan lengkap<textarea className="mt-2 min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={activity.notes} onChange={(event) => setActivity((current) => ({ ...current, notes: event.target.value }))} /></label></div><div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Simpan Aktivitas</button></div></form>
        </section>

        <section className="rounded-lg border bg-card"><div className="border-b p-5"><h2 className="font-bold">Riwayat hubungan</h2><p className="mt-1 text-sm text-muted-foreground">Kronologi komunikasi untuk menjaga kesinambungan pelayanan antarpetugas.</p></div><div className="divide-y">{activities.map((item) => { const Icon = activityIcon[item.activity_type] || History; return <article key={item.id} className="flex gap-4 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><h3 className="font-bold">{item.subject}</h3><time className="shrink-0 text-xs text-muted-foreground">{formatCrmDate(item.occurred_at)}</time></div>{item.outcome && <p className="mt-2 text-sm font-medium text-emerald-800">Hasil: {item.outcome}</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p>}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{activityTypes.find((type) => type.value === item.activity_type)?.label || "Perubahan status"}</span><span>Dicatat oleh {item.profiles?.full_name || item.profiles?.email || "Petugas SPMB"}</span>{item.next_follow_up_at && <span>Berikutnya: {formatCrmDate(item.next_follow_up_at)}</span>}</div></div></article>; })}{activities.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground"><History className="mx-auto mb-3 h-8 w-8 opacity-40" />Belum ada aktivitas. Catat komunikasi pertama di atas.</div>}</div></section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-lg border bg-card p-5"><h2 className="font-bold">Kesiapan menjadi pendaftar</h2><p className="mt-1 text-sm text-muted-foreground">Akun portal belum dibuat selama masih berstatus prospek.</p><div className="mt-5 space-y-3">{profileReadiness.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-sm"><span>{item.label}</span>{item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}</div>)}</div>{lead.converted_applicant_id ? <Link to={`${base}/applicants/${lead.converted_applicant_id}`} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800">Buka Pendaftaran <ExternalLink className="h-4 w-4" /></Link> : <button type="button" onClick={convert} disabled={!canConvert || converting} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}Jadikan Pendaftar SPMB</button>}{!canConvert && !lead.converted_applicant_id && <p className="mt-3 text-xs text-amber-700">Lengkapi nama calon murid, unit tujuan, dan tahun ajaran sebelum konversi.</p>}</section>

        <section className="rounded-lg border bg-card p-5"><h2 className="font-bold">Kontak dan minat</h2><dl className="mt-4 space-y-4 text-sm"><Detail label="Nomor kontak" value={lead.phone} /><Detail label="Email" value={lead.email || "Belum diisi"} /><Detail label="Tingkat minat" value={lead.interest_level === "high" ? "Tinggi" : lead.interest_level === "low" ? "Awal / masih bertanya" : "Sedang"} /><Detail label="Kelas tujuan" value={lead.desired_grade == null ? "Belum ditentukan" : lead.desired_grade === 0 ? "PAUD / TK" : `Kelas ${lead.desired_grade}`} /><Detail label="Tahun ajaran" value={lead.academic_years?.name || "Belum dipilih"} /><Detail label="Izin komunikasi" value={lead.consent_to_contact === false ? "Tidak bersedia dihubungi" : "Bersedia dihubungi"} /></dl>{lead.notes && <div className="mt-5 border-t pt-4"><p className="text-xs font-bold uppercase text-muted-foreground">Catatan awal</p><p className="mt-2 whitespace-pre-wrap text-sm">{lead.notes}</p></div>}</section>
      </aside>
    </div>

    {editing && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="edit-lead-title"><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-background shadow-xl"><div className="flex items-start justify-between border-b bg-muted/30 p-5"><div><h2 id="edit-lead-title" className="text-lg font-bold">Ubah Data Prospek</h2><p className="mt-1 text-sm text-muted-foreground">Perbarui profil, PIC, tahapan, dan jadwal tindak lanjut.</p></div><button type="button" onClick={() => setEditing(false)} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Nama orang tua / wali *"><input className={inputClass} value={editForm.parent_name} onChange={(event) => setEditForm((current: any) => ({ ...current, parent_name: event.target.value }))} /></Field><Field label="Nomor kontak *"><input className={inputClass} value={editForm.phone} onChange={(event) => setEditForm((current: any) => ({ ...current, phone: event.target.value }))} /></Field><Field label="Email"><input type="email" className={inputClass} value={editForm.email} onChange={(event) => setEditForm((current: any) => ({ ...current, email: event.target.value }))} /></Field><Field label="Nama calon murid"><input className={inputClass} value={editForm.child_name} onChange={(event) => setEditForm((current: any) => ({ ...current, child_name: event.target.value }))} /></Field><Field label="Tanggal lahir"><input type="date" className={inputClass} value={editForm.child_birth_date} onChange={(event) => setEditForm((current: any) => ({ ...current, child_birth_date: event.target.value }))} /></Field><Field label="Unit tujuan"><select className={inputClass} value={editForm.desired_unit_id} onChange={(event) => setEditForm((current: any) => ({ ...current, desired_unit_id: event.target.value }))}><option value="">Belum ditentukan</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field><Field label="Kelas tujuan"><input type="number" min="0" max="12" className={inputClass} value={editForm.desired_grade} onChange={(event) => setEditForm((current: any) => ({ ...current, desired_grade: event.target.value }))} /></Field><Field label="Tahun ajaran"><select className={inputClass} value={editForm.academic_year_id} onChange={(event) => setEditForm((current: any) => ({ ...current, academic_year_id: event.target.value }))}><option value="">Belum ditentukan</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></Field><Field label="Tingkat minat"><select className={inputClass} value={editForm.interest_level} onChange={(event) => setEditForm((current: any) => ({ ...current, interest_level: event.target.value }))}><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Awal / masih bertanya</option></select></Field><Field label="Sumber"><select className={inputClass} value={editForm.source} onChange={(event) => setEditForm((current: any) => ({ ...current, source: event.target.value }))}>{leadSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></Field><Field label="Rincian sumber"><input className={inputClass} value={editForm.source_detail} onChange={(event) => setEditForm((current: any) => ({ ...current, source_detail: event.target.value }))} /></Field><Field label="PIC"><select className={inputClass} value={editForm.assigned_to} onChange={(event) => setEditForm((current: any) => ({ ...current, assigned_to: event.target.value }))}><option value="">Belum ditugaskan</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></Field><Field label="Tahapan"><select className={inputClass} value={editForm.stage} onChange={(event) => setEditForm((current: any) => ({ ...current, stage: event.target.value }))}>{leadStages.filter((value) => value !== "converted" || lead.stage === "converted").map((value) => <option key={value} value={value}>{leadStageMeta[value].label}</option>)}</select></Field><Field label="Tindak lanjut berikutnya"><input type="datetime-local" className={inputClass} value={editForm.next_follow_up_at} onChange={(event) => setEditForm((current: any) => ({ ...current, next_follow_up_at: event.target.value }))} /></Field>{editForm.stage === "lost" && <Field label="Alasan tidak dilanjutkan *"><input className={inputClass} value={editForm.lost_reason} onChange={(event) => setEditForm((current: any) => ({ ...current, lost_reason: event.target.value }))} /></Field>}<label className="text-sm font-semibold md:col-span-2 xl:col-span-3">Catatan umum<textarea className="mt-2 min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={editForm.notes} onChange={(event) => setEditForm((current: any) => ({ ...current, notes: event.target.value }))} /></label><label className="flex items-center gap-2 text-sm font-semibold md:col-span-2 xl:col-span-3"><input type="checkbox" checked={editForm.consent_to_contact} onChange={(event) => setEditForm((current: any) => ({ ...current, consent_to_contact: event.target.checked }))} />Keluarga bersedia dihubungi kembali</label></div></div><div className="flex justify-end gap-3 border-t bg-background p-4 sm:px-6"><button type="button" onClick={() => setEditing(false)} className="h-10 rounded-md border px-4 text-sm font-semibold hover:bg-muted">Batal</button><button type="button" onClick={saveProfile} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan Perubahan</button></div></div></div>}
  </div>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="text-sm font-semibold">{label}<span className="mt-2 block">{children}</span></label>;
const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => <div><dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
const InfoMetric = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => <div className="min-w-0 rounded-lg border bg-card p-4"><Icon className="h-5 w-5 text-primary" /><p className="mt-4 truncate font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
const toLocalInput = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};
