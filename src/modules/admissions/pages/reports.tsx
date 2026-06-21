import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { getSpmbReports } from "../mock";
import { Users, UserCheck, UserX, TrendingUp, Download } from "lucide-react";

export const AdmissionsReports: React.FC = () => {
  const reports = getSpmbReports();
  
  // Calculate aggregate metrics
  const totalHistorically = reports.reduce((acc, curr) => acc + curr.totalApplicants, 0);
  const totalAcceptedHistorically = reports.reduce((acc, curr) => acc + curr.accepted, 0);
  const totalRejectedHistorically = reports.reduce((acc, curr) => acc + curr.rejected, 0);
  
  const latestYear = reports[reports.length - 1];
  const previousYear = reports[reports.length - 2];
  
  const growthRate = previousYear 
    ? ((latestYear.totalApplicants - previousYear.totalApplicants) / previousYear.totalApplicants * 100).toFixed(1)
    : 0;

  const acceptanceRate = totalHistorically > 0 
    ? ((totalAcceptedHistorically / totalHistorically) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Laporan Historis SPMB" 
        description="Analisis performa penerimaan siswa baru dari tahun ke tahun."
        action={
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            <span>Ekspor Laporan</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Pendaftar Historis</p>
              <h3 className="text-2xl font-bold">{totalHistorically}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Diterima Historis</p>
              <h3 className="text-2xl font-bold">{totalAcceptedHistorically}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Ditolak Historis</p>
              <h3 className="text-2xl font-bold">{totalRejectedHistorically}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Rata-rata Kelulusan</p>
              <h3 className="text-2xl font-bold">{acceptanceRate}%</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Chart 1: Komparasi Diterima vs Ditolak */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6">Status Penerimaan per Tahun Akademik</h3>
          <div className="h-[350px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="academicYear" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Legend />
                <Bar dataKey="accepted" name="Diterima" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Ditolak" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Tren Pendaftar Baru */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold">Tren Pertumbuhan Pendaftar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tahun terakhir mengalami kenaikan <span className="text-emerald-600 font-bold">+{growthRate}%</span>
              </p>
            </div>
          </div>
          <div className="h-[350px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reports} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="academicYear" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalApplicants" 
                  name="Total Pendaftar" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel Data Historis */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b bg-muted/10">
          <h3 className="text-lg font-bold">Rincian Historis per Tahun Akademik</h3>
          <p className="text-sm text-muted-foreground mt-1">Data detail metrik pendaftaran dari waktu ke waktu.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Tahun Akademik</th>
                <th className="px-6 py-4 text-right">Total Pendaftar</th>
                <th className="px-6 py-4 text-right">Diterima</th>
                <th className="px-6 py-4 text-right">Ditolak</th>
                <th className="px-6 py-4 text-right">Tingkat Kelulusan</th>
                <th className="px-6 py-4 text-right">Pertumbuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((row, index) => {
                const prev = index > 0 ? reports[index - 1] : null;
                const growth = prev ? ((row.totalApplicants - prev.totalApplicants) / prev.totalApplicants * 100).toFixed(1) : '-';
                const acceptance = ((row.accepted / row.totalApplicants) * 100).toFixed(1);
                const isGrowthPositive = growth !== '-' && parseFloat(growth) > 0;
                const isGrowthNegative = growth !== '-' && parseFloat(growth) < 0;

                return (
                  <tr key={row.academicYear} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-semibold">{row.academicYear}</td>
                    <td className="px-6 py-4 text-right font-medium">{row.totalApplicants}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{row.accepted}</td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">{row.rejected}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold">
                        {acceptance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {growth === '-' ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${isGrowthPositive ? 'bg-emerald-50 text-emerald-700' : isGrowthNegative ? 'bg-rose-50 text-rose-700' : 'bg-muted text-muted-foreground'}`}>
                          {isGrowthPositive ? '+' : ''}{growth}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
