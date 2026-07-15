import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Filter, LifeBuoy, MessageSquareText, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";

const statusOptions = [
  ["submitted", "Diajukan"],
  ["in_review", "Ditinjau"],
  ["approved", "Disetujui"],
  ["resolved", "Selesai"],
  ["rejected", "Ditolak"],
  ["cancelled", "Dibatalkan"],
] as const;

const requestTypeLabels: Record<string, string> = {
  student_leave: "Izin siswa",
  data_correction: "Koreksi data",
  academic: "Akademik",
  finance: "Keuangan",
  quran: "Qur'an",
  wellbeing: "Pendampingan siswa",
  general: "Layanan umum",
};

type ParentRequestAdminRow = {
  id: string;
  request_number?: string | null;
  request_type: string;
  subject: string;
  description: string;
  status: string;
  response?: string | null;
  submitted_at: string;
  parents?: { full_name?: string | null; phone?: string | null } | null;
  students?: { full_name?: string | null; nis?: string | null } | null;
  units?: { name?: string | null } | null;
  responder?: { full_name?: string | null } | null;
};

export const ParentPortalRequestsAdmin: React.FC = () => {
  const [items, setItems] = useState<ParentRequestAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ParentRequestAdminRow | null>(null);
  const [response, setResponse] = useState("");
  const [nextStatus, setNextStatus] = useState("in_review");
  const [isSaving, setIsSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    let query = supabaseClient
      .from("parent_portal_requests")
      .select("*, parents(full_name, phone), students(full_name, nis), units(name), responder:profiles!responded_by(full_name)")
      .order("submitted_at", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    if (typeFilter) query = query.eq("request_type", typeFilter);
    const { data, error } = await query;
    if (error) {
      console.error("Parent request admin error:", error);
      toast.error("Daftar pengajuan orang tua belum dapat dimuat.");
    }
    setItems((data || []) as unknown as ParentRequestAdminRow[]);
    setIsLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    // The query resolves asynchronously before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item.request_number, item.subject, item.parents?.full_name, item.students?.full_name, item.students?.nis].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [items, search]);

  const metrics = useMemo(() => ({
    total: items.length,
    waiting: items.filter((item) => item.status === "submitted").length,
    reviewing: items.filter((item) => item.status === "in_review").length,
    completed: items.filter((item) => ["approved", "resolved"].includes(item.status)).length,
  }), [items]);

  const openResponse = (item: ParentRequestAdminRow) => {
    setSelected(item);
    setResponse(item.response || "");
    setNextStatus(item.status === "submitted" ? "in_review" : item.status);
  };

  const saveResponse = async () => {
    if (!selected) return;
    if (["approved", "resolved", "rejected"].includes(nextStatus) && response.trim().length < 5) {
      toast.error("Tambahkan respons sekolah sebelum menyelesaikan pengajuan.");
      return;
    }
    setIsSaving(true);
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { error } = await supabaseClient.from("parent_portal_requests").update({
      status: nextStatus,
      response: response.trim() || null,
      responded_by: session?.user.id || null,
      responded_at: new Date().toISOString(),
    }).eq("id", selected.id);
    setIsSaving(false);
    if (error) {
      console.error("Parent request response error:", error);
      toast.error("Respons belum berhasil disimpan.");
      return;
    }
    toast.success("Status dan respons pengajuan diperbarui.");
    setSelected(null);
    await fetchItems();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Layanan Orang Tua" description="Tinjau izin siswa, koreksi data, pertanyaan keuangan, dan kebutuhan pendampingan dari portal orang tua." />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total terlihat", value: metrics.total, icon: LifeBuoy, tone: "text-blue-700" },
          { label: "Perlu ditinjau", value: metrics.waiting, icon: Clock3, tone: "text-amber-700" },
          { label: "Sedang diproses", value: metrics.reviewing, icon: MessageSquareText, tone: "text-violet-700" },
          { label: "Selesai", value: metrics.completed, icon: CheckCircle2, tone: "text-emerald-700" },
        ].map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-lg border bg-card p-4"><Icon className={`h-5 w-5 ${tone}`} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs font-semibold text-muted-foreground">{label}</p></div>)}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor, siswa, orang tua, atau judul..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></div>
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Semua status</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Semua layanan</option>{Object.entries(requestTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? <p className="p-10 text-center text-sm text-muted-foreground">Memuat pengajuan...</p> : filteredItems.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">Tidak ada pengajuan sesuai filter.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Pengajuan</th><th className="px-5 py-3">Siswa & wali</th><th className="px-5 py-3">Unit</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Diajukan</th><th className="px-5 py-3 text-right">Tindak lanjut</th></tr></thead><tbody className="divide-y">{filteredItems.map((item) => {
            const statusLabel = statusOptions.find(([value]) => value === item.status)?.[1] || item.status;
            return <tr key={item.id} className="hover:bg-muted/20"><td className="px-5 py-4"><p className="text-xs font-bold text-primary">{item.request_number}</p><p className="mt-1 font-bold">{item.subject}</p><p className="text-xs text-muted-foreground">{requestTypeLabels[item.request_type] || item.request_type}</p></td><td className="px-5 py-4"><p className="font-semibold">{item.students?.full_name || "-"}</p><p className="text-xs text-muted-foreground">{item.students?.nis || "NIS -"} · {item.parents?.full_name || "-"}</p></td><td className="px-5 py-4">{item.units?.name || "-"}</td><td className="px-5 py-4"><span className="rounded-md border bg-background px-2 py-1 text-xs font-bold">{statusLabel}</span></td><td className="px-5 py-4 text-xs text-muted-foreground">{new Date(item.submitted_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-5 py-4 text-right"><button onClick={() => openResponse(item)} className="rounded-md border px-3 py-2 text-xs font-bold hover:bg-muted">Tinjau</button></td></tr>;
          })}</tbody></table></div>
        )}
      </section>

      {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"><div className="w-full max-w-xl rounded-t-lg bg-background shadow-xl sm:rounded-lg"><div className="border-b p-5"><p className="text-xs font-bold text-primary">{selected.request_number}</p><h2 className="mt-1 text-lg font-bold">{selected.subject}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description}</p></div><div className="space-y-4 p-5"><label className="block text-sm font-semibold">Status<select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3 font-normal">{statusOptions.filter(([value]) => value !== "cancelled").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-semibold">Respons untuk orang tua<textarea rows={5} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Tuliskan hasil verifikasi, keputusan, atau langkah selanjutnya..." className="mt-1 w-full rounded-md border bg-background p-3 font-normal" /></label></div><div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setSelected(null)} className="h-10 rounded-md border px-4 text-sm font-semibold">Batal</button><button disabled={isSaving} onClick={() => void saveResponse()} className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{isSaving ? "Menyimpan..." : "Simpan tindak lanjut"}</button></div></div></div>}
    </div>
  );
};
