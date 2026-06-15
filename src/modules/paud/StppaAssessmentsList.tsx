import React from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, CheckSquare, Trash2, Edit } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const StppaAssessmentsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  
  const { data, isLoading } = useList({
    resource: "paud_stppa_assessments",
    filters: [
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId }
    ],
    sorters: [
      { field: "date", order: "desc" }
    ],
    meta: {
      select: "*, students(full_name), employees(full_name)"
    }
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penilaian Perkembangan Anak (STPPA)"
        description="Checklist dan narasi rapor PAUD untuk 6 aspek perkembangan anak."
      />

      <div className="flex justify-end">
        <Link
          to="/stppa-assessments/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Input Evaluasi Baru
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Periode</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Nilai Agama</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Fisik Motorik</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kognitif</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Guru</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground flex flex-col items-center">
                    <CheckSquare className="w-8 h-8 opacity-20 mb-2" />
                    Belum ada data evaluasi STPPA.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{record.period_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{record.students?.full_name}</td>
                    <td className="px-6 py-4"><BadgeScale scale={record.agama_moral_scale} /></td>
                    <td className="px-6 py-4"><BadgeScale scale={record.fisik_motorik_scale} /></td>
                    <td className="px-6 py-4"><BadgeScale scale={record.kognitif_scale} /></td>
                    <td className="px-6 py-4 text-gray-500">{record.employees?.full_name || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/stppa-assessments/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Hapus evaluasi ini?")) {
                              deleteMutate({
                                resource: "paud_stppa_assessments",
                                id: record.id as string,
                              });
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BadgeScale = ({ scale }: { scale: string }) => {
  if (!scale) return <span className="text-gray-300">-</span>;
  
  const colors: any = {
    'BB': 'bg-red-100 text-red-700 border-red-200',
    'MB': 'bg-amber-100 text-amber-700 border-amber-200',
    'BSH': 'bg-blue-100 text-blue-700 border-blue-200',
    'BSB': 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold border ${colors[scale] || 'bg-gray-100'}`}>
      {scale}
    </span>
  );
};
