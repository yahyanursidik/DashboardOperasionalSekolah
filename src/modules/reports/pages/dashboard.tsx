import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Users, CalendarCheck, FileText, ClipboardList, Clock, PieChart } from "lucide-react";

export const ReportsDashboard: React.FC = () => {
  const reports = [
    {
      title: "Laporan Siswa",
      description: "Lihat data dan demografi siswa aktif, nonaktif, dan kelulusan.",
      icon: Users,
      href: "/reports/students",
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Analitik Visual",
      description: "Dashboard analitik untuk melihat tren, statistik kelas, absensi, dan data komprehensif lainnya.",
      icon: PieChart,
      href: "/reports/analytics",
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      title: "Laporan Absensi",
      description: "Rekapitulasi kehadiran siswa berdasarkan rentang waktu dan kelas.",
      icon: CalendarCheck,
      href: "/reports/attendance",
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Laporan Absensi Pegawai",
      description: "Rekapitulasi kehadiran guru dan staf.",
      icon: CalendarCheck,
      href: "/reports/employee-attendance",
      color: "bg-teal-100 text-teal-600",
    },
    {
      title: "Laporan Cuti & Izin",
      description: "Rekapitulasi pengajuan izin dan cuti pegawai.",
      icon: Clock,
      href: "/reports/leaves",
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Laporan Dokumen",
      description: "Status dokumen masuk, keluar, dan arsip berdasarkan unit.",
      icon: FileText,
      href: "/reports/documents",
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Laporan Tugas",
      description: "Monitoring status dan penyelesaian tugas operasional.",
      icon: ClipboardList,
      href: "/reports/tasks",
      color: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Laporan"
        description="Akses berbagai laporan operasional dan akademik sekolah."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              to={report.href}
              className="bg-card border rounded-xl p-6 hover:shadow-md transition-all group flex flex-col items-start gap-4"
            >
              <div className={`p-3 rounded-lg ${report.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  {report.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {report.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
