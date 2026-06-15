import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Calendar, Plus, Clock, CheckCircle, XCircle } from "lucide-react";

export const TeacherLeaves: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState("sick");
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
    if (!startDate || !endDate || !reason) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabaseClient
        .from("leave_requests")
        .insert([{
          employee_id: employee.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: 'pending'
        }]);

      if (error) throw error;
      
      alert("Pengajuan cuti/izin berhasil dikirim ke Admin!");
      setShowForm(false);
      setLeaveType("sick");
      setStartDate("");
      setEndDate("");
      setReason("");
      fetchLeaves();
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pengajuan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 bg-emerald-100 text-emerald-700 rounded"><CheckCircle className="w-3 h-3" /> Disetujui</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 bg-red-100 text-red-700 rounded"><XCircle className="w-3 h-3" /> Ditolak</span>;
      default: return <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 bg-amber-100 text-amber-700 rounded"><Clock className="w-3 h-3" /> Menunggu</span>;
    }
  };

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
                <option value="sick">Sakit</option>
                <option value="annual">Cuti Tahunan</option>
                <option value="maternity">Cuti Melahirkan</option>
                <option value="other">Keperluan Lain (Izin)</option>
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
                  {leave.leave_type === 'sick' ? 'Sakit' : 
                   leave.leave_type === 'annual' ? 'Cuti Tahunan' : 
                   leave.leave_type === 'maternity' ? 'Cuti Melahirkan' : 'Izin Lainnya'}
                </span>
                {getStatusBadge(leave.status)}
              </div>
              <div className="font-bold text-gray-900 text-sm mb-1">
                {new Date(leave.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} 
                {leave.start_date !== leave.end_date && ` - ${new Date(leave.end_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}`}
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{leave.reason}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
