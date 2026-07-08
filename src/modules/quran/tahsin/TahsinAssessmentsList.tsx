import React from "react";
import { useList, useDelete, useSelect } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Award, Trash2, Edit, Search } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinAssessmentsList: React.FC = () => {
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
    { field: "assessment_type", operator: "eq", value: "tahsin_jilid" }
  ];

  if (selectedHalaqoh) {
    // Note: quran_assessments does not have halaqoh_id column directly.
    // However, we want to filter by students in that halaqoh.
    // The easiest way on the frontend without a complex join is to fetch members first, 
    // but Refine's supabase provider might not support this easily without a custom query.
    // Actually, quran_assessments doesn't link to halaqoh_id directly in the table. 
    // To keep it simple, we will just filter on the client side below.
  }

  if (search) {
    filters.push({ field: "students.full_name", operator: "contains", value: search });
  }

  const { data, isLoading } = useList({
    resource: "quran_assessments",
    filters,
    sorters: [
      { field: "date", order: "desc" }
    ],
    meta: {
      select: "*, students(full_name), classes(name), employees(full_name)"
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
        title="Ujian Kenaikan Jilid"
        description="Data ujian kenaikan jilid tahsin siswa."
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
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none h-10"
            />
          </div>
        </div>
        <Link
          to="/tahsin-assessments/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Input Nilai Ujian Jilid
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tipe / Judul</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Nilai/Predikat</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Status</th>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada data ujian kenaikan jilid tahsin.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{new Date(record.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 font-medium">{record.students?.full_name}</td>
                    <td className="px-6 py-4 text-gray-500">{record.classes?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{record.title}</span>
                        <span className="text-xs text-muted-foreground capitalize">{record.assessment_type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">{record.score}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 w-max">
                          {record.predicate || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                        record.status === 'Lulus' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        record.status === 'Lulus Bersyarat' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {record.status || 'Lulus'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/tahsin-assessments/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Hapus data ujian jilid ini?")) {
                              deleteMutate({
                                resource: "quran_assessments",
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
