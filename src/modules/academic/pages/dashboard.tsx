import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { GraduationCap, BookOpen, FileText, FileBadge, TrendingUp, Users } from "lucide-react";
import { useList } from "@refinedev/core";

export const AcademicDashboard: React.FC = () => {
  const { data: students } = useList({ resource: "students", pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", pagination: { mode: "off" } });
  const { data: subjects } = useList({ resource: "subjects", pagination: { mode: "off" } });

  const stats = [
    { label: "Total Siswa Aktif", value: students?.data?.length || 0, icon: <Users className="w-5 h-5" />, color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-600" },
    { label: "Total Rombel/Kelas", value: classes?.data?.length || 0, icon: <BookOpen className="w-5 h-5" />, color: "bg-indigo-500", lightColor: "bg-indigo-50 text-indigo-600" },
    { label: "Mata Pelajaran", value: subjects?.data?.length || 0, icon: <GraduationCap className="w-5 h-5" />, color: "bg-emerald-500", lightColor: "bg-emerald-50 text-emerald-600" },
    { label: "Rapor Dicetak", value: "0", icon: <FileBadge className="w-5 h-5" />, color: "bg-amber-500", lightColor: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Akademik & KBM"
        description="Pantau kegiatan belajar mengajar, kelola nilai siswa, dan cetak e-Rapor."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className={`p-4 rounded-xl ${stat.lightColor}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Actions */}
      <h3 className="text-lg font-bold pt-4">Menu Utama Akademik</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/academic/gradebook" className="group flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/30">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold mb-2">Input Nilai (Gradebook)</h4>
          <p className="text-sm text-muted-foreground text-center">Isi nilai ulangan, tugas, ujian Diniyah per kelas & mata pelajaran.</p>
        </Link>

        <Link to="/academic/reports" className="group flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/30">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold mb-2">Master Rapor Siswa</h4>
          <p className="text-sm text-muted-foreground text-center">Kelola catatan wali kelas, predikat sikap, tahsin & tahfidz.</p>
        </Link>

        <Link to="/academic/reports" className="group flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/30">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileBadge className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold mb-2">Cetak e-Rapor</h4>
          <p className="text-sm text-muted-foreground text-center">Cetak rapor semester PDF secara otomatis untuk dibagikan ke wali murid.</p>
        </Link>
      </div>
    </div>
  );
};
