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

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <label className="text-sm font-medium text-muted-foreground">Pilih Tanggal:</label>
        <input 
          type="date" 
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        />
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Memuat laporan...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground font-medium uppercase mb-1">Total Terekam</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium uppercase mb-1">Hadir (H)</p>
              <p className="text-2xl font-bold">{hadir}</p>
            </div>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium uppercase mb-1">Sakit (S)</p>
              <p className="text-2xl font-bold">{sakit}</p>
            </div>
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-100 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium uppercase mb-1">Izin (I)</p>
              <p className="text-2xl font-bold">{izin}</p>
            </div>
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium uppercase mb-1">Alpa (A)</p>
              <p className="text-2xl font-bold">{alpa}</p>
            </div>
          </div>

          <div className="lg:col-span-4 bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Daftar Ketidakhadiran Hari Ini
            </h3>
            
            {records.filter(r => r.status !== 'hadir').length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                <p>Tidak ada data ketidakhadiran (Semua Hadir / Belum diabsen)</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.filter(r => r.status !== 'hadir').map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-medium">{r.students?.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.classes?.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs uppercase font-bold
                            ${r.status === 'sakit' ? 'bg-blue-100 text-blue-800' : 
                              r.status === 'izin' ? 'bg-amber-100 text-amber-800' : 
                              r.status === 'alpa' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}
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
