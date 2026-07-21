import React, { useMemo, useState } from "react";
import { useDelete, useList, useSelect } from "@refinedev/core";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Edit,
  FileText,
  Filter,
  Plus,
  Search,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

const statusClass = (status?: string) => {
  if (status === "Lulus") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Lulus Bersyarat") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
};

export const TahsinAssessmentsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [searchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState(searchParams.get("halaqoh_id") || "");
  const [selectedStudentId] = useState(searchParams.get("student_id") || "");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: halaqohOptions } = useSelect({
    resource: "tahfidz_halaqohs",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      { field: "program_type", operator: "eq", value: "tahsin" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
  });

  const filters = [
    ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    { field: "assessment_type", operator: "eq" as const, value: "tahsin_jilid" },
    ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
    ...(selectedStatus ? [{ field: "status", operator: "eq" as const, value: selectedStatus }] : []),
    ...(dateFrom ? [{ field: "date", operator: "gte" as const, value: dateFrom }] : []),
    ...(dateTo ? [{ field: "date", operator: "lte" as const, value: dateTo }] : []),
  ];

  const { data, isLoading } = useList({
    resource: "quran_assessments",
    filters,
    sorters: [{ field: "date", order: "desc" }],
    meta: {
      select: "*, students(id, full_name, nis, class_id, classes(name, unit_id, units(name))), classes(name, unit_id, units(name)), employees(full_name), subjects(id, name, quran_program_type), tahfidz_halaqohs(id, name)",
    },
    pagination: { pageSize: 500 },
  });

  const { data: halaqohMembersData } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqohId }],
    queryOptions: { enabled: !!selectedHalaqohId },
    pagination: { mode: "off" },
  });

  const memberStudentIds = useMemo(() => {
    return new Set((halaqohMembersData?.data || []).map((member: any) => member.student_id));
  }, [halaqohMembersData?.data]);

  const records = useMemo(() => {
    let list = data?.data || [];
    if (selectedHalaqohId) list = list.filter((record: any) => memberStudentIds.has(record.student_id));
    if (selectedUnitId) {
      list = list.filter((record: any) => record.classes?.unit_id === selectedUnitId || record.students?.classes?.unit_id === selectedUnitId);
    }
    if (search) {
      const lowered = search.toLowerCase();
      list = list.filter((record: any) =>
        record.students?.full_name?.toLowerCase().includes(lowered) ||
        String(record.students?.nis || "").toLowerCase().includes(lowered) ||
        record.title?.toLowerCase().includes(lowered) ||
        record.predicate?.toLowerCase().includes(lowered) ||
        record.notes?.toLowerCase().includes(lowered)
      );
    }
    return list;
  }, [data?.data, memberStudentIds, search, selectedHalaqohId, selectedUnitId]);

  const passedCount = records.filter((record: any) => record.status === "Lulus").length;
  const conditionalCount = records.filter((record: any) => record.status === "Lulus Bersyarat").length;
  const repeatCount = records.filter((record: any) => record.status === "Mengulang").length;
  const uniqueStudentCount = new Set(records.map((record: any) => record.student_id)).size;
  const averageScore = records.length
    ? Math.round(records.reduce((sum: number, record: any) => sum + Number(record.score || 0), 0) / records.length)
    : 0;
  const latestDate = records[0]?.date ? new Date(records[0].date).toLocaleDateString("id-ID") : "-";

  const createParams = new URLSearchParams();
  if (selectedHalaqohId) createParams.set("halaqoh_id", selectedHalaqohId);
  if (selectedStudentId) createParams.set("student_id", selectedStudentId);
  const createPath = createParams.toString() ? `/tahsin-assessments/create?${createParams.toString()}` : "/tahsin-assessments/create";

  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [currentPage, pageSize, records]);

  React.useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleDelete = (record: any) => {
    if (!window.confirm(`Hapus hasil ujian "${record.title}"?`)) return;
    deleteMutate(
      { resource: "quran_assessments", id: record.id as string },
      {
        onSuccess: () => toast.success("Hasil ujian tahsin berhasil dihapus"),
        onError: () => toast.error("Gagal menghapus hasil ujian tahsin"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ujian Kenaikan Jilid"
        description="Kelola assessment Tahsin sebagai validasi kenaikan jilid, status kelulusan, dan tindak lanjut bacaan siswa."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Award className="h-4 w-4" />
              Validasi kenaikan jilid
            </div>
            <h2 className="mt-3 text-2xl font-bold">Ujian Tahsin memastikan bacaan layak naik tahap</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Assessment ini menjadi pintu keputusan: siswa lulus, lulus bersyarat, atau perlu mengulang bagian tertentu sebelum naik jilid.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Award, label: "Ujian", value: records.length },
              { icon: Users, label: "Siswa", value: uniqueStudentCount },
              { icon: CheckCircle2, label: "Lulus", value: passedCount },
              { icon: BarChart3, label: "Rata-rata", value: averageScore },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/20 p-4">
                <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Perlu tindak lanjut
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{conditionalCount}</p>
              <p className="text-[11px] text-muted-foreground">Bersyarat</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{repeatCount}</p>
              <p className="text-[11px] text-muted-foreground">Mengulang</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{latestDate}</p>
              <p className="text-[11px] text-muted-foreground">Terakhir</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done ujian jilid
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Siswa valid", "Materi jilid", "Penguji", "Nilai/predikat", "Status tindak lanjut"].map((item) => (
              <div key={item} className="rounded-lg border bg-muted/20 p-3 text-xs font-semibold text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            <div className="flex items-center gap-2 px-2 text-sm font-semibold text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter
            </div>
            <select value={selectedUnitId} onChange={(event) => { setSelectedUnitId(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Semua unit</option>
              {unitOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={selectedHalaqohId} onChange={(event) => { setSelectedHalaqohId(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Semua halaqoh</option>
              {halaqohOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Semua status</option>
              <option value="Lulus">Lulus</option>
              <option value="Lulus Bersyarat">Lulus Bersyarat</option>
              <option value="Mengulang">Mengulang</option>
            </select>
          </div>
          <Link to={createPath} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Input Ujian
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, judul, predikat, atau catatan..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm" />
            <span className="text-xs text-muted-foreground">sampai</span>
            <input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold">Daftar ujian kenaikan jilid</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Menampilkan {records.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, records.length)} dari {records.length} ujian
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Baris</span>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Ujian</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Nilai</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Penguji</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Belum ada ujian kenaikan jilid pada filter ini.</td></tr>
              ) : (
                paginatedRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{new Date(record.date).toLocaleDateString("id-ID")}</td>
                    <td className="px-6 py-4">
                      <Link to={`/students/show/${record.student_id}`} className="font-bold text-gray-900 hover:text-primary">{record.students?.full_name}</Link>
                      {record.students?.nis && <p className="text-xs text-muted-foreground">NIS: {record.students.nis}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p>{record.classes?.name || record.students?.classes?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{record.classes?.units?.name || record.students?.classes?.units?.name || "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{record.title}</p>
                      {record.subjects?.name && <p className="mt-1 text-xs font-semibold text-primary">{record.subjects.name}</p>}
                      <p className="text-xs text-muted-foreground">Kenaikan jilid</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold">{record.score}</p>
                      <span className="mt-1 inline-flex rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">{record.predicate || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusClass(record.status)}`}>
                        {record.status || "Lulus"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{record.employees?.full_name || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/tahsin-records?student_id=${record.student_id}`} className="rounded-lg p-2 text-cyan-600 hover:bg-cyan-50" title="Jurnal tahsin">
                          <BookOpen className="h-4 w-4" />
                        </Link>
                        <Link to={`/tahsin-student-targets?student_id=${record.student_id}`} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Target siswa">
                          <Target className="h-4 w-4" />
                        </Link>
                        <Link to={selectedHalaqohId ? `/tahsin-reports?halaqoh_id=${selectedHalaqohId}` : "/tahsin-reports"} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Laporan tahsin">
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Link to={`/tahsin-assessments/edit/${record.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit ujian">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDelete(record)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Hapus ujian">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {records.length > 0 && (
          <div className="flex flex-col gap-3 border-t bg-muted/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">Halaman {currentPage} dari {pageCount}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Awal</button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Sebelumnya</button>
              <span className="rounded-md border bg-background px-3 py-1.5 text-sm font-semibold">{currentPage}</span>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Berikutnya</button>
              <button type="button" onClick={() => setCurrentPage(pageCount)} disabled={currentPage === pageCount} className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Akhir</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
