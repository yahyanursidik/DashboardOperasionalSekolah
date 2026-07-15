/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle2, Circle, ListTodo, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { toDateInputValue } from "../leaves/leave-utils";
import { EmployeeDispositionsSection } from "../mail/components/EmployeeDispositionsSection";

const finishedStatuses = new Set(["selesai", "completed", "cancelled"]);
const statusMeta: Record<string, { label: string; tone: string }> = {
  belum_mulai: { label: "Belum dimulai", tone: "bg-gray-100 text-gray-700" }, pending: { label: "Belum dimulai", tone: "bg-gray-100 text-gray-700" },
  diproses: { label: "Dikerjakan", tone: "bg-blue-100 text-blue-700" }, in_progress: { label: "Dikerjakan", tone: "bg-blue-100 text-blue-700" },
  menunggu_pihak_lain: { label: "Menunggu", tone: "bg-amber-100 text-amber-800" }, ditunda: { label: "Ditunda", tone: "bg-amber-100 text-amber-800" },
  selesai: { label: "Selesai", tone: "bg-emerald-100 text-emerald-800" }, completed: { label: "Selesai", tone: "bg-emerald-100 text-emerald-800" }, cancelled: { label: "Dibatalkan", tone: "bg-red-100 text-red-700" },
};
const priorityLabel: Record<string, string> = { low: "Rendah", medium: "Normal", high: "Tinggi", urgent: "Mendesak" };

export const StaffTasks: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<"open" | "finished" | "all">("open");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadTasks = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return setIsLoading(false);
    const { data, error } = await supabaseClient.from("admin_tasks").select("id,title,description,priority,status,due_date,completed_at,created_at,units(name)").eq("assigned_to", user.id).order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) toast.error("Tugas belum dapat dimuat", { description: error.message });
    setTasks(data || []);
    setIsLoading(false);
  };
  useEffect(() => { void loadTasks(); }, []);

  const today = toDateInputValue(new Date());
  const openTasks = tasks.filter((task) => !finishedStatuses.has(task.status));
  const overdue = openTasks.filter((task) => task.due_date && task.due_date < today).length;
  const filtered = useMemo(() => tasks.filter((task) => filter === "all" || (filter === "finished" ? finishedStatuses.has(task.status) : !finishedStatuses.has(task.status))), [filter, tasks]);

  const updateStatus = async (task: any, action: "start" | "finish") => {
    setUpdatingId(task.id);
    const indonesian = ["belum_mulai", "diproses", "menunggu_pihak_lain", "selesai", "ditunda"].includes(task.status);
    const status = action === "finish" ? (indonesian ? "selesai" : "completed") : (indonesian ? "diproses" : "in_progress");
    const { error } = await supabaseClient.from("admin_tasks").update({ status, completed_at: action === "finish" ? new Date().toISOString() : null }).eq("id", task.id);
    setUpdatingId(null);
    if (error) return toast.error("Status tugas gagal diperbarui", { description: error.message });
    toast.success(action === "finish" ? "Tugas ditandai selesai." : "Tugas mulai dikerjakan.");
    await loadTasks();
  };

  return <div className="space-y-5 p-4 md:p-0">
    <header><div className="flex items-center gap-2"><ListTodo className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Tugas Saya</h1></div><p className="mt-1 text-sm text-gray-500">Daftar pekerjaan operasional yang ditugaskan oleh admin atau pimpinan.</p></header>
    <section className="grid grid-cols-3 gap-3">{[{ label: "Aktif", value: openTasks.length, icon: Circle, tone: "bg-blue-50 text-blue-700" }, { label: "Terlambat", value: overdue, icon: AlertTriangle, tone: "bg-red-50 text-red-700" }, { label: "Selesai", value: tasks.length - openTasks.length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }].map((item) => <div key={item.label} className="rounded-md border bg-white p-3 md:p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-xl font-bold text-gray-950">{item.value}</p><p className="text-xs font-medium text-gray-500">{item.label}</p></div>)}</section>
    <div className="flex gap-1 rounded-md border bg-white p-1">{(["open", "finished", "all"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`flex-1 rounded px-3 py-2 text-xs font-bold ${filter === value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{value === "open" ? "Aktif" : value === "finished" ? "Selesai" : "Semua"}</button>)}</div>
    {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : filtered.length === 0 ? <div className="rounded-md border border-dashed bg-white p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 font-bold text-gray-700">Tidak ada tugas pada daftar ini</p><p className="mt-1 text-sm text-gray-500">Tugas baru dari admin akan tampil otomatis.</p></div> : <div className="space-y-3">{filtered.map((task) => { const done = finishedStatuses.has(task.status); const isOverdue = !done && task.due_date && task.due_date < today; const meta = statusMeta[task.status] || { label: task.status, tone: "bg-gray-100 text-gray-700" }; return <article key={task.id} className={`rounded-md border bg-white p-4 ${isOverdue ? "border-red-300" : ""}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${meta.tone}`}>{meta.label}</span><span className={`text-[10px] font-bold uppercase ${task.priority === "urgent" ? "text-red-700" : "text-gray-500"}`}>{priorityLabel[task.priority] || task.priority}</span></div><h2 className="font-bold text-gray-950">{task.title}</h2>{task.description && <p className="mt-1 text-sm leading-6 text-gray-600">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">{task.due_date && <span className={`flex items-center gap-1 ${isOverdue ? "font-bold text-red-700" : ""}`}><CalendarDays className="h-3.5 w-3.5" />{isOverdue ? "Terlambat: " : "Batas: "}{new Date(`${task.due_date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>}<span>{task.units?.name || "Lintas unit"}</span></div></div>{!done && <div className="flex shrink-0 gap-2">{!["diproses", "in_progress"].includes(task.status) && <button disabled={updatingId === task.id} onClick={() => void updateStatus(task, "start")} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold text-gray-700"><PlayCircle className="h-4 w-4" />Mulai</button>}<button disabled={updatingId === task.id} onClick={() => void updateStatus(task, "finish")} className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white">{updatingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Selesai</button></div>}</div></article>; })}</div>}
    <EmployeeDispositionsSection employeeId={employee.id} />
  </div>;
};
