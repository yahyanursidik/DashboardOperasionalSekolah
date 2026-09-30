/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Award, BookHeart, Eye, EyeOff, Loader2, Plus, Scale, Search, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { useCurrentRoles, useCurrentUser } from "../../../hooks/useAuth";
import { hasAnyRole } from "../../../lib/permissions";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { ConductRecordForm } from "../components/ConductRecordForm";
import {
  COUNSELING_MANAGER_POSITIONS, COUNSELING_MANAGER_ROLES, conductLevel, kindLabels, netConductPoints,
  sessionTypeLabels, severityTones, statusLabels, type ConductStatus,
} from "../conduct-config";

const db = supabaseClient as any;
type Tab = "records" | "summary" | "sessions" | "rules";
const inputClass = "rounded-md border bg-background px-3 py-2 text-sm";
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

export const CounselingPage: React.FC = () => {
  const { roles } = useCurrentRoles();
  const { user } = useCurrentUser();
  const [position, setPosition] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("records");

  useEffect(() => {
    if (!user?.id) return;
    void db.from("employees").select("position").eq("user_id", user.id).maybeSingle().then(({ data }: any) => setPosition(data?.position || null));
  }, [user?.id]);

  const isManager = hasAnyRole(roles, [...COUNSELING_MANAGER_ROLES]) || COUNSELING_MANAGER_POSITIONS.includes(position || "");
  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType; managerOnly?: boolean }> = [
    { key: "records", label: "Catatan Kejadian", icon: ShieldAlert },
    { key: "summary", label: "Rekap Poin Siswa", icon: Scale },
    { key: "sessions", label: "Konseling", icon: BookHeart, managerOnly: true },
    { key: "rules", label: "Katalog Poin", icon: Award },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="BK & Tata Tertib" description="Catat pelanggaran dan prestasi siswa, pantau akumulasi poin, dan kelola sesi konseling secara rahasia." />
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.filter((item) => !item.managerOnly || isManager).map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>
      {tab === "records" && <RecordsTab />}
      {tab === "summary" && <SummaryTab />}
      {tab === "sessions" && isManager && <SessionsTab />}
      {tab === "rules" && <RulesTab canEdit={isManager} />}
    </div>
  );
};

const RecordsTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = db.from("conduct_records")
      .select("id, kind, title, points, incident_date, status, visibility, follow_up, description, students(full_name, nis), classes(name), employees:reported_by(full_name)")
      .order("incident_date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (kind) query = query.eq("kind", kind);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) toast.error("Catatan belum dapat dimuat", { description: error.message });
    setRows(data || []);
    setLoading(false);
  }, [kind, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when filters change
    void load();
  }, [load]);

  const visible = rows.filter((row) => !search.trim() || `${row.students?.full_name} ${row.title} ${row.classes?.name}`.toLowerCase().includes(search.trim().toLowerCase()));

  const updateRecord = async (row: any, values: Record<string, unknown>) => {
    const { data, error } = await db.from("conduct_records").update(values).eq("id", row.id).select("id");
    if (error || !data?.length) return toast.error("Hanya pelapor atau pengelola BK yang dapat mengubah catatan ini.");
    toast.success("Catatan diperbarui.");
    void load();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari siswa, kelas, atau kejadian..." className={`${inputClass} w-full pl-9`} />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
          <option value="">Semua jenis</option>
          {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">Semua status</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" onClick={() => setFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Catat Kejadian
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">Kejadian</th><th className="px-4 py-3 text-center">Poin</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pelapor</th></tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Belum ada catatan.</td></tr>}
              {visible.map((row) => (
                <tr key={row.id} className="align-top hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(row.incident_date)}</td>
                  <td className="px-4 py-3"><p className="font-medium">{row.students?.full_name}</p><p className="text-xs text-muted-foreground">{row.classes?.name || "-"}</p></td>
                  <td className="max-w-xs px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.kind === "violation" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{kindLabels[row.kind as keyof typeof kindLabels]}</span>
                      <span title={row.visibility === "parents" ? "Dibagikan ke orang tua" : "Internal"}>{row.visibility === "parents" ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</span>
                    </div>
                    <p className="mt-1 font-medium">{row.title}</p>
                    {row.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>}
                    {row.follow_up && <p className="mt-1 text-xs text-emerald-700">Tindak lanjut: {row.follow_up}</p>}
                  </td>
                  <td className="px-4 py-3 text-center font-bold">{row.kind === "violation" ? "+" : "−"}{row.points}</td>
                  <td className="px-4 py-3">
                    <select value={row.status} onChange={(e) => {
                      const next = e.target.value as ConductStatus;
                      const followUp = next !== "open" && !row.follow_up ? window.prompt("Tindak lanjut yang dilakukan:") : row.follow_up;
                      if (next !== "open" && !followUp) return;
                      void updateRecord(row, { status: next, follow_up: followUp });
                    }} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.employees?.full_name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConductRecordForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => void load()} />
    </section>
  );
};

const SummaryTab: React.FC = () => {
  const { activeYearId } = useAcademicYear();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let query = db.from("student_conduct_summary").select("*");
      if (activeYearId) query = query.eq("academic_year_id", activeYearId);
      const { data, error } = await query;
      if (error) toast.error("Rekap belum dapat dimuat", { description: error.message });
      const summary = data || [];
      const ids = [...new Set(summary.map((row: any) => row.student_id))];
      const { data: students } = ids.length
        ? await db.from("students").select("id, full_name, nis, classes(name)").in("id", ids)
        : { data: [] };
      const byId = new Map((students || []).map((student: any) => [student.id, student]));
      if (!cancelled) {
        setRows(summary.map((row: any) => ({ ...row, student: byId.get(row.student_id), net: netConductPoints(row.violation_points, row.achievement_points) }))
          .sort((a: any, b: any) => b.net - a.net));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeYearId]);

  const needsAction = useMemo(() => rows.filter((row) => conductLevel(row.net)).length, [rows]);

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Poin bersih = poin pelanggaran − poin prestasi (minimal 0) pada tahun ajaran aktif. {needsAction > 0 ? <strong className="text-rose-700">{needsAction} siswa mencapai ambang pembinaan.</strong> : null}
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Siswa</th><th className="px-4 py-3 text-center">Pelanggaran</th><th className="px-4 py-3 text-center">Prestasi</th><th className="px-4 py-3 text-center">Poin bersih</th><th className="px-4 py-3">Tindakan</th><th className="px-4 py-3">Terakhir</th></tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Belum ada poin tercatat pada tahun ajaran ini.</td></tr>}
              {rows.map((row) => {
                const level = conductLevel(row.net);
                return (
                  <tr key={`${row.student_id}-${row.academic_year_id}`} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><Link to={`/students/show/${row.student_id}`} className="font-medium hover:underline">{row.student?.full_name || "Siswa"}</Link><p className="text-xs text-muted-foreground">{row.student?.classes?.name || "-"}</p></td>
                    <td className="px-4 py-3 text-center">{row.violation_points} <span className="text-xs text-muted-foreground">({row.violation_count})</span></td>
                    <td className="px-4 py-3 text-center">{row.achievement_points} <span className="text-xs text-muted-foreground">({row.achievement_count})</span></td>
                    <td className="px-4 py-3 text-center text-base font-bold">{row.net}</td>
                    <td className="px-4 py-3">{level ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${level.tone}`}>{level.level}</span> : <span className="text-xs text-muted-foreground">Aman</span>}{row.open_cases > 0 && <p className="mt-1 text-xs text-amber-700">{row.open_cases} kasus belum ditindaklanjuti</p>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.last_incident_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const SessionsTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ classId: "", studentId: "", session_date: new Date().toISOString().slice(0, 10), session_type: "individual", topic: "", confidential_notes: "", agreed_actions: "", next_session_date: "", status: "done", parent_notified: false });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("counseling_sessions").select("*, students(full_name, classes(name)), employees:counselor_id(full_name)").order("session_date", { ascending: false }).limit(200);
    if (error) toast.error("Sesi konseling belum dapat dimuat", { description: error.message });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
    void db.from("classes").select("id, name").order("name").then(({ data }: any) => setClasses(data || []));
  }, [load]);

  useEffect(() => {
    if (!form.classId) return;
    void db.from("students").select("id, full_name").eq("class_id", form.classId).eq("status", "active").order("full_name").then(({ data }: any) => setStudents(data || []));
  }, [form.classId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.studentId || !form.topic.trim()) return toast.error("Pilih siswa dan isi topik konseling.");
    const { data: me } = await db.rpc("current_employee_id");
    const { error } = await db.from("counseling_sessions").insert({
      student_id: form.studentId, counselor_id: me || null, session_date: form.session_date, session_type: form.session_type,
      topic: form.topic.trim(), confidential_notes: form.confidential_notes.trim() || null, agreed_actions: form.agreed_actions.trim() || null,
      next_session_date: form.next_session_date || null, status: form.status, parent_notified: form.parent_notified,
    });
    if (error) return toast.error("Sesi belum tersimpan", { description: error.message });
    toast.success("Sesi konseling tersimpan.");
    setFormOpen(false);
    setForm((current) => ({ ...current, studentId: "", topic: "", confidential_notes: "", agreed_actions: "", next_session_date: "" }));
    void load();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
        <p>Catatan konseling bersifat rahasia dan hanya dapat dibuka oleh pengelola BK dan pimpinan sekolah.</p>
        <button type="button" onClick={() => setFormOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Sesi Baru</button>
      </div>
      <div className="grid gap-3">
        {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
        {!loading && rows.length === 0 && <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada sesi konseling.</p>}
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-semibold">{row.students?.full_name} <span className="text-xs font-normal text-muted-foreground">· {row.students?.classes?.name}</span></p><p className="text-sm">{row.topic}</p></div>
              <div className="text-right text-xs text-muted-foreground"><p>{formatDate(row.session_date)} · {sessionTypeLabels[row.session_type] || row.session_type}</p><p>{row.employees?.full_name || "-"}</p></div>
            </div>
            {row.confidential_notes && <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm">{row.confidential_notes}</p>}
            {row.agreed_actions && <p className="mt-2 text-sm"><span className="font-medium">Kesepakatan:</span> {row.agreed_actions}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{row.next_session_date ? `Sesi lanjutan ${formatDate(row.next_session_date)} · ` : ""}{row.parent_notified ? "Orang tua sudah diinformasikan" : "Orang tua belum diinformasikan"}</p>
          </article>
        ))}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={(event) => void save(event)} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-lg font-semibold">Sesi Konseling</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Kelas<select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, studentId: "" })} className={`${inputClass} mt-1.5 w-full`} required><option value="">Pilih kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-sm font-medium">Siswa<select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={`${inputClass} mt-1.5 w-full`} required disabled={!form.classId}><option value="">Pilih siswa</option>{students.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
              <label className="text-sm font-medium">Tanggal<input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} className={`${inputClass} mt-1.5 w-full`} required /></label>
              <label className="text-sm font-medium">Jenis<select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })} className={`${inputClass} mt-1.5 w-full`}>{Object.entries(sessionTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm font-medium sm:col-span-2">Topik / masalah<input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={`${inputClass} mt-1.5 w-full`} required maxLength={200} /></label>
              <label className="text-sm font-medium sm:col-span-2">Catatan rahasia<textarea value={form.confidential_notes} onChange={(e) => setForm({ ...form, confidential_notes: e.target.value })} rows={3} className={`${inputClass} mt-1.5 w-full`} /></label>
              <label className="text-sm font-medium sm:col-span-2">Kesepakatan / rencana tindak lanjut<textarea value={form.agreed_actions} onChange={(e) => setForm({ ...form, agreed_actions: e.target.value })} rows={2} className={`${inputClass} mt-1.5 w-full`} /></label>
              <label className="text-sm font-medium">Sesi lanjutan<input type="date" value={form.next_session_date} onChange={(e) => setForm({ ...form, next_session_date: e.target.value })} className={`${inputClass} mt-1.5 w-full`} /></label>
              <label className="text-sm font-medium">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`${inputClass} mt-1.5 w-full`}><option value="done">Selesai</option><option value="scheduled">Terjadwal</option><option value="cancelled">Batal</option></select></label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.parent_notified} onChange={(e) => setForm({ ...form, parent_notified: e.target.checked })} className="h-4 w-4 accent-primary" /> Orang tua sudah diinformasikan</label>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm font-medium">Batal</button><button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Simpan</button></div>
          </form>
        </div>
      )}
    </section>
  );
};

const RulesTab: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState({ kind: "violation", category: "", name: "", points: "5", severity: "ringan" });

  const load = useCallback(async () => {
    const { data } = await db.from("conduct_rules").select("*").order("kind", { ascending: false }).order("category").order("points");
    setRows(data || []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error } = await db.from("conduct_rules").insert({ ...draft, points: Number(draft.points), category: draft.category.trim(), name: draft.name.trim() });
    if (error) return toast.error("Aturan belum tersimpan", { description: error.message });
    setDraft({ ...draft, name: "" });
    void load();
  };
  const toggle = async (row: any) => {
    const { error } = await db.from("conduct_rules").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <section className="space-y-4">
      {canEdit && (
        <form onSubmit={(event) => void add(event)} className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-[9rem_10rem_1fr_6rem_7rem_auto]">
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={inputClass}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Kategori" className={inputClass} required />
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nama aturan / prestasi" className={inputClass} required />
          <input type="number" min={1} max={1000} value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} className={inputClass} required aria-label="Poin" />
          <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })} className={inputClass}><option value="ringan">Ringan</option><option value="sedang">Sedang</option><option value="berat">Berat</option></select>
          <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Tambah</button>
        </form>
      )}
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3 text-center">Poin</th><th className="px-4 py-3">Tingkat</th><th className="px-4 py-3 text-right">Status</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className={row.is_active ? "" : "opacity-50"}>
                <td className="px-4 py-2.5">{kindLabels[row.kind as keyof typeof kindLabels]}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.category}</td>
                <td className="px-4 py-2.5 font-medium">{row.name}</td>
                <td className="px-4 py-2.5 text-center font-bold">{row.points}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityTones[row.severity] || ""}`}>{row.severity}</span></td>
                <td className="px-4 py-2.5 text-right">{canEdit ? <button type="button" onClick={() => void toggle(row)} className="text-xs font-semibold text-primary hover:underline">{row.is_active ? "Nonaktifkan" : "Aktifkan"}</button> : <span className="text-xs text-muted-foreground">{row.is_active ? "Aktif" : "Nonaktif"}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
