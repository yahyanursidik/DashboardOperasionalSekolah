import React, { useState } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { AlertTriangle } from "lucide-react";

export const AttendanceReports: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch today's records
  const { data, isLoading } = useList({
    resource: "attendance_records",
    filters: [{ field: "attendance_date", operator: "eq", value: selectedDate }],
    meta: { select: "*, classes(name), students(full_name)" }
  });

  const records = data?.data || [];

  // Recaps
  const total = records.length;
  const hadir = records.filter(r => r.status === 'hadir').length;
  const sakit = records.filter(r => r.status === 'sakit').length;
  const izin = records.filter(r => r.status === 'izin').length;
  const alpa = records.filter(r => r.status === 'alpa').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Absensi"
        description="Pantau kehadiran siswa dan rekapitulasi harian."
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3 border-b sm:border-b-0 sm:border-r pb-3 sm:pb-0 sm:pr-4">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground block">Pilih Tanggal Laporan</label>
            <p className="text-xs text-muted-foreground">Tentukan tanggal untuk melihat rekapitulasi.</p>
          </div>
        </div>
        <div className="flex-1">
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-900 bg-indigo-50/50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Memuat laporan...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Total Terekam</p>
              <p className="text-4xl font-black">{total}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-100 mb-1">Hadir (H)</p>
              <p className="text-4xl font-black">{hadir}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-1">Sakit (S)</p>
              <p className="text-4xl font-black">{sakit}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-100 mb-1">Izin (I)</p>
              <p className="text-4xl font-black">{izin}</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-5 rounded-2xl shadow-lg shadow-rose-500/20 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-100 mb-1">Alpa (A)</p>
              <p className="text-4xl font-black">{alpa}</p>
            </div>
          </div>

          <div className="lg:col-span-4 bg-card rounded-2xl border shadow-sm p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" /> 
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Daftar Ketidakhadiran Hari Ini</h3>
                <p className="text-sm text-muted-foreground">Siswa yang tidak hadir di kelas berdasarkan tanggal yang dipilih.</p>
              </div>
            </div>
            
            {records.filter(r => r.status !== 'hadir').length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-muted-foreground">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎉</span>
                </div>
                <p className="font-bold text-slate-700">Luar Biasa!</p>
                <p className="text-sm mt-1">Semua siswa hadir atau absensi belum diisi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b">
                    <tr>
                      <th className="px-5 py-4">Nama Siswa</th>
                      <th className="px-5 py-4">Kelas</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.filter(r => r.status !== 'hadir').map(r => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-bold text-foreground">{r.students?.full_name}</td>
                        <td className="px-5 py-4 font-medium text-muted-foreground">{r.classes?.name}</td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1.5 rounded-lg text-xs uppercase font-black tracking-wider
                            ${r.status === 'sakit' ? 'bg-blue-100 text-blue-700' : 
                              r.status === 'izin' ? 'bg-amber-100 text-amber-700' : 
                              r.status === 'alpa' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100'}
                          `}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
