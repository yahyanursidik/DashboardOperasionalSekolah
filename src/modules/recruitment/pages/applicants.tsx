import React, { useMemo, useState } from "react";
import { useDelete, useList, useTable } from "@refinedev/core";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import {
  calculateAverageScore,
  formatPosition,
  formatRecruitmentStatus,
  getApplicantNextAction,
  getApplicantQuality,
  getRecruitmentStatusConfig,
  recruitmentStatuses,
} from "../recruitment-utils";

export const ApplicantsList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePortal = location.pathname.startsWith("/hrd") ? "/hrd" : "/recruitment";
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVacancy, setFilterVacancy] = useState("");

  const { data: vacancies } = useList({
    resource: "recruitment_vacancies",
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
  });

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
  if (filterVacancy) filters.push({ field: "vacancy_id", operator: "eq", value: filterVacancy });
  if (searchQuery) {
    filters.push({
      operator: "or",
      value: [
        { field: "full_name", operator: "ilike", value: `%${searchQuery}%` },
        { field: "email", operator: "ilike", value: `%${searchQuery}%` },
        { field: "phone", operator: "ilike", value: `%${searchQuery}%` },
      ],
    });
  }

  const { tableQueryResult, current, setCurrent, pageCount } = useTable({
    resource: "recruitment_applicants",
    meta: { select: "*, recruitment_vacancies(title, position, deadline)" },
    filters: { permanent: filters },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { current: 1, pageSize: 10 },
  });

  const { data: allApplicantsData } = useList({
    resource: "recruitment_applicants",
    pagination: { pageSize: 300 },
  });

  const { mutate: deleteApplicant } = useDelete();
  const applicants = tableQueryResult?.data?.data ?? [];
  const isLoading = tableQueryResult.isLoading;
  const allApplicants = allApplicantsData?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
    setCurrent(1);
  };

  const funnel = useMemo(
    () => recruitmentStatuses.map((status) => ({ ...status, count: allApplicants.filter((item: any) => item.status === status.id).length })),
    [allApplicants]
  );

  const metrics = useMemo(
    () => ({
      total: allApplicants.length,
      inProcess: allApplicants.filter((item: any) => !["lulus", "ditolak"].includes(item.status)).length,
      accepted: allApplicants.filter((item: any) => item.status === "lulus").length,
      placed: allApplicants.filter((item: any) => !!item.employee_id).length,
    }),
    [allApplicants]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracking Pelamar (ATS)"
        description="Kelola seleksi dari berkas masuk, CBT/praktik, wawancara, hingga penempatan pegawai."
        action={
          <div className="flex gap-2">
            <Link to={basePortal} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
              Kembali
            </Link>
            <Link
              to={`${basePortal}/applicants/create`}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Input Pelamar
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: "Total Pelamar", value: metrics.total, icon: Users, tone: "text-slate-700 bg-slate-100" },
          { label: "Dalam Proses", value: metrics.inProcess, icon: BarChart3, tone: "text-amber-700 bg-amber-100" },
          { label: "Lulus", value: metrics.accepted, icon: UserCheck, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Jadi Pegawai", value: metrics.placed, icon: UserCheck, tone: "text-teal-700 bg-teal-100" },
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

      <div className="bg-card rounded-lg border shadow-sm p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {funnel.map((status) => (
          <button
            key={status.id}
            onClick={() => {
              setFilterStatus(status.id === filterStatus ? "" : status.id);
              setCurrent(1);
            }}
            className={`text-left border rounded-lg p-3 transition-colors ${filterStatus === status.id ? status.className : "hover:bg-muted/40"}`}
          >
            <p className="text-xs font-medium">{status.shortLabel}</p>
            <p className="text-xl font-bold mt-1">{status.count}</p>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleSearch} className="flex-1 flex gap-3 w-full">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, email, atau nomor WhatsApp..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors">
            Cari
          </button>
        </form>

        <div className="w-full md:w-auto flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterVacancy}
              onChange={(e) => {
                setFilterVacancy(e.target.value);
                setCurrent(1);
              }}
              className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-56"
            >
              <option value="">Semua Lowongan</option>
              {vacancies?.data?.map((vacancy: any) => (
                <option key={vacancy.id} value={vacancy.id}>
                  {vacancy.title} {vacancy.status === "closed" ? "(Ditutup)" : ""}
                </option>
              ))}
            </select>
          </div>
          <Link to={`${basePortal}/cbt/results`} className="text-sm border rounded-md px-3 py-2 hover:bg-muted">
            Hasil CBT
          </Link>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data pelamar...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-5 py-4">Pelamar</th>
                  <th className="px-5 py-4">Kontak</th>
                  <th className="px-5 py-4">Lowongan</th>
                  <th className="px-5 py-4">Tahapan</th>
                  <th className="px-5 py-4">Skor & Berkas</th>
                  <th className="px-5 py-4">Tindak Lanjut</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applicants.map((app: any) => {
                  const statusConfig = getRecruitmentStatusConfig(app.status);
                  const averageScore = calculateAverageScore(app);
                  const quality = getApplicantQuality(app);
                  return (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors align-top">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{app.full_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{app.last_education || "Pendidikan belum diinput"}</div>
                        {app.employee_id && <span className="inline-block mt-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Sudah jadi pegawai</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> {app.phone || "-"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> {app.email || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{app.recruitment_vacancies?.title || "-"}</p>
                        <p className="text-xs text-muted-foreground">{formatPosition(app.recruitment_vacancies?.position)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusConfig.className}`}>
                          {formatRecruitmentStatus(app.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Rata-rata: <span className="font-semibold text-foreground">{averageScore ?? "-"}</span></p>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={quality >= 80 ? "h-full bg-emerald-500" : quality >= 55 ? "h-full bg-amber-500" : "h-full bg-red-500"} style={{ width: `${quality}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">Kelengkapan {quality}%</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{getApplicantNextAction(app)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`${basePortal}/applicants/show/${app.id}`)}
                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Proses
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Hapus pelamar ini?")) deleteApplicant({ resource: "recruitment_applicants", id: app.id as string });
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus pelamar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {applicants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      Belum ada data pelamar pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="bg-muted/10 px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium">
              Halaman <span className="text-foreground">{current}</span> dari <span className="text-foreground">{pageCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrent((page) => Math.max(1, page - 1))}
                disabled={current === 1}
                className="p-2 rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrent((page) => Math.min(pageCount, page + 1))}
                disabled={current === pageCount}
                className="p-2 rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
