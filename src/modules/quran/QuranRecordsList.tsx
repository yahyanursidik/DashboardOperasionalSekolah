import React, { useMemo, useState } from "react";
import { useList, useSelect, useDelete, type CrudFilter } from "@refinedev/core";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BarChart3, BookOpen, CalendarDays, CheckCircle2, Edit, FileText, Filter, Plus, Search, Target, Trash2, Users } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

export const QuranRecordsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [searchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>(searchParams.get("class_id") || "");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState<string>(searchParams.get("halaqoh_id") || "");
  const [selectedStudentId] = useState<string>(searchParams.get("student_id") || "");
  const [selectedFluency, setSelectedFluency] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : [],
    queryOptions: { enabled: !!selectedUnitId },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: halaqohOptions } = useSelect({
    resource: "tahfidz_halaqohs",
    optionLabel: "name",
    optionValue: "id",
    filters: [{ field: "program_type", operator: "eq", value: "tahfidz" }],
    sorters: [{ field: "name", order: "asc" }],
  });

  const filters: CrudFilter[] = [
    { field: "record_type", operator: "eq", value: "tahfidz" },
    ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
  ];
  if (selectedClassId) {
    filters.push({ field: "class_id", operator: "eq", value: selectedClassId });
  }
  if (selectedHalaqohId) {
    filters.push({ field: "halaqoh_id", operator: "eq", value: selectedHalaqohId });
  }
  if (selectedStudentId) {
    filters.push({ field: "student_id", operator: "eq", value: selectedStudentId });
  }
  if (selectedFluency) {
    filters.push({ field: "fluency_score", operator: "eq", value: selectedFluency });
  }
  if (dateFrom) {
    filters.push({ field: "date", operator: "gte", value: dateFrom });
  }
  if (dateTo) {
    filters.push({ field: "date", operator: "lte", value: dateTo });
  }

  const { data, isLoading } = useList({
    resource: "quran_records",
    filters,
    sorters: [
      { field: "date", order: "desc" }
    ],
    meta: {
      select: "*, students(id, full_name, nis, classes(name, units(name))), classes(name), employees(full_name), tahfidz_halaqohs(name)"
    },
    pagination: { pageSize: 500 },
  });

  const records = useMemo(() => {
    const base = data?.data || [];
    if (!search) return base;
    const lowered = search.toLowerCase();
    return base.filter((record: any) => {
      return (
        record.students?.full_name?.toLowerCase().includes(lowered) ||
        record.students?.nis?.toLowerCase().includes(lowered) ||
        record.surah_or_jilid?.toLowerCase().includes(lowered) ||
        record.ayat_or_page?.toLowerCase().includes(lowered)
      );
    });
  }, [data?.data, search]);

  const uniqueStudentCount = new Set(records.map((record: any) => record.student_id)).size;
  const veryFluentCount = records.filter((record: any) => record.fluency_score === "Sangat Lancar").length;
  const repeatCount = records.filter((record: any) => record.fluency_score === "Mengulang").length;
  const tajwidFilledCount = records.filter((record: any) => record.tajwid_score || record.makhroj_score).length;
  const qualityPercent = records.length ? Math.round((tajwidFilledCount / records.length) * 100) : 0;
  const latestDate = records[0]?.date ? new Date(records[0].date).toLocaleDateString("id-ID") : "-";
  const createRecordParams = new URLSearchParams();
  if (selectedClassId) createRecordParams.set("class_id", selectedClassId);
  if (selectedHalaqohId) createRecordParams.set("halaqoh_id", selectedHalaqohId);
  if (selectedStudentId) createRecordParams.set("student_id", selectedStudentId);
  const createRecordPath = createRecordParams.toString() ? `/quran/create?${createRecordParams.toString()}` : "/quran/create";
  const handleDelete = (id: string) => {
    if (!window.confirm("Hapus catatan mutaba'ah ini?")) return;
    deleteMutate(
      { resource: "quran_records", id },
      {
        onSuccess: () => toast.success("Catatan mutaba'ah berhasil dihapus"),
        onError: () => toast.error("Gagal menghapus catatan mutaba'ah"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buku Mutaba'ah Ziyadah"
        description="Pantau setoran tahfidz harian siswa, kelancaran hafalan, kualitas tajwid/makhraj, dan tindak lanjut target semester."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <BookOpen className="h-4 w-4" />
              Mutaba'ah ziyadah berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Catatan setoran menjadi bukti proses, bukan hanya arsip nilai</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gunakan halaman ini untuk membaca ritme setoran, siswa yang perlu mengulang, kualitas tajwid/makhraj, dan tindak lanjut target hafalan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: "Setoran", value: records.length },
              { icon: Users, label: "Siswa", value: uniqueStudentCount },
              { icon: CheckCircle2, label: "Sangat Lancar", value: veryFluentCount },
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
              <p className="text-xl font-bold">{records.length - tajwidFilledCount}</p>
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
            Definition of done setoran
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Siswa jelas", "Halaqoh/kelas", "Materi ayat", "Kelancaran", "Tajwid/makhraj"].map((item) => (
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
          <select
            value={selectedUnitId}
            onChange={(e) => {
              setSelectedUnitId(e.target.value);
              setSelectedClassId("");
            }}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Semua Unit</option>
            {unitOptions?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={!selectedUnitId}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
          >
            <option value="">Semua Kelas</option>
            {classOptions?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
            <select
              value={selectedHalaqohId}
              onChange={(e) => setSelectedHalaqohId(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Semua Halaqoh</option>
              {halaqohOptions?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={selectedFluency}
              onChange={(e) => setSelectedFluency(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Semua Kelancaran</option>
              <option value="Sangat Lancar">Sangat Lancar</option>
              <option value="Lancar">Lancar</option>
              <option value="Kurang Lancar">Kurang Lancar</option>
              <option value="Mengulang">Mengulang</option>
            </select>
          </div>
          <Link
            to={createRecordPath}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Input Setoran
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="text"
              placeholder="Cari siswa, NIS, surah, atau ayat..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <span className="text-xs text-muted-foreground">sampai</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas/Halaqoh</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Materi / Surah</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Ayat / Halaman</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelancaran</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tajwid/Makhroj</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Penguji</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    Belum ada catatan mutaba'ah ziyadah tahfidz.
                  </td>
                </tr>
              ) : (
                records.map((record: any) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">{new Date(record.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <Link to={`/students/show/${record.student_id}`} className="font-bold text-gray-900 hover:text-primary">
                        {record.students?.full_name}
                      </Link>
                      {record.students?.nis && <p className="mt-0.5 text-xs text-muted-foreground">NIS: {record.students.nis}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {record.tahfidz_halaqohs ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium border border-emerald-200">{record.tahfidz_halaqohs.name}</span>
                      ) : (
                        record.classes?.name || '-'
                      )}
                      {record.students?.classes?.units?.name && <p className="mt-1 text-[11px] text-muted-foreground">{record.students.classes.units.name}</p>}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{record.surah_or_jilid}</td>
                    <td className="px-6 py-4">{record.ayat_or_page}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        record.fluency_score === 'Sangat Lancar' ? 'bg-emerald-100 text-emerald-700' :
                        record.fluency_score === 'Lancar' ? 'bg-blue-100 text-blue-700' :
                        record.fluency_score === 'Kurang Lancar' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.fluency_score}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        {record.tajwid_score && <span><span className="text-muted-foreground">Tajwid:</span> {record.tajwid_score}</span>}
                        {record.makhroj_score && <span><span className="text-muted-foreground">Makhroj:</span> {record.makhroj_score}</span>}
                        {!record.tajwid_score && !record.makhroj_score && <span className="text-muted-foreground">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{record.employees?.full_name || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Link
                          to={`/tahfidz-student-targets?halaqoh_id=${record.halaqoh_id || ""}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Target siswa"
                        >
                          <Target className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/tahfidz-reports?halaqoh_id=${record.halaqoh_id || ""}`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Laporan"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/quran/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit setoran"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(record.id as string)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus setoran"
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
