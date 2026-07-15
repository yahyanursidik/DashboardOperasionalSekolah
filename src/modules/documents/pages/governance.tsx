/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useCreate, useList, useUpdate } from "@refinedev/core";
import { Archive, CalendarClock, CheckCircle2, Gavel, Loader2, LockKeyhole, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { OfficeSectionNav } from "../../mail/components/OfficeSectionNav";
import { useCurrentUser } from "../../../hooks/useAuth";

const referenceDate = new Date();

export const DocumentGovernance: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState("attention");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState("");
  const { data, isLoading, refetch } = useList({ resource: "documents", filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [], pagination: { mode: "off" }, sorters: [{ field: "expiry_date", order: "asc" }], meta: { select: "*,document_types(name,retention_years),units(name),uploaded:profiles!uploaded_by(full_name)" } });
  const { data: actionData, refetch: refetchActions } = useList({ resource: "document_governance_actions", filters: selected?.id ? [{ field: "document_id", operator: "eq", value: selected.id }] : [], pagination: { mode: "off" }, sorters: [{ field: "requested_at", order: "desc" }], queryOptions: { enabled: Boolean(selected?.id) } });
  const { data: employeeData } = useList({ resource: "employees", filters: user?.id ? [{ field: "user_id", operator: "eq", value: user.id }] : [], pagination: { mode: "off" }, queryOptions: { enabled: Boolean(user?.id) } });
  const currentEmployee: any = employeeData?.data?.[0];
  const { mutateAsync: updateDocument, isLoading: isUpdating } = useUpdate();
  const { mutateAsync: createAction, isLoading: isCreating } = useCreate();
  const documents = useMemo(() => (data?.data || []).filter((doc: any) => {
    if (search && ![doc.file_name, doc.document_number, doc.document_types?.name].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))) return false;
    const expiry = doc.expiry_date ? new Date(doc.expiry_date) : null;
    const retention = doc.retention_until ? new Date(doc.retention_until) : null;
    if (filter === "attention") return doc.status === "menunggu_verifikasi" || doc.archive_status === "expired" || (expiry && expiry <= new Date(referenceDate.getTime() + 60 * 86400000)) || (retention && retention <= referenceDate);
    if (filter === "expired") return doc.archive_status === "expired" || (expiry && expiry < referenceDate);
    if (filter === "retention") return retention && retention <= referenceDate;
    if (filter === "hold") return doc.legal_hold;
    return true;
  }), [data?.data, filter, search]);
  const all = data?.data || [];
  const stats = { expiring: all.filter((doc: any) => doc.expiry_date && new Date(doc.expiry_date) <= new Date(referenceDate.getTime() + 60 * 86400000)).length, retention: all.filter((doc: any) => doc.retention_until && new Date(doc.retention_until) <= referenceDate).length, hold: all.filter((doc: any) => doc.legal_hold).length };

  const act = async (type: string) => {
    if (!selected) return;
    if (["destroy_request", "legal_hold"].includes(type) && reason.trim().length < 5) return toast.error("Alasan minimal 5 karakter.");
    try {
      let values: Record<string, unknown> = {};
      if (type === "extend") { const next = new Date(selected.retention_until || referenceDate); next.setFullYear(next.getFullYear() + 1); values = { retention_until: next.toISOString().slice(0, 10), archive_status: "active" }; }
      if (type === "archive") values = { archive_status: "archived", archived_at: new Date().toISOString() };
      if (type === "legal_hold") values = { legal_hold: true };
      if (type === "legal_hold_release") values = { legal_hold: false };
      if (type === "destroy_request") values = { archive_status: "retention_review" };
      await createAction({ resource: "document_governance_actions", values: { document_id: selected.id, unit_id: selected.unit_id, action_type: type, status: type === "destroy_request" ? "pending" : "completed", requested_by: currentEmployee?.id || null, reason: reason.trim() || `Tindakan ${type} oleh pengelola dokumen`, completed_at: type === "destroy_request" ? null : new Date().toISOString() } });
      await updateDocument({ resource: "documents", id: selected.id, values });
      toast.success("Keputusan tata kelola berhasil dicatat."); setReason(""); setSelected(null); await Promise.all([refetch(), refetchActions()]);
    } catch (error) { toast.error("Keputusan belum dapat disimpan", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
  };

  const decideDestruction = async (action: any, approve: boolean) => {
    if (!selected) return;
    if (approve && action.requested_by && action.requested_by === currentEmployee?.id) return toast.error("Penyetuju harus berbeda dari pengusul pemusnahan.");
    if (reason.trim().length < 5) return toast.error("Catatan keputusan minimal 5 karakter.");
    try {
      const now = new Date().toISOString();
      await updateDocument({ resource: "document_governance_actions", id: action.id, values: { status: approve ? "approved" : "rejected", decided_by: currentEmployee?.id || null, decision_note: reason.trim(), decided_at: now, completed_at: now } });
      if (approve) {
        await createAction({ resource: "document_governance_actions", values: { document_id: selected.id, unit_id: selected.unit_id, action_type: "destroy_approved", status: "completed", requested_by: currentEmployee?.id || null, decided_by: currentEmployee?.id || null, reason: `Pemusnahan disetujui: ${reason.trim()}`, decided_at: now, completed_at: now } });
        await updateDocument({ resource: "documents", id: selected.id, values: { archive_status: "destroyed", archived_at: now, archived_by: currentEmployee?.id || null } });
      } else {
        await updateDocument({ resource: "documents", id: selected.id, values: { archive_status: "archived" } });
      }
      toast.success(approve ? "Pemusnahan disetujui secara administratif." : "Usulan pemusnahan ditolak.");
      setReason("");
      await Promise.all([refetch(), refetchActions()]);
    } catch (error) { toast.error("Keputusan belum dapat disimpan", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
  };

  return <div className="space-y-6"><PageHeader title="Retensi & Kepatuhan Dokumen" description="Pantau masa berlaku, jadwal tinjau, retensi, arsip inaktif, legal hold, dan usulan pemusnahan secara terkendali." /><OfficeSectionNav />
    <section className="grid gap-3 sm:grid-cols-3">{[{ label: "Berlaku <= 60 hari", value: stats.expiring, icon: CalendarClock, tone: "bg-amber-50 text-amber-700" }, { label: "Masa retensi tercapai", value: stats.retention, icon: Archive, tone: "bg-red-50 text-red-700" }, { label: "Legal hold", value: stats.hold, icon: LockKeyhole, tone: "bg-blue-50 text-blue-700" }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-5 w-5" /></div><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</section>
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1">{[{ value: "attention", label: "Perlu Perhatian" }, { value: "expired", label: "Kedaluwarsa" }, { value: "retention", label: "Retensi Tercapai" }, { value: "hold", label: "Legal Hold" }, { value: "all", label: "Semua" }].map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-md px-3 py-2 text-sm font-semibold ${filter === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</button>)}</div><label className="relative lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari dokumen atau nomor" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></label></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]"><section className="overflow-hidden rounded-lg border bg-card">{isLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : documents.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" /><p className="font-semibold">Tidak ada dokumen pada kategori ini.</p></div> : <div className="divide-y">{documents.map((doc: any) => <button key={doc.id} onClick={() => { setSelected(doc); setReason(""); }} className={`w-full p-4 text-left hover:bg-muted/30 ${selected?.id === doc.id ? "bg-primary/5" : ""}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-bold">{doc.file_name}</p><p className="mt-1 text-xs text-muted-foreground">{doc.document_types?.name} - {doc.units?.name || "Lintas unit"}</p><div className="mt-3 flex flex-wrap gap-3 text-xs"><span>Berlaku: {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString("id-ID") : "Tanpa batas"}</span><span>Retensi: {doc.retention_until ? new Date(doc.retention_until).toLocaleDateString("id-ID") : "Belum diatur"}</span></div></div><div className="flex flex-col items-end gap-2">{doc.legal_hold && <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">LEGAL HOLD</span>}<span className="rounded bg-muted px-2 py-1 text-xs font-semibold">{doc.archive_status}</span></div></div></button>)}</div>}</section>
      <aside className="self-start rounded-lg border bg-card p-5 xl:sticky xl:top-20">{!selected ? <div className="py-16 text-center"><Gavel className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" /><p className="font-semibold">Pilih dokumen</p><p className="mt-1 text-xs text-muted-foreground">Riwayat dan keputusan tata kelola akan tampil di sini.</p></div> : <div className="space-y-4"><div className="border-b pb-4"><p className="text-xs font-semibold text-muted-foreground">{selected.document_number || "Tanpa nomor"}</p><h2 className="mt-1 font-bold">{selected.file_name}</h2><p className="mt-1 text-xs text-muted-foreground">{selected.document_types?.name}</p></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Status arsip</dt><dd className="font-semibold">{selected.archive_status}</dd></div><div><dt className="text-xs text-muted-foreground">Versi</dt><dd className="font-semibold">{selected.version_number}</dd></div><div><dt className="text-xs text-muted-foreground">Lokasi fisik</dt><dd className="font-semibold">{selected.physical_location || "Belum diisi"}</dd></div><div><dt className="text-xs text-muted-foreground">Kerahasiaan</dt><dd className="font-semibold">{selected.confidentiality}</dd></div></dl><label className="block text-sm font-semibold">Alasan / catatan keputusan<textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-md border bg-background p-3 font-normal" /></label><div className="grid grid-cols-2 gap-2"><button onClick={() => void act("extend")} disabled={isUpdating || isCreating} className="rounded-md border px-3 py-2 text-sm font-bold">Perpanjang 1 Tahun</button><button onClick={() => void act("archive")} disabled={isUpdating || isCreating} className="rounded-md border px-3 py-2 text-sm font-bold">Arsipkan</button><button onClick={() => void act(selected.legal_hold ? "legal_hold_release" : "legal_hold")} disabled={isUpdating || isCreating} className="rounded-md border px-3 py-2 text-sm font-bold">{selected.legal_hold ? "Lepas Hold" : "Legal Hold"}</button><button onClick={() => void act("destroy_request")} disabled={isUpdating || isCreating || selected.legal_hold || selected.archive_status === "destroyed"} className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-40">Usulkan Musnah</button></div><div className="border-t pt-4"><p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Riwayat keputusan</p>{(actionData?.data || []).length === 0 ? <p className="text-xs text-muted-foreground">Belum ada keputusan.</p> : <div className="space-y-2">{actionData?.data?.slice(0, 5).map((action: any) => <div key={action.id} className="rounded-md bg-muted/40 p-2.5 text-xs"><p className="font-bold">{action.action_type} - {action.status}</p><p className="mt-1 text-muted-foreground">{action.reason}</p>{action.decision_note && <p className="mt-1 text-muted-foreground">Keputusan: {action.decision_note}</p>}{action.action_type === "destroy_request" && action.status === "pending" && <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => void decideDestruction(action, false)} disabled={isUpdating || isCreating} className="rounded border border-red-200 px-2 py-1.5 font-bold text-red-700">Tolak</button><button title={action.requested_by === currentEmployee?.id ? "Penyetuju harus berbeda dari pengusul" : "Setujui pemusnahan administratif"} onClick={() => void decideDestruction(action, true)} disabled={isUpdating || isCreating || selected.legal_hold || action.requested_by === currentEmployee?.id} className="rounded bg-red-700 px-2 py-1.5 font-bold text-white disabled:opacity-40">Setujui Musnah</button></div>}</div>)}</div>}</div></div>}</aside></div>
  </div>;
};
