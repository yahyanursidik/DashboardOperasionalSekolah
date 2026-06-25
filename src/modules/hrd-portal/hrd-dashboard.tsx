import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Briefcase, Users, UserCheck, UserX, Laptop } from "lucide-react";
import { useList } from "@refinedev/core";

export const HrdDashboard: React.FC = () => {
  const { data: vacancies } = useList({ resource: "recruitment_vacancies" });
  const { data: applicants } = useList({ resource: "recruitment_applicants" });

  const activeVacancies = vacancies?.data?.filter(v => v.status === 'open').length || 0;
  
  const allApplicants = applicants?.data || [];
  const pendingApplicants = allApplicants.filter(a => !['lulus', 'ditolak'].includes(a.status)).length;
  const acceptedApplicants = allApplicants.filter(a => a.status === 'lulus').length;
  const rejectedApplicants = allApplicants.filter(a => a.status === 'ditolak').length;

  const cards = [
    {
      title: "Lowongan Aktif",
      count: activeVacancies,
      icon: Briefcase,
      color: "bg-blue-100 text-blue-600",
      href: "/hrd/vacancies"
    },
    {
      title: "Pelamar Proses",
      count: pendingApplicants,
      icon: Users,
      color: "bg-amber-100 text-amber-600",
      href: "/hrd/applicants"
    },
    {
      title: "Pelamar Lulus",
      count: acceptedApplicants,
      icon: UserCheck,
      color: "bg-emerald-100 text-emerald-600",
      href: "/hrd/applicants"
    },
    {
      title: "Pelamar Ditolak",
      count: rejectedApplicants,
      icon: UserX,
      color: "bg-red-100 text-red-600",
      href: "/hrd/applicants"
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Utama HRD"
        description="Kelola rekrutmen, penempatan, ujian online (CBT), dan data karyawan Yayasan."
      />

      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-5 shadow-sm flex items-start gap-4">
        <div className="text-2xl mt-1">👋</div>
        <div>
          <p className="font-bold text-emerald-900 text-lg mb-1">Assalamu’alaikum, Tim HRD</p>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Semoga hari ini Allah mudahkan urusan kita semua dan Allah mudahkan setiap ikhtiar kita dalam mengelola amanah SDM, menjaga ketertiban administrasi, dan mendukung tumbuhnya lingkungan kerja yang lebih tertata, profesional, dan penuh keberkahan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link key={i} to={card.href} className="bg-card border rounded-xl p-6 hover:shadow-md transition-all flex items-center gap-4 group">
              <div className={`p-4 rounded-xl ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {card.count}
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {card.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Manajemen Lowongan & ATS
          </h3>
          <p className="text-sm text-muted-foreground mb-6">Buka lowongan kerja, atur syarat, cek berkas kandidat (ATS) hingga proses wawancara pelamar.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/hrd/vacancies" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors">
              Lowongan Aktif
            </Link>
            <Link to="/hrd/applicants" className="inline-flex items-center justify-center px-4 py-2 border border-input text-foreground font-medium text-sm rounded-lg hover:bg-accent transition-colors">
              Data Pelamar
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-indigo-600" /> Ujian Online (CBT)
          </h3>
          <p className="text-sm text-muted-foreground mb-6">Buat bank soal, atur jadwal ujian online bagi kandidat, dan pantau hasil CBT secara otomatis.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/hrd/cbt/banks" className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors">
              Bank Soal
            </Link>
            <Link to="/hrd/cbt/exams" className="inline-flex items-center justify-center px-4 py-2 border border-input text-foreground font-medium text-sm rounded-lg hover:bg-accent transition-colors">
              Ujian CBT
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
