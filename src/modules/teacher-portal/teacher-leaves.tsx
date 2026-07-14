import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Calendar, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  formatLeaveDate,
  formatLeaveType,
  getLeaveDurationDays,
  leaveStatusConfig,
  leaveTypes,
  requiresStrongProof,
} from "../leaves/leave-utils";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const TeacherLeaves: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState("sakit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabaseClient
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });
      
      if (data) setLeaves(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [employee.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error("Gagal mengajukan: Tidak ada koneksi internet.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Tanggal mulai dan selesai wajib diisi.");
      return;
    }
    if (startDate > endDate) {
      toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Alasan izin minimal 10 karakter agar mudah diverifikasi HRD.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabaseClient
        .from("leave_requests")
        .insert([{
          employee_id: employee.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
          status: 'pending',
          academic_year_id: activeYearId,
          unit_id: employee.unit_id || null,
        }]);

      if (error) throw error;
      toast.success("Pengajuan cuti/izin berhasil dikirim!");
      
      setShowForm(false);
      setLeaveType("sakit");
      setStartDate("");
      setEndDate("");
      setReason("");
      
      // Refresh list
      const { data } = await supabaseClient
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });
      if (data) setLeaves(data);

    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim pengajuan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = leaveStatusConfig[status || "pending"] ?? leaveStatusConfig.pending;
    const Icon = status === "approved" ? CheckCircle : status === "rejected" ? XCircle : Clock;
    return <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded border ${config.className}`}><Icon className="w-3 h-3" /> {config.label}</span>;
  };

  const durationDays = getLeaveDurationDays(startDate, endDate);
  const needsProof = requiresStrongProof(leaveType, durationDays);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-orange-500" /> Cuti & Izin
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-white p-2 rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-200"
        >
          {showForm ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Form Pengajuan Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Izin</label>
              <select 
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm outline-none focus:border-orange-500 bg-white"
              >
                {leaveTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mulai Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sampai Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alasan / Keterangan</label>
              <textarea 
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Jelaskan alasan izin Anda..."
                className="w-full border rounded-xl p-3 text-sm outline-none focus:border-orange-500 resize-none"
              ></textarea>
              <p className="mt-1 text-[11px] text-gray-500">
                {durationDays > 0 ? `${durationDays} hari pengajuan.` : "Pilih rentang tanggal."}
                {needsProof ? " Lampirkan bukti pendukung ke HRD sesuai prosedur sekolah." : ""}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-8 text-gray-400 text-sm animate-pulse">Memuat riwayat pengajuan...</div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed p-8 text-center text-gray-400 text-sm">
          Belum ada riwayat pengajuan cuti/izin.
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {leaves.map(leave => (
            <div key={leave.id} className="bg-white p-4 rounded-2xl shadow-sm border">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                  {formatLeaveType(leave.leave_type)}
                </span>
                {getStatusBadge(leave.status)}
              </div>
              <div className="font-bold text-gray-900 text-sm mb-1">
                {formatLeaveDate(leave.start_date, { day: "numeric", month: "short" })}
                {leave.start_date !== leave.end_date && ` - ${formatLeaveDate(leave.end_date, { day: "numeric", month: "short" })}`}
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{leave.reason}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
