import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Activity, AlertTriangle, Award, BookOpen, CheckCircle2, ChevronRight, HeartPulse, Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { toDateInputValue } from "../leaves/leave-utils";

const categories = [
  { value: "akademik", label: "Akademik", icon: BookOpen },
  { value: "karakter", label: "Karakter", icon: Activity },
  { value: "kendala", label: "Kendala", icon: AlertTriangle },
  { value: "ekskul", label: "Prestasi/Ekskul", icon: Award },
  { value: "kasus", label: "Kasus", icon: AlertTriangle },
  { value: "kesehatan", label: "Kesehatan", icon: HeartPulse },
  { value: "anekdot", label: "Anekdot", icon: Activity },
  { value: "stppa", label: "STPPA", icon: CheckCircle2 },
];

function CategoryIcon({ category }: { category: string }) {
  const Icon = categories.find((item) => item.value === category)?.icon || Activity;
  return <Icon className="h-4 w-4" />;
}

function categoryLabel(category: string) {
  return categories.find((item) => item.value === category)?.label || category;
}

export const TeacherJournals: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const isBK = employee.position === "bk";
  const [students, setStudents] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [view, setView] = useState<"input" | "history">("input");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "karakter", title: "", description: "", action_taken: "", date_recorded: toDateInputValue(new Date()), visibility: "internal" });

  const fetchJournals = useCallback(async () => {
    let request = supabaseClient.from("student_journals").select("id, student_id, category, title, description, action_taken, date_recorded, visibility, created_at, students(full_name, nis, classes(name)), employees(full_name)").order("date_recorded", { ascending: false }).order("created_at", { ascending: false }).limit(100);
    if (selectedStudent && view === "input") request = request.eq("student_id", selectedStudent.id);
    const { data, error } = await request;
    if (error) toast.error("Riwayat jurnal belum dapat dimuat", { description: error.message });
    setJournals(data || []);
  }, [selectedStudent, view]);

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoading(true);
      let classIds: string[] = [];
      if (!isBK) {
        let scheduleQuery = supabaseClient.from("employee_schedules").select("class_id").eq("employee_id", employee.id).not("class_id", "is", null);
        if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);
        let homeroomQuery = supabaseClient.from("classes").select("id").eq("homeroom_teacher_id", employee.id);
        if (activeYearId) homeroomQuery = homeroomQuery.eq("academic_year_id", activeYearId);
        const [{ data: schedules }, { data: homerooms }] = await Promise.all([scheduleQuery, homeroomQuery]);
        classIds = Array.from(new Set([...(schedules || []).map((item: any) => item.class_id), ...(homerooms || []).map((item: any) => item.id)].filter(Boolean)));
      }
      let studentQuery = supabaseClient.from("students").select("id, full_name, nis, class_id, unit_id, classes(name)").eq("status", "active").order("full_name");
      if (isBK && employee.unit_id) studentQuery = studentQuery.eq("unit_id", employee.unit_id);
      else if (classIds.length) studentQuery = studentQuery.in("class_id", classIds);
      else { setStudents([]); setIsLoading(false); return; }
      const { data, error } = await studentQuery;
      if (error) toast.error("Daftar siswa belum dapat dimuat", { description: error.message });
      setStudents(data || []);
      setIsLoading(false);
    };
    loadStudents();
  }, [activeSemesterId, activeYearId, employee.id, employee.unit_id, isBK]);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return students.filter((student) => `${student.full_name} ${student.nis || ""} ${student.classes?.name || ""}`.toLowerCase().includes(needle)).slice(0, 8);
  }, [query, students]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    const { error } = await supabaseClient.from("student_journals").insert({
      student_id: selectedStudent.id,
      employee_id: employee.id,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      action_taken: form.action_taken.trim() || null,
      date_recorded: form.date_recorded,
      visibility: form.visibility,
      academic_year_id: activeYearId || null,
      unit_id: selectedStudent.unit_id || employee.unit_id || null,
    });
    setIsSubmitting(false);
    if (error) return toast.error("Jurnal gagal disimpan", { description: error.message });
    toast.success("Jurnal siswa berhasil disimpan.");
    setForm((current) => ({ ...current, title: "", description: "", action_taken: "", visibility: "internal" }));
    fetchJournals();
  };

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header><div className="flex items-center gap-2"><BookOpen className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Jurnal Perkembangan Siswa</h1></div><p className="mt-1 text-sm text-gray-500">Catat perkembangan, kendala, tindak lanjut, dan informasi yang boleh dilihat orang tua.</p></header>

      <div className="flex rounded-md border bg-white p-1"><button onClick={() => setView("input")} className={`flex-1 rounded px-3 py-2 text-xs font-bold ${view === "input" ? "bg-emerald-700 text-white" : "text-gray-600"}`}>Catat Jurnal</button><button onClick={() => setView("history")} className={`flex-1 rounded px-3 py-2 text-xs font-bold ${view === "history" ? "bg-emerald-700 text-white" : "text-gray-600"}`}>{isBK ? "Rekap Unit" : "Riwayat Kelas"}</button></div>

      {view === "input" && !selectedStudent && <section className="rounded-md border bg-white p-4"><label htmlFor="journal-student-search" className="mb-2 block text-sm font-bold text-gray-900">Pilih siswa</label><div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><input id="journal-student-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, NIS, atau kelas" className="h-11 w-full rounded-md border pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></div>{query && <div className="mt-2 max-h-72 divide-y overflow-y-auto rounded-md border">{filteredStudents.map((student) => <button key={student.id} onClick={() => { setSelectedStudent(student); setQuery(""); }} className="flex w-full items-center justify-between p-3 text-left hover:bg-emerald-50"><div><p className="text-sm font-bold text-gray-900">{student.full_name}</p><p className="text-xs text-gray-500">{student.classes?.name || "Tanpa kelas"} - NIS {student.nis || "-"}</p></div><ChevronRight className="h-4 w-4 text-gray-400" /></button>)}{!filteredStudents.length && <p className="p-4 text-center text-sm text-gray-500">Siswa tidak ditemukan dalam penugasan Anda.</p>}</div>}{!isLoading && !students.length && <p className="mt-3 text-sm text-amber-700">Belum ada siswa yang terkait dengan penugasan aktif Anda.</p>}</section>}

      {view === "input" && selectedStudent && <section className="overflow-hidden rounded-md border bg-white"><div className="flex items-center justify-between border-b bg-emerald-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><User className="h-5 w-5" /></div><div><p className="text-xs font-bold text-emerald-700">Siswa terpilih</p><h2 className="font-bold text-gray-950">{selectedStudent.full_name}</h2><p className="text-xs text-gray-500">{selectedStudent.classes?.name} - NIS {selectedStudent.nis || "-"}</p></div></div><button onClick={() => setSelectedStudent(null)} className="rounded-md border bg-white px-3 py-2 text-xs font-bold text-gray-700">Ganti</button></div><form onSubmit={handleSubmit} className="grid gap-4 p-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold text-gray-700">Tanggal catatan</label><input type="date" required max={toDateInputValue(new Date())} value={form.date_recorded} onChange={(event) => setForm({ ...form, date_recorded: event.target.value })} className="h-11 w-full rounded-md border px-3 text-sm" /></div><div><label className="mb-1 block text-xs font-bold text-gray-700">Akses orang tua</label><select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} className="h-11 w-full rounded-md border px-3 text-sm"><option value="internal">Internal sekolah</option><option value="parents">Dapat dilihat orang tua</option></select></div><div className="md:col-span-2"><label className="mb-2 block text-xs font-bold text-gray-700">Kategori</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map((item) => <button key={item.value} type="button" onClick={() => setForm({ ...form, category: item.value })} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-bold ${form.category === item.value ? "border-emerald-700 bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</div></div><div className="md:col-span-2"><label className="mb-1 block text-xs font-bold text-gray-700">Judul catatan</label><input required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ringkasan kejadian atau perkembangan" className="h-11 w-full rounded-md border px-3 text-sm" /></div><div className="md:col-span-2"><label className="mb-1 block text-xs font-bold text-gray-700">Uraian faktual</label><textarea required rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Tuliskan fakta yang diamati, hindari label atau asumsi terhadap siswa." className="w-full rounded-md border p-3 text-sm" /></div><div className="md:col-span-2"><label className="mb-1 block text-xs font-bold text-gray-700">Tindak lanjut</label><textarea rows={2} value={form.action_taken} onChange={(event) => setForm({ ...form, action_taken: event.target.value })} placeholder="Pendampingan, komunikasi orang tua, atau rencana tindak lanjut" className="w-full rounded-md border p-3 text-sm" /></div><div className="md:col-span-2 flex justify-end"><button disabled={isSubmitting} className="flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Simpan Jurnal</button></div></form></section>}

      {(view === "history" || selectedStudent) && <section className="space-y-3"><h2 className="text-sm font-bold text-gray-900">{view === "history" ? "Riwayat jurnal" : "Catatan terakhir siswa"}</h2>{journals.length === 0 ? <div className="rounded-md border border-dashed bg-white p-8 text-center text-sm text-gray-500">Belum ada jurnal dalam cakupan ini.</div> : journals.map((journal) => <article key={journal.id} className="rounded-md border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-center gap-2"><span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-700"><CategoryIcon category={journal.category} />{categoryLabel(journal.category)}</span>{journal.visibility === "parents" && <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Orang tua</span>}</div><span className="text-xs text-gray-500">{new Date(`${journal.date_recorded}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span></div><h3 className="mt-3 font-bold text-gray-950">{journal.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">{journal.description}</p>{journal.action_taken && <div className="mt-3 rounded-md bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">Tindak lanjut</p><p className="mt-1 text-sm text-emerald-900">{journal.action_taken}</p></div>}<div className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-3 text-xs text-gray-500"><span>{journal.students?.full_name}{journal.students?.classes?.name ? ` - ${journal.students.classes.name}` : ""}</span><span>Dicatat oleh {journal.employees?.full_name || "Pengajar"}</span></div></article>)}</section>}
    </div>
  );
};
