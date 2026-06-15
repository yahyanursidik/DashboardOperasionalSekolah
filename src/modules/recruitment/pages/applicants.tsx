import React, { useState } from "react";
import { useTable, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Trash2, Search, Filter, Eye, Phone, Mail } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  berkas_masuk: "bg-slate-100 text-slate-700",
  seleksi_berkas: "bg-blue-100 text-blue-700",
  ujian_tulis: "bg-purple-100 text-purple-700",
  wawancara: "bg-amber-100 text-amber-700",
  lulus: "bg-emerald-100 text-emerald-700",
  ditolak: "bg-red-100 text-red-700"
};

const STATUS_LABELS: Record<string, string> = {
  berkas_masuk: "Berkas Masuk",
  seleksi_berkas: "Seleksi Berkas",
  ujian_tulis: "Ujian Tulis & Praktik",
  wawancara: "Wawancara",
  lulus: "Lulus / Diterima",
  ditolak: "Ditolak / Gagal"
};

export const ApplicantsList: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
  if (searchQuery) {
    filters.push({
      operator: "or",
      value: [
        { field: "full_name", operator: "ilike", value: `%${searchQuery}%` },
        { field: "email", operator: "ilike", value: `%${searchQuery}%` }
      ]
    });
  }

  const { tableQueryResult } = useTable({
    resource: "recruitment_applicants",
    meta: { select: "*, recruitment_vacancies(title, position)" },
    filters: { permanent: filters },
    sorters: { initial: [{ field: "created_at", order: "desc" }] }
  });

  const { mutate: deleteApplicant } = useDelete();

  const applicants = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracking Pelamar (ATS)"
        description="Kelola proses seleksi pelamar dari berkas masuk hingga penempatan pegawai."
        action={
          <div className="flex gap-2">
            <Link
              to="/recruitment"
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
            >
              Kembali
            </Link>
            <Link
              to="/recruitment/applicants/create"
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Input Pelamar
            </Link>
          </div>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleSearch} className="flex-1 flex gap-4 w-full">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama pelamar atau email..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors">
            Cari
          </button>
        </form>
        
        <div className="w-full md:w-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 min-w-[200px]"
          >
            <option value="">Semua Tahapan</option>
            {Object.keys(STATUS_LABELS).map(key => (
              <option key={key} value={key}>{STATUS_LABELS[key]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data pelamar...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Nama Pelamar</th>
                  <th className="px-6 py-4">Kontak</th>
                  <th className="px-6 py-4">Lowongan Yang Dilamar</th>
                  <th className="px-6 py-4">Tahapan / Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground text-base">{app.full_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{app.last_education || 'Pendidikan belum diinput'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {app.phone || '-'}</div>
                        <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {app.email || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {app.recruitment_vacancies?.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${STATUS_COLORS[app.status]}`}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/recruitment/applicants/show/${app.id}`)}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Proses & Nilai
                        </button>
                        <button 
                          onClick={() => { if(confirm('Hapus pelamar ini?')) deleteApplicant({ resource: "recruitment_applicants", id: app.id as string }) }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {applicants.length === 0 && (
                  <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Belum ada data pelamar pada tahapan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
