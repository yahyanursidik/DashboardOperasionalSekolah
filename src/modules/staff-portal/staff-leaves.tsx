/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle, Clock, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { formatLeaveDate, formatLeaveType, getLeaveDurationDays, leaveStatusConfig, leaveTypes, requiresStrongProof } from "../leaves/leave-utils";
import { PageHeader } from "../../components/layout/PageHeader";

export const StaffLeaves: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState("izin");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabaseClient
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });
      setLeaves(data || []);
    } finally {
      setIsLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    void fetchLeaves();
  }, [fetchLeaves]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startDate || !endDate) return toast.error("Tanggal mulai dan selesai wajib diisi.");
    if (startDate > endDate) return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    if (reason.trim().length < 10) return toast.error("Alasan izin minimal 10 karakter.");

    setIsSubmitting(true);
    try {
      const { error } = await supabaseClient.from("leave_requests").insert([{
        employee_id: employee.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: "pending",
        academic_year_id: activeYearId,
        unit_id: employee.unit_id || null,
      }]);
      if (error) throw error;
      toast.success("Pengajuan izin berhasil dikirim.");
      setShowForm(false);
      setLeaveType("izin");
      setStartDate("");
      setEndDate("");
      setReason("");
      await fetchLeaves();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim pengajuan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const durationDays = getLeaveDurationDays(startDate, endDate);
  const needsProof = requiresStrongProof(leaveType, durationDays);

  const getStatusBadge = (status: string) => {
    const config = leaveStatusConfig[status || "pending"] ?? leaveStatusConfig.pending;
    const Icon = status === "approved" ? CheckCircle : status === "rejected" ? XCircle : Clock;
    return <span className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-black uppercase ${config.className}`}><Icon className="w-3 h-3" /> {config.label}</span>;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Izin & Cuti" description="Ajukan izin operasional untuk diverifikasi HRD." action={<button type="button" onClick={() => setShowForm(!showForm)} title={showForm ? "Tutup formulir" : "Ajukan izin"} className="flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">{showForm ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}<span>{showForm ? "Tutup" : "Ajukan Izin"}</span></button>} />

      {showForm && (
        <div className="rounded-md border bg-card p-5">
          <h3 className="mb-4 text-sm font-black text-gray-900">Form Pengajuan Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-black text-gray-700">Jenis Izin</label>
              <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                {leaveTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black text-gray-700">Mulai</label>
                <input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-gray-700">Sampai</label>
                <input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-gray-700">Alasan / Keterangan</label>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required placeholder="Jelaskan alasan izin..." className="w-full resize-none rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              <p className="mt-1 text-[11px] text-gray-500">
                {durationDays > 0 ? `${durationDays} hari pengajuan.` : "Pilih rentang tanggal."}
                {needsProof ? " Bukti pendukung perlu diserahkan ke HRD." : ""}
              </p>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:opacity-100">
              {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm text-gray-400">Memuat riwayat pengajuan...</div>
      ) : leaves.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Belum ada riwayat pengajuan izin.</div>
      ) : (
        <div className="space-y-3 pb-8">
          {leaves.map((leave) => (
            <div key={leave.id} className="rounded-md border bg-card p-4">
              <div className="mb-2 flex items-start justify-between">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-500">{formatLeaveType(leave.leave_type)}</span>
                {getStatusBadge(leave.status)}
              </div>
              <div className="mb-1 text-sm font-black text-gray-900">
                {formatLeaveDate(leave.start_date, { day: "numeric", month: "short" })}
                {leave.start_date !== leave.end_date && ` - ${formatLeaveDate(leave.end_date, { day: "numeric", month: "short" })}`}
              </div>
              <p className="line-clamp-2 text-xs text-gray-600">{leave.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
