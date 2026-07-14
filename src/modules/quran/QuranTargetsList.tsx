import React, { useMemo, useState } from "react";
import { useList, useDelete, useSelect } from "@refinedev/core";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BarChart3, BookOpen, CheckCircle2, ClipboardCheck, Edit, Filter, Plus, Search, Target, Trash2, Users } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

const estimateTargetUnits = (target: any) => {
  const amount = Number(target.target_amount || 1);
  if (target.amount_unit === "juz") return amount * 20;
  if (target.amount_unit === "surah") return amount * 2;
  if (target.amount_unit === "jilid") return amount * 40;
  return amount;
};

export const QuranTargetsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [searchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get("class_id") || "");
  const [selectedType, setSelectedType] = useState("");
  const [search, setSearch] = useState("");

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
    sorters: [{ field: "name", order: "asc" }],
  });
  
  const { data, isLoading } = useList({
    resource: "quran_targets",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
      ...(selectedType ? [{ field: "target_type", operator: "eq" as const, value: selectedType }] : []),
    ],
    sorters: [
      { field: "created_at", order: "desc" }
    ],
    meta: {
      select: "*, classes(id, name, unit_id, units(name))"
    }
  });

  const { data: quranRecordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
    ],
    meta: { select: "id, class_id, student_id, record_type, fluency_score" },
    pagination: { mode: "off" },
  });

  const { data: studentsData } = useList({
    resource: "students",
    filters: [
      { field: "status", operator: "eq" as const, value: "active" },
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
    ],
    meta: { select: "id, class_id" },
    pagination: { mode: "off" },
  });

  const baseRecords = data?.data || [];
  const quranRecords = quranRecordsData?.data || [];
  const students = studentsData?.data || [];
  const getTargetProgress = (target: any) => {
    const matchingRecords = quranRecords.filter((record: any) => record.class_id === target.class_id && record.record_type === target.target_type);
    const classStudentCount = students.filter((student: any) => student.class_id === target.class_id).length;
    const studentCoverage = new Set(matchingRecords.map((record: any) => record.student_id)).size;
    const estimatedTotal = estimateTargetUnits(target);
    const percentage = Math.min(100, Math.round((matchingRecords.length / Math.max(estimatedTotal, 1)) * 100));
    return {
      recordCount: matchingRecords.length,
      studentCoverage,
      classStudentCount,
      percentage,
      isStarted: matchingRecords.length > 0,
    };
  };

  const records = useMemo(() => {
    return baseRecords.filter((record: any) => {
      const lowered = search.toLowerCase();
      const matchesSearch = !search ||
        record.classes?.name?.toLowerCase().includes(lowered) ||
        record.description?.toLowerCase().includes(lowered);
      const matchesUnit = !selectedUnitId || record.classes?.unit_id === selectedUnitId;
      return matchesSearch && matchesUnit;
    });
  }, [baseRecords, search, selectedUnitId]);

  const tahfidzCount = records.filter((record: any) => record.target_type === "tahfidz").length;
  const tahsinCount = records.filter((record: any) => record.target_type === "tahsin").length;
  const startedCount = records.filter((record: any) => getTargetProgress(record).isStarted).length;
  const avgProgress = records.length
    ? Math.round(records.reduce((sum: number, record: any) => sum + getTargetProgress(record).percentage, 0) / records.length)
    : 0;

  const handleDelete = (record: any) => {
    if (!window.confirm(`Hapus target kelas "${record.description}"?`)) return;
    deleteMutate(
      { resource: "quran_targets", id: record.id as string },
      {
        onSuccess: () => toast.success("Target kelas berhasil dihapus"),
        onError: () => toast.error("Gagal menghapus target kelas"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Al-Qur'an (Kelas)"
        description="Kelola target Qur'an per kelas sebagai standar capaian tahfidz dan tahsin semester, lalu pantau bukti setoran dari mutaba'ah."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Target className="h-4 w-4" />
              Target kelas berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Standar capaian Qur'an yang jelas untuk setiap kelas</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Target kelas menjadi acuan umum guru, wali kelas, dan orang tua; target personal tetap dipakai untuk diferensiasi siswa.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Target, label: "Target", value: records.length },
              { icon: BookOpen, label: "Tahfidz", value: tahfidzCount },
              { icon: Users, label: "Tahsin", value: tahsinCount },
              { icon: BarChart3, label: "Rata-rata", value: `${avgProgress}%` },
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
              <p className="text-xl font-bold">{records.length - startedCount}</p>
              <p className="text-[11px] text-muted-foreground">Belum ada setoran</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{startedCount}</p>
              <p className="text-[11px] text-muted-foreground">Berjalan</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{avgProgress}%</p>
              <p className="text-[11px] text-muted-foreground">Progres</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done target kelas
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Kelas", "Tipe program", "Deskripsi", "Jumlah target", "Setoran berjalan"].map((item) => (
              <div key={item} className="rounded-lg border bg-muted/20 p-3 text-xs font-semibold text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filter
          </div>
          <select
            value={selectedUnitId}
            onChange={(event) => {
              setSelectedUnitId(event.target.value);
              setSelectedClassId("");
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Semua unit</option>
            {unitOptions?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Semua kelas</option>
            {classOptions?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Semua tipe</option>
            <option value="tahfidz">Tahfidz</option>
            <option value="tahsin">Tahsin</option>
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kelas atau target..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <Link
          to={selectedClassId ? `/quran-targets/create?class_id=${selectedClassId}` : "/quran-targets/create"}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
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
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tipe</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Deskripsi Target</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Jumlah/Satuan</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Progres</th>
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
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Belum ada target di kelas pada semester ini.
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const progress = getTargetProgress(record);
                  return (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/classes/show/${record.class_id}`} className="font-bold text-gray-900 hover:text-primary">
                        {record.classes?.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{record.classes?.units?.name || "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        record.target_type === 'tahfidz' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {record.target_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{record.description}</td>
                    <td className="px-6 py-4 font-semibold">{record.target_amount} {record.amount_unit}</td>
                    <td className="px-6 py-4 min-w-[180px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{progress.percentage}%</span>
                        <span className="text-muted-foreground">{progress.recordCount} setoran / {progress.studentCoverage}/{progress.classStudentCount} siswa</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress.percentage}%` }} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/quran?class_id=${record.class_id}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Buka mutaba'ah"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/quran-targets/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(record)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
