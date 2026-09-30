/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { BookOpenCheck, CalendarClock, ClipboardList, Loader2, Pencil, Plus, Printer, Send, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { getCbtScope } from "../../recruitment/cbt/cbt-scope";

const db = supabaseClient as any;

const gradeTypeLabels: Record<string, string> = {
  formatif: "Asesmen Formatif",
  sumatif_lingkup: "Sumatif Lingkup Materi",
  sts: "Sumatif Tengah Semester (STS)",
  sas: "Sumatif Akhir Semester (SAS)",
  asat: "Asesmen Sumatif Akhir Tahun (ASAT)",
};
const statusLabels: Record<string, string> = { pending: "Belum mulai", in_progress: "Mengerjakan", completed: "Selesai" };
const inputClass = "mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";

// datetime-local <-> ISO in the browser's time zone
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);
const formatDateTime = (iso?: string | null) => iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

type ExamForm = {
  id?: string; title: string; subject_id: string; semester_id: string; grade_type: string; duration_minutes: string;
  passing_grade: string; starts_at: string; ends_at: string; randomize_questions: boolean; show_score: boolean; publish_to_gradebook: boolean;
  banks: Record<string, string>;
};
const emptyForm: ExamForm = {
  title: "", subject_id: "", semester_id: "", grade_type: "sts", duration_minutes: "60", passing_grade: "75", starts_at: "", ends_at: "",
  randomize_questions: true, show_score: false, publish_to_gradebook: true, banks: {},
};

export const StudentCbtPage: React.FC = () => {
  const { pathname } = useLocation();
  const { banksPath } = getCbtScope(pathname);
  const isTeacherPortal = pathname.startsWith("/teacher");
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [form, setForm] = useState<ExamForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [openExamId, setOpenExamId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("cbt_exams")
      .select("*, subjects(name), semesters(name, academic_years(name)), cbt_exam_banks(bank_id, question_count), cbt_participants(id, status)")
      .eq("audience", "student").order("created_at", { ascending: false });
    if (error) toast.error("Ujian belum dapat dimuat", { description: error.message });
    setExams(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
    void Promise.all([
      db.from("subjects").select("id, name").eq("is_active", true).order("name"),
      db.from("semesters").select("id, name, is_active, academic_years(name)").order("created_at", { ascending: false }),
      db.from("cbt_banks").select("id, name, cbt_questions(count)").eq("audience", "student").order("name"),
    ]).then(([subjectResult, semesterResult, bankResult]: any[]) => {
      setSubjects(subjectResult.data || []);
      setSemesters(semesterResult.data || []);
      setBanks(bankResult.data || []);
    });
  }, [load]);

  const openEditor = (exam?: any) => {
    if (!exam) {
      const activeSemester = semesters.find((item) => item.is_active);
      setForm({ ...emptyForm, semester_id: activeSemester?.id || "" });
      return;
    }
    setForm({
      id: exam.id, title: exam.title, subject_id: exam.subject_id || "", semester_id: exam.semester_id || "", grade_type: exam.grade_type || "sts",
      duration_minutes: String(exam.duration_minutes), passing_grade: String(exam.passing_grade), starts_at: toLocalInput(exam.starts_at), ends_at: toLocalInput(exam.ends_at),
      randomize_questions: exam.randomize_questions, show_score: exam.show_score, publish_to_gradebook: exam.publish_to_gradebook,
      banks: Object.fromEntries((exam.cbt_exam_banks || []).map((row: any) => [row.bank_id, String(row.question_count)])),
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const selectedBanks = Object.entries(form.banks).filter(([, count]) => Number(count) > 0);
    if (!form.title.trim() || !form.subject_id || !form.semester_id) return toast.error("Isi judul, mapel, dan semester.");
    if (selectedBanks.length === 0) return toast.error("Pilih minimal satu bank soal dan jumlah soalnya.");
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) return toast.error("Waktu tutup harus setelah waktu buka.");
    setSaving(true);
    const payload = {
      title: form.title.trim(), audience: "student", subject_id: form.subject_id, semester_id: form.semester_id, grade_type: form.grade_type,
      duration_minutes: Number(form.duration_minutes), passing_grade: Number(form.passing_grade), starts_at: fromLocalInput(form.starts_at), ends_at: fromLocalInput(form.ends_at),
      randomize_questions: form.randomize_questions, show_score: form.show_score, publish_to_gradebook: form.publish_to_gradebook,
    };
    const result = form.id
      ? await db.from("cbt_exams").update(payload).eq("id", form.id).select("id").single()
      : await db.from("cbt_exams").insert(payload).select("id").single();
    if (result.error) { setSaving(false); return toast.error("Ujian belum tersimpan", { description: result.error.message }); }
    const examId = result.data.id;
    await db.from("cbt_exam_banks").delete().eq("exam_id", examId);
    const { error: bankError } = await db.from("cbt_exam_banks").insert(selectedBanks.map(([bankId, count]) => ({ exam_id: examId, bank_id: bankId, question_count: Number(count) })));
    setSaving(false);
    if (bankError) return toast.error("Komposisi bank soal belum tersimpan", { description: bankError.message });
    toast.success("Ujian tersimpan.");
    setForm(null);
    void load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><BookOpenCheck className="h-6 w-6 text-primary" /><h1 className="text-xl font-bold">Ujian CBT Siswa</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">Susun ulangan, STS, SAS, atau ASAT berbasis komputer. Nilai dihitung server dan dapat langsung masuk Gradebook.</p>
        </div>
        <div className="flex gap-2">
          <Link to={banksPath} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"><ClipboardList className="h-4 w-4" /> Bank Soal</Link>
          <button type="button" onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Ujian Baru</button>
        </div>
      </header>
      {banks.length === 0 && !loading && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Belum ada bank soal siswa. Buat bank soal dan isi soalnya terlebih dahulu melalui tombol <strong>Bank Soal</strong>.</p>
      )}

      <div className="space-y-3">
        {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
        {!loading && exams.length === 0 && <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada ujian siswa.</p>}
        {exams.map((exam) => {
          const participants = exam.cbt_participants || [];
          const done = participants.filter((p: any) => p.status === "completed").length;
          const questionTotal = (exam.cbt_exam_banks || []).reduce((sum: number, row: any) => sum + Number(row.question_count || 0), 0);
          return (
            <article key={exam.id} className="rounded-xl border bg-card">
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{exam.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{exam.subjects?.name || "-"} · {gradeTypeLabels[exam.grade_type] || "-"} · {exam.semesters?.academic_years?.name} {exam.semesters?.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {exam.starts_at ? `${formatDateTime(exam.starts_at)} – ${formatDateTime(exam.ends_at)}` : "Tanpa jendela waktu"}</span>
                    <span>{exam.duration_minutes} menit · {questionTotal} soal · KKM {exam.passing_grade}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {done}/{participants.length} selesai</span>
                    {exam.publish_to_gradebook && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">→ Gradebook</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEditor(exam)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"><Pencil className="h-4 w-4" /> Atur</button>
                  <button type="button" onClick={() => setOpenExamId(openExamId === exam.id ? null : exam.id)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"><Users className="h-4 w-4" /> Peserta & Hasil</button>
                </div>
              </div>
              {openExamId === exam.id && <ParticipantsPanel exam={exam} onChanged={() => void load()} restrictToTeacher={isTeacherPortal} />}
            </article>
          );
        })}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="exam-form-title">
          <form onSubmit={(event) => void save(event)} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 id="exam-form-title" className="text-lg font-semibold">{form.id ? "Atur Ujian" : "Ujian Baru"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">Judul ujian<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="STS Matematika Kelas 5" required /></label>
              <label className="text-sm font-medium">Mata pelajaran<select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className={inputClass} required><option value="">Pilih mapel</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-sm font-medium">Semester<select value={form.semester_id} onChange={(e) => setForm({ ...form, semester_id: e.target.value })} className={inputClass} required><option value="">Pilih semester</option>{semesters.map((item) => <option key={item.id} value={item.id}>{item.academic_years?.name} · {item.name}{item.is_active ? " (aktif)" : ""}</option>)}</select></label>
              <label className="text-sm font-medium">Jenis penilaian<select value={form.grade_type} onChange={(e) => setForm({ ...form, grade_type: e.target.value })} className={inputClass}>{Object.entries(gradeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">Durasi (menit)<input type="number" min={5} max={300} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={inputClass} required /></label>
                <label className="text-sm font-medium">KKM<input type="number" min={1} max={100} value={form.passing_grade} onChange={(e) => setForm({ ...form, passing_grade: e.target.value })} className={inputClass} required /></label>
              </div>
              <label className="text-sm font-medium">Dibuka<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputClass} /></label>
              <label className="text-sm font-medium">Ditutup<input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputClass} /></label>
              <fieldset className="rounded-lg border p-3 sm:col-span-2">
                <legend className="px-1 text-sm font-medium">Bank soal & jumlah soal diambil</legend>
                {banks.length === 0 && <p className="text-sm text-muted-foreground">Belum ada bank soal siswa.</p>}
                <div className="space-y-2">
                  {banks.map((bank) => {
                    const available = bank.cbt_questions?.[0]?.count ?? 0;
                    return (
                      <label key={bank.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>{bank.name} <span className="text-xs text-muted-foreground">({available} soal tersedia)</span></span>
                        <input type="number" min={0} max={available} value={form.banks[bank.id] || ""} placeholder="0"
                          onChange={(e) => setForm({ ...form, banks: { ...form.banks, [bank.id]: e.target.value } })}
                          className="w-20 rounded-md border bg-background px-2 py-1 text-right" aria-label={`Jumlah soal dari ${bank.name}`} />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.randomize_questions} onChange={(e) => setForm({ ...form, randomize_questions: e.target.checked })} className="h-4 w-4 accent-primary" /> Acak urutan soal per siswa</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_score} onChange={(e) => setForm({ ...form, show_score: e.target.checked })} className="h-4 w-4 accent-primary" /> Tampilkan nilai ke siswa setelah selesai</label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.publish_to_gradebook} onChange={(e) => setForm({ ...form, publish_to_gradebook: e.target.checked })} className="h-4 w-4 accent-primary" /> Kirim nilai otomatis ke Gradebook (komponen sesuai jenis penilaian)</label>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button type="button" onClick={() => setForm(null)} className="rounded-md border px-4 py-2 text-sm font-medium">Batal</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const ParticipantsPanel: React.FC<{ exam: any; onChanged: () => void; restrictToTeacher: boolean }> = ({ exam, onChanged, restrictToTeacher }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from("cbt_participants").select("id, token, status, score, is_passed, completed_at, students(full_name, nis), classes(name)").eq("exam_id", exam.id);
    setRows((data || []).sort((a: any, b: any) => `${a.classes?.name}${a.students?.full_name}`.localeCompare(`${b.classes?.name}${b.students?.full_name}`)));
  }, [exam.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
    void (async () => {
      let classIds: string[] | null = null;
      if (restrictToTeacher) {
        const { data: me } = await db.rpc("current_employee_id");
        if (me) {
          const [{ data: assigned }, { data: homeroom }] = await Promise.all([
            db.from("teacher_assignments").select("class_id").eq("employee_id", me).eq("is_active", true),
            db.from("classes").select("id").eq("homeroom_teacher_id", me),
          ]);
          classIds = [...new Set([...(assigned || []).map((row: any) => row.class_id), ...(homeroom || []).map((row: any) => row.id)].filter(Boolean))];
        }
      }
      let query = db.from("classes").select("id, name").order("name");
      if (classIds) query = query.in("id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data } = await query;
      setClasses(data || []);
    })();
  }, [load, restrictToTeacher]);

  const enroll = async () => {
    if (!classId) return;
    setBusy(true);
    const { data, error } = await db.rpc("cbt_enroll_class", { p_exam_id: exam.id, p_class_id: classId });
    setBusy(false);
    if (error) return toast.error("Kelas belum terdaftar", { description: error.message });
    toast.success(data > 0 ? `${data} siswa didaftarkan.` : "Semua siswa kelas ini sudah terdaftar.");
    void load(); onChanged();
  };

  const publish = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("cbt_publish_exam_scores", { p_exam_id: exam.id });
    setBusy(false);
    if (error) return toast.error("Nilai belum terkirim", { description: error.message });
    toast.success(`${data} nilai dikirim ke Gradebook.`);
  };

  const summary = useMemo(() => {
    const done = rows.filter((row) => row.status === "completed");
    const average = done.length ? Math.round(done.reduce((sum, row) => sum + Number(row.score || 0), 0) / done.length) : null;
    return { done: done.length, passed: done.filter((row) => row.is_passed).length, average };
  }, [rows]);

  const printCards = () => {
    const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));
    const cards = rows.map((row) => `<div class="card"><div class="title">${escape(exam.title)}</div><div class="name">${escape(row.students?.full_name)}</div><div class="meta">${escape(row.classes?.name)} · NIS ${escape(row.students?.nis || "-")}</div><div class="token">${escape(row.token)}</div><div class="url">Buka ${escape(window.location.origin)}/cbt lalu masukkan token</div></div>`).join("");
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return toast.error("Izinkan pop-up untuk mencetak kartu token.");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Kartu Token ${escape(exam.title)}</title><style>
      body{font-family:Arial,sans-serif;margin:12mm}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}
      .card{border:1px dashed #555;border-radius:6px;padding:5mm;break-inside:avoid}.title{font-size:11px;color:#555}
      .name{font-weight:700;font-size:15px;margin-top:2mm}.meta{font-size:11px;color:#555}.token{font-family:monospace;font-size:22px;letter-spacing:2px;margin:3mm 0;font-weight:700}
      .url{font-size:10px;color:#555}</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-3 border-t bg-muted/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" aria-label="Pilih kelas">
          <option value="">Pilih kelas untuk didaftarkan</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button type="button" disabled={!classId || busy} onClick={() => void enroll()} className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Daftarkan kelas</button>
        <div className="flex gap-2 md:ml-auto">
          <button type="button" disabled={!rows.length} onClick={printCards} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"><Printer className="h-4 w-4" /> Cetak kartu token</button>
          {exam.publish_to_gradebook && <button type="button" disabled={busy || !summary.done} onClick={() => void publish()} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"><Send className="h-4 w-4" /> Kirim ulang ke Gradebook</button>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} peserta · {summary.done} selesai · {summary.passed} tuntas KKM{summary.average !== null ? ` · rata-rata ${summary.average}` : ""}</p>
      <div className="max-h-96 overflow-auto rounded-lg border bg-card">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="sticky top-0 border-b bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Siswa</th><th className="px-3 py-2">Kelas</th><th className="px-3 py-2">Token</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Nilai</th></tr></thead>
          <tbody className="divide-y">
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Belum ada peserta. Daftarkan kelas di atas.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-medium">{row.students?.full_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.classes?.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.token}</td>
                <td className="px-3 py-2 text-xs">{statusLabels[row.status] || row.status}</td>
                <td className={`px-3 py-2 text-right font-bold ${row.status === "completed" ? (row.is_passed ? "text-emerald-700" : "text-rose-700") : "text-muted-foreground"}`}>{row.status === "completed" ? row.score : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
