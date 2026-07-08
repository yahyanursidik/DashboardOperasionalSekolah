import React from "react";
import { useList, useDelete, useSelect } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Target, Trash2, Edit, Search } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinTargetsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  
  const [selectedHalaqoh, setSelectedHalaqoh] = React.useState<string>("");
  const [search, setSearch] = React.useState("");

  const { options: halaqohOptions } = useSelect({
    resource: "tahfidz_halaqohs",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      { field: "program_type", operator: "eq", value: "tahsin" }
    ],
    sorters: [{ field: "name", order: "asc" }],
  });

  const filters: any[] = [
    { field: "academic_year_id", operator: "eq", value: activeYearId },
    { field: "semester_id", operator: "eq", value: activeSemesterId },
    { field: "target_type", operator: "eq", value: "tahsin" }
  ];

  if (search) {
    filters.push({ field: "students.full_name", operator: "contains", value: search });
  }

  const { data, isLoading } = useList({
    resource: "tahsin_student_targets",
    filters,
    sorters: [
      { field: "students.full_name", order: "asc" }
    ],
    meta: {
      select: "*, students(full_name, classes(name))"
    }
  });

  const { data: halaqohMembers } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }],
    queryOptions: { enabled: !!selectedHalaqoh },
    pagination: { mode: "off" }
  });

  let records = data?.data || [];

  if (selectedHalaqoh && halaqohMembers?.data) {
    const validStudentIds = halaqohMembers.data.map((m: any) => m.student_id);
    records = records.filter(r => validStudentIds.includes(r.student_id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Tilawah & Tahsin"
        description="Atur target tilawah atau penyelesaian jilid secara spesifik per santri."
      />

      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-1 gap-2 max-w-2xl">
          <select
            value={selectedHalaqoh}
            onChange={(e) => setSelectedHalaqoh(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background flex-1"
          >
            <option value="">Semua Halaqoh Tahsin</option>
            {halaqohOptions?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama santri..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none h-10"
            />
          </div>
        </div>
        <Link
          to="/tahsin-student-targets/create"
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
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
                    <td className="px-6 py-4 text-gray-500">
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium border">
                        {record.students?.classes?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">{record.description}</td>
                    <td className="px-6 py-4 font-medium">{record.target_amount} {record.amount_unit}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                        record.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        record.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
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
