import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Users, FileCheck, XCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboardStats } from "../mock";

export const AdmissionsDashboard: React.FC = () => {
  const statsData = getDashboardStats();

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard SPMB" 
        description="Pantau statistik dan corong (funnel) Seleksi Penerimaan Murid Baru."
        action={
          <Link to="/admissions/applicants" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Kelola Pendaftar
          </Link>
        }
      />

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



      <div className="bg-card border rounded-2xl p-6 shadow-sm mt-6">
        <h3 className="text-lg font-bold mb-6">Funnel Pendaftaran</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#374151' }} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
              <Bar dataKey="jumlah" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
