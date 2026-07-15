/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, FileSignature, Loader2, MessageSquareText, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";

const finishedStatuses = new Set(["completed", "returned"]);
const statusLabels: Record<string, string> = {
  pending: "Baru",
  accepted: "Diterima",
  in_progress: "Dikerjakan",
  waiting: "Menunggu",
  completed: "Selesai",
  returned: "Dikembalikan",
};

interface EmployeeDispositionsSectionProps {
  employeeId: string;
}

export const EmployeeDispositionsSection: React.FC<EmployeeDispositionsSectionProps> = ({ employeeId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    if (!employeeId) return;
    setIsLoading(true);
    const { data, error } = await supabaseClient
      .from("mail_dispositions")
      .select("id,mail_id,instruction,disposition_type,priority,status,due_date,response_note,started_at,completed_at,created_at,mail_records(title,agenda_number,mail_number,sender,unit_id,units(name)),from_employee:employees!mail_dispositions_from_employee_id_fkey(full_name)")
      .eq("to_employee_id", employeeId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) toast.error("Disposisi belum dapat dimuat", { description: error.message });
    setItems(data || []);
    setIsLoading(false);
  };

  // Reload when the signed-in employee changes; this state is isolated per portal session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [employeeId]);

  const openItems = useMemo(() => items.filter((item) => !finishedStatuses.has(item.status)), [items]);
  const overdue = openItems.filter((item) => item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date()).length;

  const updateStatus = async (status: "accepted" | "in_progress" | "waiting" | "completed") => {
    if (!selected) return;
    if (status === "completed" && response.trim().length < 5) return toast.error("Tuliskan hasil tindak lanjut minimal 5 karakter.");
    setIsSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabaseClient.from("mail_dispositions").update({
      status,
      response_note: response.trim() || selected.response_note || null,
      started_at: ["accepted", "in_progress"].includes(status) && !selected.started_at ? now : selected.started_at,
      completed_at: status === "completed" ? now : null,
    }).eq("id", selected.id).eq("to_employee_id", employeeId);
    setIsSaving(false);
    if (error) return toast.error("Status disposisi gagal diperbarui", { description: error.message });
    toast.success(status === "completed" ? "Disposisi selesai dan hasilnya tercatat." : "Status disposisi diperbarui.");
    setSelected(null);
    setResponse("");
    await load();
  };

  return <section className="space-y-4 border-t pt-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-bold text-gray-950">Disposisi Surat</h2></div><p className="mt-1 text-sm text-gray-500">Instruksi resmi Tata Usaha atau pimpinan yang perlu ditindaklanjuti.</p></div><div className="flex gap-2 text-xs font-bold"><span className="rounded bg-blue-50 px-2.5 py-1.5 text-blue-700">{openItems.length} aktif</span>{overdue > 0 && <span className="flex items-center gap-1 rounded bg-red-50 px-2.5 py-1.5 text-red-700"><AlertTriangle className="h-3.5 w-3.5" />{overdue} terlambat</span>}</div></header>
    {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" /></div> : openItems.length === 0 ? <div className="rounded-md border border-dashed bg-white p-8 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" /><p className="mt-2 font-bold text-gray-700">Tidak ada disposisi aktif</p><p className="mt-1 text-sm text-gray-500">Instruksi baru akan tampil otomatis di bagian ini.</p></div> : <div className="grid gap-3 lg:grid-cols-2">{openItems.map((item) => { const late = item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date(); return <button key={item.id} onClick={() => { setSelected(item); setResponse(item.response_note || ""); }} className={`rounded-md border bg-white p-4 text-left transition-colors hover:border-emerald-300 ${late ? "border-red-300" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-emerald-700">{item.mail_records?.agenda_number || item.mail_records?.mail_number || "SURAT"}</p><h3 className="mt-1 truncate font-bold text-gray-950">{item.mail_records?.title}</h3></div><span className="shrink-0 rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-700">{statusLabels[item.status] || item.status}</span></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{item.instruction}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500"><span>{item.from_employee?.full_name || "Tata Usaha"}</span><span>{item.mail_records?.units?.name || "Lintas unit"}</span><span className={`flex items-center gap-1 ${late ? "font-bold text-red-700" : ""}`}><CalendarClock className="h-3.5 w-3.5" />{item.due_date ? new Date(`${item.due_date}T00:00:00`).toLocaleDateString("id-ID") : "Tanpa tenggat"}</span></div></button>; })}</div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="disposition-title" className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"><div className="border-b pb-4"><p className="text-xs font-bold text-emerald-700">{selected.mail_records?.agenda_number || selected.mail_records?.mail_number}</p><h3 id="disposition-title" className="mt-1 text-lg font-bold text-gray-950">{selected.mail_records?.title}</h3><p className="mt-1 text-xs text-gray-500">Dari {selected.from_employee?.full_name || "Tata Usaha"}</p></div><div className="mt-4 rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-700">{selected.instruction}</div><label className="mt-4 block text-sm font-bold text-gray-800"><span className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" />Hasil / catatan tindak lanjut</span><textarea rows={4} value={response} onChange={(event) => setResponse(event.target.value)} className="mt-2 w-full rounded-md border p-3 font-normal" placeholder="Tuliskan progres, hasil koordinasi, atau penyelesaian..." /></label><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setSelected(null)} className="rounded-md border px-3 py-2 text-sm font-bold text-gray-700">Tutup</button>{selected.status === "pending" && <button disabled={isSaving} onClick={() => void updateStatus("accepted")} className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700">Terima</button>}<button disabled={isSaving} onClick={() => void updateStatus("in_progress")} className="flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-bold text-gray-700"><PlayCircle className="h-4 w-4" />Mulai</button><button disabled={isSaving} onClick={() => void updateStatus("waiting")} className="rounded-md border px-3 py-2 text-sm font-bold text-amber-700">Menunggu</button><button disabled={isSaving} onClick={() => void updateStatus("completed")} className="col-span-2 flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesaikan Disposisi</button></div></section></div>}
  </section>;
};
