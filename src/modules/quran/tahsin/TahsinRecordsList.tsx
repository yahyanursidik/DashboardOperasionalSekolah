import React, { useEffect, useMemo, useState } from "react";
import { useDelete, useList, useSelect, type CrudFilter } from "@refinedev/core";
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

const fluencyClass = (score?: string) => {
  if (score === "Sangat Lancar") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score === "Lancar") return "bg-blue-50 text-blue-700 border-blue-200";
  if (score === "Kurang Lancar") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
};

export const TahsinRecordsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [searchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState<string>(searchParams.get("halaqoh_id") || "");
  const [selectedStudentId] = useState<string>(searchParams.get("student_id") || "");
  const [selectedFluency, setSelectedFluency] = useState("");
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

  const filters: CrudFilter[] = [
    { field: "record_type", operator: "eq", value: "tahsin" },
    ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
  ];
  if (selectedHalaqohId) filters.push({ field: "halaqoh_id", operator: "eq", value: selectedHalaqohId });
  if (selectedStudentId) filters.push({ field: "student_id", operator: "eq", value: selectedStudentId });
  if (selectedFluency) filters.push({ field: "fluency_score", operator: "eq", value: selectedFluency });
  if (dateFrom) filters.push({ field: "date", operator: "gte", value: dateFrom });
  if (dateTo) filters.push({ field: "date", operator: "lte", value: dateTo });

  const { data, isLoading } = useList({
    resource: "quran_records",
    filters,
    sorters: [{ field: "date", order: "desc" }],
    meta: {
      select: "*, students(id, full_name, nis, class_id, classes(name, unit_id, units(name))), classes(name), employees(full_name), tahfidz_halaqohs(name), subjects(id, name, quran_program_type)",
    },
    pagination: { pageSize: 500 },
  });

  const records = useMemo(() => {
    const base = data?.data || [];
    return base.filter((record: any) => {
      const lowered = search.toLowerCase();
      const matchesSearch = !search ||
        record.students?.full_name?.toLowerCase().includes(lowered) ||
        String(record.students?.nis || "").toLowerCase().includes(lowered) ||
        record.surah_or_jilid?.toLowerCase().includes(lowered) ||
        record.ayat_or_page?.toLowerCase().includes(lowered) ||
        record.notes?.toLowerCase().includes(lowered);
      const matchesUnit = !selectedUnitId || record.students?.classes?.unit_id === selectedUnitId;
      return matchesSearch && matchesUnit;
    });
  }, [data?.data, search, selectedUnitId]);

  const uniqueStudentCount = new Set(records.map((record: any) => record.student_id)).size;
  const veryFluentCount = records.filter((record: any) => record.fluency_score === "Sangat Lancar").length;
  const fluentCount = records.filter((record: any) => record.fluency_score === "Lancar").length;
  const repeatCount = records.filter((record: any) => record.fluency_score === "Mengulang").length;
  const qualityFilledCount = records.filter((record: any) => record.tajwid_score || record.makhroj_score).length;
  const qualityPercent = records.length ? Math.round((qualityFilledCount / records.length) * 100) : 0;
  const latestDate = records[0]?.date ? new Date(records[0].date).toLocaleDateString("id-ID") : "-";

  const createParams = new URLSearchParams();
  if (selectedHalaqohId) createParams.set("halaqoh_id", selectedHalaqohId);
  if (selectedStudentId) createParams.set("student_id", selectedStudentId);
  const createPath = createParams.toString() ? `/tahsin-records/create?${createParams.toString()}` : "/tahsin-records/create";

  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [currentPage, pageSize, records]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleDelete = (record: any) => {
    if (!window.confirm(`Hapus jurnal tahsin "${record.students?.full_name || "siswa"}" tanggal ${new Date(record.date).toLocaleDateString("id-ID")}?`)) return;
    deleteMutate(
      { resource: "quran_records", id: record.id as string },
      {
        onSuccess: () => toast.success("Jurnal tahsin berhasil dihapus"),
        onError: () => toast.error("Gagal menghapus jurnal tahsin"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jurnal Tahsin Harian"
        description="Pantau latihan bacaan, kelancaran, tajwid, makhraj, dan tindak lanjut siswa pada halaqoh Tahsin."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <BookOpen className="h-4 w-4" />
              Jurnal tahsin berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Catatan harian menjadi bukti pembinaan bacaan</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gunakan jurnal ini untuk membaca pola latihan, siswa yang perlu mengulang, dan kesiapan menuju ujian kenaikan jilid.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: "Jurnal", value: records.length },
              { icon: Users, label: "Siswa", value: uniqueStudentCount },
              { icon: CheckCircle2, label: "Lancar+", value: veryFluentCount + fluentCount },
              { icon: BarChart3, label: "Tajwid/Makhraj", value: `${qualityPercent}%` },
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
              <p className="text-xl font-bold">{repeatCount}</p>
              <p className="text-[11px] text-muted-foreground">Mengulang</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{records.length - qualityFilledCount}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa skor</p>
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
            Definition of done jurnal tahsin
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Siswa jelas", "Halaqoh/kelas", "Materi halaman", "Kelancaran", "Tajwid/makhraj"].map((item) => (
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
            <select value={selectedFluency} onChange={(event) => { setSelectedFluency(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Semua kelancaran</option>
              <option value="Sangat Lancar">Sangat Lancar</option>
              <option value="Lancar">Lancar</option>
              <option value="Kurang Lancar">Kurang Lancar</option>
              <option value="Mengulang">Mengulang</option>
            </select>
          </div>
          <Link to={createPath} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Input Jurnal
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, jilid, halaman, atau catatan..."
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
            <h3 className="font-semibold">Daftar jurnal tahsin</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Menampilkan {records.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, records.length)} dari {records.length} jurnal
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
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas/Halaqoh</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Materi</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelancaran</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tajwid/Makhraj</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Penguji</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Memuat data...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Belum ada jurnal tahsin pada filter ini.</td>
                </tr>
              ) : (
                paginatedRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{new Date(record.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-6 py-4">
                      <Link to={`/students/show/${record.student_id}`} className="font-bold text-gray-900 hover:text-primary">{record.students?.full_name}</Link>
                      {record.students?.nis && <p className="text-xs text-muted-foreground">NIS: {record.students.nis}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {record.tahfidz_halaqohs ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{record.tahfidz_halaqohs.name}</span>
                      ) : (
                        <span className="rounded-md border bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{record.classes?.name || record.students?.classes?.name || "-"}</span>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">{record.students?.classes?.units?.name || "-"}</p>
                      {record.subjects?.name && <p className="mt-1 text-[11px] font-semibold text-primary">{record.subjects.name}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-emerald-700">{record.surah_or_jilid}</p>
                      <p className="text-xs text-muted-foreground">{record.ayat_or_page}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${fluencyClass(record.fluency_score)}`}>{record.fluency_score}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-xs">
                        {record.tajwid_score && <span><span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">T</span> <strong>{record.tajwid_score}</strong></span>}
                        {record.makhroj_score && <span><span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">M</span> <strong>{record.makhroj_score}</strong></span>}
                        {!record.tajwid_score && !record.makhroj_score && <span className="italic text-muted-foreground">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{record.employees?.full_name || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/tahsin-student-targets?student_id=${record.student_id}`} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Target siswa">
                          <Target className="h-4 w-4" />
                        </Link>
                        <Link to={`/tahsin-assessments/create?student_id=${record.student_id}&halaqoh_id=${record.halaqoh_id || ""}`} className="rounded-lg p-2 text-purple-600 hover:bg-purple-50" title="Ujian jilid">
                          <Award className="h-4 w-4" />
                        </Link>
                        <Link to={`/tahsin-reports?halaqoh_id=${record.halaqoh_id || ""}`} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Laporan tahsin">
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Link to={`/tahsin-records/edit/${record.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit jurnal">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDelete(record)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Hapus jurnal">
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
