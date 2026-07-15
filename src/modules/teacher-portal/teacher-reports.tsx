import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, FileText, Filter, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { toDateInputValue } from "../leaves/leave-utils";

const statusLabels: Record<string, string> = {
  draft: "Belum diisi", teacher_input: "Sedang diisi", homeroom_review: "Review wali kelas", revision_needed: "Perlu revisi", wakasek_review: "Review wakasek", principal_approval: "Persetujuan kepala sekolah", approved: "Disetujui", published: "Terbit", archived: "Arsip",
};
const editableStatuses = new Set(["draft", "teacher_input", "revision_needed"]);

export const TeacherReports: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [classes, setClasses] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [classId, setClassId] = useState("all");
  const [periodId, setPeriodId] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      let scheduleQuery = supabaseClient.from("employee_schedules").select("class_id, classes(id, name, unit_id)").eq("employee_id", employee.id).not("class_id", "is", null);
      if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
      if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);
      let homeroomQuery = supabaseClient.from("classes").select("id, name, unit_id").eq("homeroom_teacher_id", employee.id);
      if (activeYearId) homeroomQuery = homeroomQuery.eq("academic_year_id", activeYearId);
      const [{ data: schedules, error: scheduleError }, { data: homerooms }] = await Promise.all([scheduleQuery, homeroomQuery]);
      if (scheduleError) toast.error("Penugasan kelas belum dapat dimuat", { description: scheduleError.message });

      const classMap = new Map<string, any>();
      (schedules || []).forEach((row: any) => row.classes?.id && classMap.set(row.classes.id, row.classes));
      (homerooms || []).forEach((row: any) => classMap.set(row.id, row));
      const assignedClasses = Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setClasses(assignedClasses);
      const classIds = assignedClasses.map((item) => item.id);
      const unitIds = Array.from(new Set(assignedClasses.map((item) => item.unit_id).filter(Boolean)));
      if (!classIds.length) { setPeriods([]); setReports([]); setIsLoading(false); return; }

      let periodQuery = supabaseClient.from("report_periods").select("id, name, unit_id, status, input_start_date, input_due_date, report_type").in("unit_id", unitIds).in("status", ["active", "closed"]).order("input_due_date", { ascending: false });
      if (activeYearId) periodQuery = periodQuery.eq("academic_year_id", activeYearId);
      const [{ data: periodRows }, { data: reportRows, error: reportError }] = await Promise.all([
        periodQuery,
        supabaseClient.from("student_reports").select("id, class_id, report_period_id, status, updated_at, students(full_name, nis, nisn), classes(name), report_periods(name, input_due_date, status)").in("class_id", classIds).neq("status", "archived").order("updated_at", { ascending: false }),
      ]);
      if (reportError) toast.error("Rapor siswa belum dapat dimuat", { description: reportError.message });
      setPeriods(periodRows || []);
      setReports(reportRows || []);
      setIsLoading(false);
    };
    loadReports();
  }, [activeSemesterId, activeYearId, employee.id]);

  const filtered = useMemo(() => reports.filter((report) => (classId === "all" || report.class_id === classId) && (periodId === "all" || report.report_period_id === periodId)), [classId, periodId, reports]);
  const pending = reports.filter((report) => editableStatuses.has(report.status)).length;
  const revisions = reports.filter((report) => report.status === "revision_needed").length;
  const completed = reports.filter((report) => ["approved", "published"].includes(report.status)).length;
  const today = toDateInputValue(new Date());

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header><div className="flex items-center gap-2"><FileText className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Rapor Digital</h1></div><p className="mt-1 text-sm text-gray-500">Isi rapor hanya untuk siswa pada kelas yang menjadi penugasan Anda.</p></header>
      <section className="grid grid-cols-3 gap-3">{[{ label: "Perlu diisi", value: pending, icon: FileText, tone: "bg-blue-50 text-blue-700" }, { label: "Perlu revisi", value: revisions, icon: AlertCircle, tone: "bg-amber-50 text-amber-700" }, { label: "Disetujui/terbit", value: completed, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }].map((item) => <div key={item.label} className="rounded-md border bg-white p-3 md:p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-xl font-bold text-gray-950">{item.value}</p><p className="text-xs font-medium text-gray-500">{item.label}</p></div>)}</section>

      <section className="grid gap-3 rounded-md border bg-white p-3 sm:grid-cols-2"><label className="flex items-center gap-2"><Filter className="h-4 w-4 text-gray-400" /><select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 w-full rounded-md border px-3 text-sm outline-none"><option value="all">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className="h-10 rounded-md border px-3 text-sm outline-none"><option value="all">Semua periode rapor</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></section>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : classes.length === 0 ? <div className="rounded-md border border-dashed bg-white p-10 text-center"><Users className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-bold text-gray-700">Belum ada kelas yang ditugaskan</p><p className="mt-1 text-sm text-gray-500">Minta admin menambahkan jadwal mengajar atau penugasan wali kelas.</p></div> : filtered.length === 0 ? <div className="rounded-md border border-dashed bg-white p-10 text-center"><FileText className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-bold text-gray-700">Rapor belum disiapkan</p><p className="mt-1 text-sm text-gray-500">Admin kurikulum perlu membuat periode dan menghasilkan rapor siswa terlebih dahulu.</p></div> : <div className="overflow-hidden rounded-md border bg-white"><div className="hidden grid-cols-[1.4fr_.8fr_1fr_.7fr_auto] gap-3 border-b bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 md:grid"><span>Siswa</span><span>Kelas</span><span>Periode</span><span>Status</span><span /></div>{filtered.map((report) => {
        const dueDate = report.report_periods?.input_due_date;
        const overdue = editableStatuses.has(report.status) && dueDate && dueDate < today;
        return <Link key={report.id} to={`/teacher/reports/${report.id}`} className="grid gap-2 border-b p-4 last:border-0 hover:bg-emerald-50/40 md:grid-cols-[1.4fr_.8fr_1fr_.7fr_auto] md:items-center md:gap-3"><div><p className="font-bold text-gray-950">{report.students?.full_name}</p><p className="text-xs text-gray-500">NIS: {report.students?.nis || report.students?.nisn || "-"}</p></div><p className="text-sm text-gray-600">{report.classes?.name}</p><div><p className="text-sm font-medium text-gray-700">{report.report_periods?.name}</p>{dueDate && <p className={`mt-1 flex items-center gap-1 text-xs ${overdue ? "font-bold text-red-700" : "text-gray-500"}`}><CalendarDays className="h-3 w-3" />{overdue ? "Lewat batas " : "Batas "}{new Date(`${dueDate}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>}</div><span className={`w-fit rounded px-2 py-1 text-[10px] font-bold ${report.status === "revision_needed" ? "bg-amber-100 text-amber-800" : editableStatuses.has(report.status) ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-800"}`}>{statusLabels[report.status] || report.status}</span><ChevronRight className="hidden h-5 w-5 text-gray-400 md:block" /></Link>;
      })}</div>}
    </div>
  );
};
