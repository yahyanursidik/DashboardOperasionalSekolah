import React, { useMemo, useState } from "react";
import { useDelete, useList } from "@refinedev/core";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { AlertTriangle, Calendar, Edit, Filter, Plus, Search, Trash2, UserCheck, Users } from "lucide-react";
import {
  formatPosition,
  formatRecruitmentDate,
  formatVacancyStatus,
  getDaysUntil,
  getVacancyStatusConfig,
} from "../recruitment-utils";

export const VacanciesList: React.FC = () => {
  const location = useLocation();
  const basePortal = location.pathname.startsWith("/hrd") ? "/hrd" : "/recruitment";
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "recruitment_vacancies",
    meta: { select: "*, units(name)" },
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 100 },
  });

  const { data: applicantsData } = useList({
    resource: "recruitment_applicants",
    meta: { select: "id, vacancy_id, status, employee_id" },
    pagination: { pageSize: 300 },
  });

  const { mutate: deleteVacancy } = useDelete();
  const vacancies = data?.data ?? [];

  const applicantStats = useMemo(() => {
    const map = new Map<string, { total: number; accepted: number; placed: number }>();
    (applicantsData?.data ?? []).forEach((applicant: any) => {
      if (!applicant.vacancy_id) return;
      const current = map.get(applicant.vacancy_id) ?? { total: 0, accepted: 0, placed: 0 };
      current.total += 1;
      if (applicant.status === "lulus") current.accepted += 1;
      if (applicant.employee_id) current.placed += 1;
      map.set(applicant.vacancy_id, current);
    });
    return map;
  }, [applicantsData?.data]);

  const filteredVacancies = useMemo(() => {
    if (!searchTerm.trim()) return vacancies;
    const keyword = searchTerm.trim().toLowerCase();
    return vacancies.filter((vacancy: any) =>
      [vacancy.title, vacancy.position, vacancy.units?.name, vacancy.description, vacancy.requirements]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [searchTerm, vacancies]);

  const metrics = useMemo(
    () => ({
      total: vacancies.length,
      open: vacancies.filter((item: any) => item.status === "open").length,
      draft: vacancies.filter((item: any) => item.status === "draft").length,
      closed: vacancies.filter((item: any) => item.status === "closed").length,
      nearDeadline: vacancies.filter((item: any) => {
        const days = getDaysUntil(item.deadline);
        return item.status === "open" && days !== null && days >= 0 && days <= 7;
      }).length,
    }),
    [vacancies]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Lowongan"
        description="Kelola kebutuhan SDM, kuota, deadline, dan jumlah kandidat per lowongan."
        action={
          <div className="flex gap-2">
            <Link to={basePortal} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
              Kembali
            </Link>
            <Link
              to={`${basePortal}/vacancies/create`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Buka Lowongan
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: metrics.total, icon: Users, tone: "text-slate-700 bg-slate-100" },
          { label: "Dibuka", value: metrics.open, icon: UserCheck, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Draft", value: metrics.draft, icon: Edit, tone: "text-blue-700 bg-blue-100" },
          { label: "Ditutup", value: metrics.closed, icon: Trash2, tone: "text-red-700 bg-red-100" },
          { label: "Deadline Dekat", value: metrics.nearDeadline, icon: AlertTriangle, tone: "text-orange-700 bg-orange-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul, posisi, unit, atau syarat..."
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>
        <div className="relative md:w-56">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 bg-background"
          >
            <option value="">Semua Status</option>
            <option value="open">Dibuka</option>
            <option value="draft">Draft</option>
            <option value="closed">Ditutup</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data lowongan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-5 py-4">Posisi & Kebutuhan</th>
                  <th className="px-5 py-4">Kuota & Kandidat</th>
                  <th className="px-5 py-4">Deadline</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Mutu Proses</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVacancies.map((vacancy: any) => {
                  const stats = applicantStats.get(vacancy.id) ?? { total: 0, accepted: 0, placed: 0 };
                  const statusConfig = getVacancyStatusConfig(vacancy.status);
                  const daysLeft = getDaysUntil(vacancy.deadline);
                  const quotaFilled = vacancy.quota ? Math.min(100, Math.round((stats.accepted / vacancy.quota) * 100)) : 0;

                  return (
                    <tr key={vacancy.id} className="hover:bg-muted/30 transition-colors align-top">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{vacancy.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{formatPosition(vacancy.position)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{vacancy.units?.name || "Lintas unit / pusat"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="font-medium">{stats.total} pelamar, {stats.accepted} lulus, kuota {vacancy.quota || 0}</p>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${quotaFilled}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Calendar className="w-4 h-4 text-muted-foreground" /> {formatRecruitmentDate(vacancy.deadline)}
                        </div>
                        <p className={`text-xs mt-1 ${daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 ? "text-orange-700 font-medium" : "text-muted-foreground"}`}>
                          {daysLeft === null ? "Tanpa deadline" : daysLeft < 0 ? "Sudah lewat deadline" : `${daysLeft} hari lagi`}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusConfig.className}`}>
                          {formatVacancyStatus(vacancy.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          <p className={vacancy.description ? "text-green-700" : "text-amber-700"}>{vacancy.description ? "Deskripsi tersedia" : "Deskripsi belum lengkap"}</p>
                          <p className={vacancy.requirements ? "text-green-700" : "text-amber-700"}>{vacancy.requirements ? "Syarat tersedia" : "Syarat belum lengkap"}</p>
                          <p className={stats.accepted >= vacancy.quota ? "text-emerald-700 font-medium" : "text-muted-foreground"}>
                            {stats.accepted >= vacancy.quota ? "Kuota lulus terpenuhi" : "Masih perlu kandidat lulus"}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`${basePortal}/vacancies/edit/${vacancy.id}`} title="Edit lowongan" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded inline-block">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm("Hapus lowongan ini?")) deleteVacancy({ resource: "recruitment_vacancies", id: vacancy.id as string });
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus lowongan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredVacancies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      Belum ada data lowongan pekerjaan untuk filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
