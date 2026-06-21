import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Users, FileCheck, XCircle, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useList } from "@refinedev/core";

export const AdmissionsDashboard: React.FC = () => {
  const { data: tableData, isLoading } = useList({
    resource: "admissions_applicants",
    pagination: { mode: "off" }
  });

  const rawData = tableData?.data || [];

  const statsData = {
    total: rawData.length,
    waiting: rawData.filter(a => a.status === 'Menunggu Verifikasi').length,
    verified: rawData.filter(a => a.status === 'Verifikasi Valid' || a.status === 'Berkas Lengkap').length,
    passed: rawData.filter(a => a.status === 'Lulus Tes').length,
    rejected: rawData.filter(a => a.status === 'Ditolak').length,
  };

  const funnelData = [
    { name: 'Mendaftar', jumlah: statsData.total },
    { name: 'Berkas Lengkap', jumlah: statsData.waiting + statsData.verified + statsData.passed },
    { name: 'Verifikasi Valid', jumlah: statsData.verified + statsData.passed },
    { name: 'Lulus Tes', jumlah: statsData.passed },
  ];

  const stats = [
    { label: "Total Pendaftar", value: statsData.total, icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Berkas Terverifikasi", value: statsData.verified + statsData.passed, icon: FileCheck, color: "text-emerald-600 bg-emerald-100" },
    { label: "Menunggu Verifikasi", value: statsData.waiting, icon: TrendingUp, color: "text-amber-600 bg-amber-100" },
    { label: "Ditolak", value: statsData.rejected, icon: XCircle, color: "text-rose-600 bg-rose-100" },
  ];

  const unitData = [
    { name: 'PAUD/TK', value: rawData.filter(a => a.unit === 'PAUD/TK').length },
    { name: 'SD', value: rawData.filter(a => a.unit === 'SD').length },
    { name: 'SMP', value: rawData.filter(a => a.unit === 'SMP').length },
    { name: 'SMA', value: rawData.filter(a => a.unit === 'SMA').length },
  ].filter(d => d.value > 0);
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const recentApplicants = [...rawData].sort((a, b) => new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard SPMB" 
        description="Pantau statistik dan corong (funnel) Seleksi Penerimaan Murid Baru."
        action={
          <div className="flex items-center gap-2">
            <Link to="/admissions/settings" className="px-4 py-2 border rounded-lg font-medium text-sm hover:bg-muted transition-colors">
              Pengaturan
            </Link>
            <Link to="/admissions/reports" className="px-4 py-2 border rounded-lg font-medium text-sm hover:bg-muted transition-colors">
              Laporan
            </Link>
            <Link to="/admissions/applicants" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm">
              Kelola Pendaftar
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-6">Funnel Pendaftaran</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="jumlah" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-6">Distribusi Pendaftar per Unit</h3>
              <div className="h-[300px]">
                {unitData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={unitData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {unitData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Belum ada data pendaftar.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pendaftar Terbaru */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b flex justify-between items-center bg-muted/10">
              <div>
                <h3 className="text-lg font-bold">Pendaftar Terbaru</h3>
                <p className="text-sm text-muted-foreground mt-1">Calon siswa yang baru saja mendaftar.</p>
              </div>
              <Link to="/admissions/applicants" className="text-sm font-semibold text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Nama Pendaftar</th>
                    <th className="px-6 py-4">Unit Tujuan</th>
                    <th className="px-6 py-4">Tanggal Daftar</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentApplicants.length > 0 ? recentApplicants.map((app) => (
                    <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/admissions/applicants/${app.registration_number}`} className="font-semibold text-primary hover:underline">
                          {app.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{app.registration_number}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">{app.unit}</td>
                      <td className="px-6 py-4">
                        {new Date(app.registration_date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${app.status === 'Lulus Tes' ? 'bg-emerald-100 text-emerald-700' : 
                            app.status === 'Verifikasi Valid' ? 'bg-blue-100 text-blue-700' : 
                            app.status === 'Berkas Lengkap' ? 'bg-purple-100 text-purple-700' : 
                            app.status === 'Ditolak' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'}`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        Belum ada pendaftar terbaru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
