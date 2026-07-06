import React from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Target, Trash2, Edit } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinTargetsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  
  const { data, isLoading } = useList({
    resource: "tahsin_student_targets",
    filters: [
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId },
      { field: "target_type", operator: "eq", value: "tahsin" }
    ],
    sorters: [
      { field: "students.full_name", order: "asc" }
    ],
    meta: {
      select: "*, students(full_name, classes(name))"
    }
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Tilawah & Tahsin"
        description="Atur target tilawah atau penyelesaian jilid secara spesifik per santri."
      />

      <div className="flex justify-end">
        <Link
          to="/tahsin-student-targets/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Target
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Santri</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Target</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Jumlah</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada target tahsin personal untuk semester ini.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{record.students?.full_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{record.students?.classes?.name}</td>
                    <td className="px-6 py-4 font-medium">{record.description}</td>
                    <td className="px-6 py-4">{record.target_amount} {record.amount_unit}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        record.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        record.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.status === 'in_progress' ? 'Proses' : record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/tahsin-student-targets/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Hapus target tahsin ini?")) {
                              deleteMutate({
                                resource: "tahsin_student_targets",
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
