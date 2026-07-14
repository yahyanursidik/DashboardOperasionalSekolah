import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { AlertTriangle, BookOpen, Briefcase, CheckCircle2, Clock, FileText, UserCheck, Users, UserX } from "lucide-react";
import { useList } from "@refinedev/core";
import {
  formatPosition,
  formatRecruitmentDate,
  getApplicantNextAction,
  getDaysUntil,
  recruitmentStatuses,
} from "../recruitment-utils";

export const RecruitmentDashboard: React.FC = () => {
  const { data: vacancies } = useList({
    resource: "recruitment_vacancies",
    pagination: { pageSize: 100 },
    sorters: [{ field: "deadline", order: "asc" }],
  });
  const { data: applicants } = useList({
    resource: "recruitment_applicants",
    meta: { select: "*, recruitment_vacancies(title, position, deadline)" },
    pagination: { pageSize: 200 },
    sorters: [{ field: "created_at", order: "desc" }],
  });

  const allVacancies = vacancies?.data ?? [];
  const allApplicants = applicants?.data ?? [];

  const metrics = useMemo(() => {
    const openVacancies = allVacancies.filter((vacancy: any) => vacancy.status === "open");
    const nearDeadline = openVacancies.filter((vacancy: any) => {
      const days = getDaysUntil(vacancy.deadline);
      return days !== null && days >= 0 && days <= 7;
    });

    return {
      activeVacancies: openVacancies.length,
      inProcess: allApplicants.filter((item: any) => !["lulus", "ditolak"].includes(item.status)).length,
      accepted: allApplicants.filter((item: any) => item.status === "lulus").length,
      rejected: allApplicants.filter((item: any) => item.status === "ditolak").length,
      placed: allApplicants.filter((item: any) => !!item.employee_id).length,
      nearDeadline: nearDeadline.length,
    };
  }, [allApplicants, allVacancies]);

  const funnel = recruitmentStatuses.map((status) => ({
    ...status,
    count: allApplicants.filter((item: any) => item.status === status.id).length,
  }));

  const priorityApplicants = allApplicants
    .filter((item: any) => !item.employee_id && item.status !== "ditolak")
    .slice(0, 5);

  const deadlineVacancies = allVacancies
    .filter((vacancy: any) => vacancy.status === "open")
    .filter((vacancy: any) => {
      const days = getDaysUntil(vacancy.deadline);
      return days === null || days >= 0;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Rekrutmen & Penempatan"
        description="Pantau lowongan, funnel seleksi, CBT, dan konversi kandidat menjadi pegawai."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { title: "Lowongan Aktif", count: metrics.activeVacancies, icon: Briefcase, color: "bg-blue-100 text-blue-700", href: "/recruitment/vacancies" },
          { title: "Dalam Proses", count: metrics.inProcess, icon: Users, color: "bg-amber-100 text-amber-700", href: "/recruitment/applicants" },
          { title: "Lulus", count: metrics.accepted, icon: UserCheck, color: "bg-emerald-100 text-emerald-700", href: "/recruitment/applicants" },
          { title: "Sudah Pegawai", count: metrics.placed, icon: CheckCircle2, color: "bg-teal-100 text-teal-700", href: "/employees" },
          { title: "Ditolak", count: metrics.rejected, icon: UserX, color: "bg-red-100 text-red-700", href: "/recruitment/applicants" },
          { title: "Deadline Dekat", count: metrics.nearDeadline, icon: AlertTriangle, color: "bg-orange-100 text-orange-700", href: "/recruitment/vacancies" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} to={card.href} className="bg-card border rounded-lg p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.count}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-semibold">Funnel Seleksi</h3>
              <p className="text-xs text-muted-foreground">Sebaran kandidat per tahapan rekrutmen.</p>
            </div>
            <Link to="/recruitment/applicants" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Kelola Pelamar
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {funnel.map((item) => (
              <div key={item.id} className={`border rounded-lg p-4 ${item.className}`}>
                <p className="text-xs font-medium">{item.shortLabel}</p>
                <p className="text-2xl font-bold mt-1">{item.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
          <div>
            <h3 className="font-semibold">Workflow Mutu</h3>
            <p className="text-xs text-muted-foreground">Alur rekrutmen yang perlu konsisten.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-blue-600" />
              <span>Lowongan punya kebutuhan, kuota, syarat, dan deadline yang jelas.</span>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 mt-0.5 text-purple-600" />
              <span>Seleksi dapat memakai CBT/praktik untuk diniyah, pedagogik, dan kompetensi.</span>
            </div>
            <div className="flex items-start gap-2">
              <UserCheck className="w-4 h-4 mt-0.5 text-emerald-600" />
              <span>Kandidat lulus dikonversi ke master pegawai untuk onboarding.</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/recruitment/vacancies/create" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Buka Lowongan
            </Link>
            <Link to="/recruitment/cbt/exams" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Atur CBT
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Kandidat Perlu Tindak Lanjut</h3>
            <Link to="/recruitment/applicants" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {priorityApplicants.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md p-4 bg-muted/30">Tidak ada kandidat yang perlu tindak lanjut.</p>
            ) : (
              priorityApplicants.map((applicant: any) => (
                <Link key={applicant.id} to={`/recruitment/applicants/show/${applicant.id}`} className="block border rounded-lg p-4 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{applicant.full_name}</p>
                      <p className="text-xs text-muted-foreground">{applicant.recruitment_vacancies?.title || "Lowongan tidak ditemukan"}</p>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded-md">{getApplicantNextAction(applicant)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Lowongan Aktif Terdekat</h3>
            <Link to="/recruitment/vacancies" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Kelola Lowongan
            </Link>
          </div>
          <div className="space-y-3">
            {deadlineVacancies.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md p-4 bg-muted/30">Belum ada lowongan aktif.</p>
            ) : (
              deadlineVacancies.map((vacancy: any) => (
                <div key={vacancy.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{vacancy.title}</p>
                      <p className="text-xs text-muted-foreground">{formatPosition(vacancy.position)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="text-sm font-medium">{formatRecruitmentDate(vacancy.deadline)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {getDaysUntil(vacancy.deadline) === null ? "Tidak ada deadline" : `${getDaysUntil(vacancy.deadline)} hari lagi`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
