import React from "react";
import { useTable, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Trash2, Edit, Users, Calendar } from "lucide-react";

export const VacanciesList: React.FC = () => {
  const { tableQueryResult } = useTable({
    resource: "recruitment_vacancies",
    sorters: { initial: [{ field: "created_at", order: "desc" }] }
  });

  const { mutate: deleteVacancy } = useDelete();

  const vacancies = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Lowongan"
        description="Kelola posisi pekerjaan yang sedang dibuka untuk direkrut."
        action={
          <div className="flex gap-2">
            <Link
              to="/recruitment"
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
            >
              Kembali
            </Link>
            <Link
              to="/recruitment/vacancies/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Buka Lowongan
            </Link>
          </div>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data lowongan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Posisi & Judul</th>
                  <th className="px-6 py-4 text-center">Kuota</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Batas Akhir (Deadline)</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vacancies.map((vacancy) => (
                  <tr key={vacancy.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground text-base">{vacancy.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 capitalize flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-muted rounded-md">{vacancy.position?.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        <Users className="w-4 h-4 text-muted-foreground" /> {vacancy.quota} Orang
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        vacancy.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                        vacancy.status === 'closed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {vacancy.status === 'open' ? 'DIBUKA' : vacancy.status === 'closed' ? 'DITUTUP' : 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-4 h-4" /> {formatDate(vacancy.deadline)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          title="Edit Lowongan"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Hapus lowongan ini?')) deleteVacancy({ resource: "recruitment_vacancies", id: vacancy.id as string }) }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vacancies.length === 0 && (
                  <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Belum ada data lowongan pekerjaan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
