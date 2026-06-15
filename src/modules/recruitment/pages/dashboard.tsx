import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Briefcase, Users, UserCheck, UserX } from "lucide-react";
import { useList } from "@refinedev/core";

export const RecruitmentDashboard: React.FC = () => {
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
      href: "/recruitment/vacancies"
    },
    {
      title: "Pelamar Dalam Proses",
      count: pendingApplicants,
      icon: Users,
      color: "bg-amber-100 text-amber-600",
      href: "/recruitment/applicants"
    },
    {
      title: "Pelamar Lulus",
      count: acceptedApplicants,
      icon: UserCheck,
      color: "bg-emerald-100 text-emerald-600",
      href: "/recruitment/applicants"
    },
    {
      title: "Pelamar Ditolak",
      count: rejectedApplicants,
      icon: UserX,
      color: "bg-red-100 text-red-600",
      href: "/recruitment/applicants"
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Rekrutmen & Penempatan"
        description="Kelola proses penerimaan pegawai, seleksi, hingga penempatan."
      />

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
            <Briefcase className="w-5 h-5 text-primary" /> Lowongan Pekerjaan
          </h3>
          <p className="text-sm text-muted-foreground mb-6">Kelola posisi pekerjaan yang sedang dibuka, kuota, dan persyaratannya. Bagikan info ini ke publik jika diperlukan.</p>
          <Link to="/recruitment/vacancies" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors">
            Kelola Lowongan
          </Link>
        </div>
        
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Proses Pelamar (ATS)
          </h3>
          <p className="text-sm text-muted-foreground mb-6">Lakukan pengecekan berkas, input nilai ujian Diniyah & Pedagogik, catat hasil wawancara, dan tempatkan kandidat yang lulus sebagai Pegawai.</p>
          <Link to="/recruitment/applicants" className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors">
            Kelola Pelamar
          </Link>
        </div>
      </div>
    </div>
  );
};
