/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, FileCheck2, Loader2, MapPin, Settings2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";

const TYPE_LABELS: Record<string, string> = {
  location_issue: "Masalah GPS/lokasi",
  missed_attendance: "Lupa absen",
  offsite_duty: "Dinas luar",
  time_correction: "Koreksi waktu",
};

const STATUS_LABELS: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak", cancelled: "Dibatalkan" };

export const AttendanceReviews: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadRows = async () => {
    setIsLoading(true);
    let query = supabaseClient
      .from("attendance_correction_requests")
      .select("*,employees(id,full_name,nik,position,unit_id,units(name)),employee_attendance(date,time_in,time_out,status,verification_status)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter) query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error(error.message || "Antrean koreksi gagal dimuat.");
    setRows(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { void loadRows(); }, [filter]);

  const stats = useMemo(() => ({
    total: rows.length,
    location: rows.filter((row) => row.request_type === "location_issue").length,
    offsite: rows.filter((row) => row.request_type === "offsite_duty").length,
  }), [rows]);

  const review = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    if (decision === "rejected" && reviewNote.trim().length < 5) return toast.error("Alasan penolakan minimal 5 karakter.");
    setIsSaving(true);
    const { error } = await supabaseClient.rpc("review_attendance_correction", {
      p_request_id: selected.id,
      p_decision: decision,
      p_review_note: reviewNote.trim() || null,
    });
    setIsSaving(false);
    if (error) return toast.error(error.message || "Tinjauan gagal disimpan.");
    toast.success(decision === "approved" ? "Koreksi disetujui dan presensi diperbarui." : "Koreksi ditolak.");
    setSelected(null);
    setReviewNote("");
    await loadRows();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tinjauan Koreksi Absensi"
        description="Validasi masalah GPS, dinas luar, lupa absen, dan koreksi waktu dengan jejak persetujuan."
        action={<div className="flex gap-2"><Link to="/attendance/settings" className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><Settings2 className="h-4 w-4" /> Pengaturan</Link><Link to="/attendance/employees" className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Presensi</Link></div>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: filter === "pending" ? "Perlu ditinjau" : "Data tampil", value: stats.total, icon: Clock3, tone: "bg-amber-50 text-amber-700" }, { label: "Kendala lokasi", value: stats.location, icon: MapPin, tone: "bg-blue-50 text-blue-700" }, { label: "Dinas luar", value: stats.offsite, icon: FileCheck2, tone: "bg-emerald-50 text-emerald-700" }].map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-lg border bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><div className={`rounded-md p-2 ${tone}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-sm font-semibold">{label}</p></div></div></div>)}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        {[{ value: "pending", label: "Menunggu" }, { value: "approved", label: "Disetujui" }, { value: "rejected", label: "Ditolak" }, { value: "", label: "Semua" }].map((option) => <button key={option.label} onClick={() => setFilter(option.value)} className={`rounded-md px-3 py-2 text-sm font-semibold ${filter === option.value ? "bg-primary text-primary-foreground" : "border bg-background text-muted-foreground"}`}>{option.label}</button>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          {isLoading ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat antrean...</div> : rows.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" /><p className="font-semibold">Tidak ada koreksi pada status ini.</p><p className="text-sm text-muted-foreground">Antrean sudah tertangani.</p></div> : <div className="divide-y">{rows.map((row) => <button key={row.id} onClick={() => { setSelected(row); setReviewNote(row.review_note || ""); }} className={`w-full p-4 text-left transition-colors hover:bg-muted/30 ${selected?.id === row.id ? "bg-primary/5" : ""}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{row.employees?.full_name || "Pegawai"}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{row.employees?.units?.name || "Lintas unit"}</span></div><p className="mt-1 text-xs text-muted-foreground">{row.employees?.nik || "Tanpa NIK"} - {String(row.employees?.position || "").replace(/_/g, " ")}</p><p className="mt-2 text-sm"><span className="font-semibold">{TYPE_LABELS[row.request_type] || row.request_type}</span> untuk {row.attendance_action === "check_in" ? "jam masuk" : "jam pulang"} {row.requested_time ? `pukul ${String(row.requested_time).slice(0, 5)}` : ""}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.reason}</p></div><div className="shrink-0 text-left sm:text-right"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "pending" ? "bg-amber-50 text-amber-700" : row.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{STATUS_LABELS[row.status] || row.status}</span><p className="mt-2 text-xs text-muted-foreground">{new Date(`${row.request_date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p></div></div></button>)}</div>}
        </section>

        <aside className="self-start rounded-lg border bg-card p-5 shadow-sm xl:sticky xl:top-20">
          {!selected ? <div className="py-12 text-center"><FileCheck2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" /><p className="font-semibold">Pilih permohonan</p><p className="mt-1 text-xs text-muted-foreground">Detail jadwal dan alasan akan tampil di sini.</p></div> : <div><div className="border-b pb-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Pemohon</p><h2 className="mt-1 font-bold">{selected.employees?.full_name}</h2><p className="text-xs text-muted-foreground">{selected.employees?.units?.name || "Lintas unit"}</p></div><dl className="space-y-3 py-4 text-sm"><div><dt className="text-xs font-semibold text-muted-foreground">Jenis</dt><dd className="font-semibold">{TYPE_LABELS[selected.request_type] || selected.request_type}</dd></div><div><dt className="text-xs font-semibold text-muted-foreground">Tanggal dan waktu</dt><dd>{new Date(`${selected.request_date}T00:00:00`).toLocaleDateString("id-ID")} - {String(selected.requested_time || "-").slice(0, 5)}</dd></div><div><dt className="text-xs font-semibold text-muted-foreground">Alasan pegawai</dt><dd className="mt-1 rounded-md bg-muted/50 p-3 text-sm leading-relaxed">{selected.reason}</dd></div>{selected.employee_attendance && <div><dt className="text-xs font-semibold text-muted-foreground">Catatan saat ini</dt><dd>{selected.employee_attendance.time_in ? `Masuk ${String(selected.employee_attendance.time_in).slice(0, 5)}` : "Belum masuk"}{selected.employee_attendance.time_out ? `, pulang ${String(selected.employee_attendance.time_out).slice(0, 5)}` : ""}</dd></div>}</dl><label className="text-sm font-semibold">Catatan peninjau<textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} disabled={selected.status !== "pending"} placeholder="Wajib diisi bila ditolak" className="mt-1.5 w-full rounded-md border bg-background p-3 font-normal" /></label>{selected.status === "pending" ? <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void review("rejected")} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" /> Tolak</button><button onClick={() => void review("approved")} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Setujui</button></div> : <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">Permohonan sudah {STATUS_LABELS[selected.status]?.toLowerCase()}.</div>}</div>}
        </aside>
      </div>
    </div>
  );
};
