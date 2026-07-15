import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, FilePenLine, LifeBuoy, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import type { ParentPortalContext } from "./portal-context";

const requestTypes = [
  { value: "student_leave", label: "Izin siswa" },
  { value: "data_correction", label: "Koreksi data" },
  { value: "academic", label: "Akademik" },
  { value: "quran", label: "Qur'an" },
  { value: "finance", label: "Keuangan" },
  { value: "wellbeing", label: "Pendampingan siswa" },
  { value: "general", label: "Layanan umum" },
];

const statuses: Record<string, { label: string; className: string }> = {
  submitted: { label: "Diajukan", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_review: { label: "Ditinjau", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Disetujui", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  resolved: { label: "Selesai", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Ditolak", className: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Dibatalkan", className: "bg-gray-50 text-gray-600 border-gray-200" },
};

type ParentRequest = {
  id: string;
  request_number?: string | null;
  request_type: string;
  subject: string;
  description: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  response?: string | null;
  submitted_at: string;
};

export const PortalRequests: React.FC = () => {
  const { parent, student } = useOutletContext<ParentPortalContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ParentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1" || Boolean(searchParams.get("type")));
  const [form, setForm] = useState({
    request_type: searchParams.get("type") || "student_leave",
    subject: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabaseClient
      .from("parent_portal_requests")
      .select("*")
      .eq("parent_id", parent.id)
      .eq("student_id", student.id)
      .order("submitted_at", { ascending: false });
    if (error) console.error("Parent request list error:", error);
    setItems((data || []) as unknown as ParentRequest[]);
    setIsLoading(false);
  }, [parent.id, student.id]);

  useEffect(() => {
    // The query resolves asynchronously before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRequests();
  }, [fetchRequests]);

  const openCount = useMemo(() => items.filter((item) => ["submitted", "in_review"].includes(item.status)).length, [items]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      parent_id: parent.id,
      student_id: student.id,
      unit_id: student.unit_id || student.classes?.unit_id || null,
      request_type: form.request_type,
      subject: form.subject.trim(),
      description: form.description.trim(),
      start_date: form.request_type === "student_leave" ? form.start_date || null : null,
      end_date: form.request_type === "student_leave" ? form.end_date || form.start_date || null : null,
    };
    const { error } = await supabaseClient.from("parent_portal_requests").insert(payload);
    setIsSubmitting(false);
    if (error) {
      console.error("Parent request submit error:", error);
      toast.error("Pengajuan belum berhasil dikirim.");
      return;
    }
    toast.success("Pengajuan berhasil dikirim ke sekolah.");
    setForm({ request_type: "student_leave", subject: "", description: "", start_date: "", end_date: "" });
    setShowForm(false);
    setSearchParams({});
    await fetchRequests();
  };

  const cancelRequest = async (id: string) => {
    const { error } = await supabaseClient.from("parent_portal_requests").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error("Pengajuan tidak dapat dibatalkan.");
    toast.success("Pengajuan dibatalkan.");
    await fetchRequests();
  };

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header className="flex flex-col gap-4 rounded-lg border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">Layanan sekolah</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Pengajuan Orang Tua</h1>
          <p className="mt-1 text-sm text-gray-500">Ajukan izin, koreksi data, atau kebutuhan pendampingan dan pantau respons sekolah.</p>
        </div>
        <button onClick={() => setShowForm((value) => !value)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
          {showForm ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Tutup formulir" : "Buat pengajuan"}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <div className="rounded-lg border bg-white p-4"><p className="text-2xl font-bold">{items.length}</p><p className="text-xs font-semibold text-gray-500">Total pengajuan</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-2xl font-bold text-amber-700">{openCount}</p><p className="text-xs font-semibold text-gray-500">Sedang diproses</p></div>
      </div>

      {showForm && (
        <form onSubmit={submitRequest} className="rounded-lg border bg-white p-5">
          <h2 className="flex items-center gap-2 font-bold"><FilePenLine className="h-5 w-5 text-emerald-600" /> Pengajuan baru untuk {student.full_name}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">Jenis layanan
              <select required value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })} className="mt-1 h-11 w-full rounded-md border bg-white px-3 font-normal">
                {requestTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">Judul singkat
              <input required maxLength={120} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Contoh: Izin tidak masuk karena sakit" className="mt-1 h-11 w-full rounded-md border px-3 font-normal" />
            </label>
            {form.request_type === "student_leave" && <>
              <label className="text-sm font-semibold text-gray-700">Mulai izin<input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1 h-11 w-full rounded-md border px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-gray-700">Sampai tanggal<input type="date" min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1 h-11 w-full rounded-md border px-3 font-normal" /></label>
            </>}
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Keterangan
              <textarea required minLength={10} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan kebutuhan dan informasi yang perlu diketahui sekolah." className="mt-1 w-full rounded-md border p-3 font-normal" />
            </label>
          </div>
          <div className="mt-4 flex justify-end"><button disabled={isSubmitting} className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? "Mengirim..." : "Kirim pengajuan"}</button></div>
        </form>
      )}

      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-bold">Riwayat pengajuan</h2></div>
        {isLoading ? <p className="p-8 text-center text-sm text-gray-500">Memuat pengajuan...</p> : items.length === 0 ? (
          <div className="p-10 text-center"><LifeBuoy className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 font-semibold text-gray-700">Belum ada pengajuan</p><p className="text-sm text-gray-500">Gunakan fitur ini agar kebutuhan tercatat dan dapat dipantau.</p></div>
        ) : <div className="divide-y">{items.map((item) => {
          const status = statuses[item.status] || statuses.submitted;
          const typeLabel = requestTypes.find((type) => type.value === item.request_type)?.label || item.request_type;
          return <article key={item.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-emerald-700">{item.request_number}</span><span className="text-xs text-gray-400">{typeLabel}</span></div><h3 className="mt-1 font-bold text-gray-900">{item.subject}</h3><p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p></div>
              <span className={`w-max rounded-md border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {new Date(item.submitted_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>{item.start_date && <span>Izin: {new Date(`${item.start_date}T00:00:00`).toLocaleDateString("id-ID")} - {new Date(`${item.end_date || item.start_date}T00:00:00`).toLocaleDateString("id-ID")}</span>}</div>
            {item.response && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="mb-1 flex items-center gap-1 font-bold"><CheckCircle2 className="h-4 w-4" /> Respons sekolah</p>{item.response}</div>}
            {item.status === "submitted" && <button type="button" onClick={() => void cancelRequest(item.id)} className="mt-3 text-xs font-semibold text-red-600 hover:underline">Batalkan pengajuan</button>}
          </article>;
        })}</div>}
      </section>
    </div>
  );
};
