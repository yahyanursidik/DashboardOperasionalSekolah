import React, { useEffect, useMemo, useState } from "react";
import { useDelete, useList, useSelect } from "@refinedev/core";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Edit,
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

const estimateTargetUnits = (target: any) => {
  const amount = Number(target?.target_amount || 1);
  if (target?.amount_unit === "jilid") return amount * 40;
  if (target?.amount_unit === "surah") return amount * 2;
  if (target?.amount_unit === "juz") return amount * 20;
  return amount;
};

const statusLabel: Record<string, string> = {
  in_progress: "Proses",
  completed: "Tercapai",
  failed: "Perlu Ulang",
};

const statusClass = (status?: string) => {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

export const TahsinTargetsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [searchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState(searchParams.get("halaqoh_id") || "");
  const [selectedStudentId] = useState(searchParams.get("student_id") || "");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq" as const, value: "tahsin" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
  });
  const halaqohs = halaqohsData?.data || [];

  const { data: membersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "id, halaqoh_id, student_id" },
    pagination: { mode: "off" },
  });
  const members = membersData?.data || [];
  const selectedHalaqohStudentIds = useMemo(() => {
    return new Set(members.filter((member: any) => member.halaqoh_id === selectedHalaqohId).map((member: any) => member.student_id));
  }, [members, selectedHalaqohId]);

  const { data, isLoading } = useList({
    resource: "tahsin_student_targets",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "target_type", operator: "eq" as const, value: "tahsin" },
      ...(selectedStatus ? [{ field: "status", operator: "eq" as const, value: selectedStatus }] : []),
      ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
    ],
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select: "*, students(id, full_name, nis, class_id, classes(name, unit_id, units(name))), tahfidz_halaqohs(id, name), subjects(id, name)",
    },
    pagination: { pageSize: 500 },
  });

  const { data: recordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "record_type", operator: "eq" as const, value: "tahsin" },
      ...(selectedHalaqohId ? [{ field: "halaqoh_id", operator: "eq" as const, value: selectedHalaqohId }] : []),
    ],
    meta: { select: "id, student_id, halaqoh_id, subject_id, fluency_score, date" },
    pagination: { mode: "off" },
  });

  const { data: assessmentsData } = useList({
    resource: "quran_assessments",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "assessment_type", operator: "eq" as const, value: "tahsin_jilid" },
    ],
    meta: { select: "id, student_id, halaqoh_id, subject_id, status, date" },
    pagination: { mode: "off" },
  });

  const quranRecords = recordsData?.data || [];
  const assessments = assessmentsData?.data || [];

  const getTargetProgress = (target: any) => {
    const belongsToTarget = (item: any) => {
      if (item.student_id !== target.student_id) return false;
      if (target.halaqoh_id) return item.halaqoh_id === target.halaqoh_id;
      if (target.subject_id) return item.subject_id === target.subject_id;
      return true;
    };
    const studentRecords = quranRecords.filter(belongsToTarget);
    const studentAssessments = assessments.filter(belongsToTarget);
    const repeatRecords = studentRecords.filter((record: any) => record.fluency_score === "Mengulang").length;
    const estimatedTotal = estimateTargetUnits(target);
    const percentage = Math.min(100, Math.round((studentRecords.length / Math.max(estimatedTotal, 1)) * 100));
    return {
      recordCount: studentRecords.length,
      assessmentCount: studentAssessments.length,
      passedAssessments: studentAssessments.filter((assessment: any) => assessment.status === "Lulus").length,
      repeatRecords,
      percentage,
      latestDate: studentRecords[0]?.date || studentAssessments[0]?.date || "",
    };
  };

  const records = useMemo(() => {
    const base = data?.data || [];
    return base.filter((record: any) => {
      const lowered = search.toLowerCase();
      const matchesSearch = !search ||
        record.students?.full_name?.toLowerCase().includes(lowered) ||
        String(record.students?.nis || "").toLowerCase().includes(lowered) ||
        record.description?.toLowerCase().includes(lowered);
      const matchesUnit = !selectedUnitId || record.students?.classes?.unit_id === selectedUnitId;
      const matchesHalaqoh = !selectedHalaqohId ||
        record.halaqoh_id === selectedHalaqohId ||
        (!record.halaqoh_id && selectedHalaqohStudentIds.has(record.student_id));
      return matchesSearch && matchesUnit && matchesHalaqoh;
    });
  }, [data?.data, search, selectedHalaqohId, selectedHalaqohStudentIds, selectedUnitId]);

  const totalTargets = records.length;
  const completedTargets = records.filter((record: any) => record.status === "completed").length;
  const inProgressTargets = records.filter((record: any) => record.status === "in_progress").length;
  const failedTargets = records.filter((record: any) => record.status === "failed").length;
  const startedTargets = records.filter((record: any) => getTargetProgress(record).recordCount > 0).length;
  const averageProgress = records.length
    ? Math.round(records.reduce((sum: number, record: any) => sum + getTargetProgress(record).percentage, 0) / records.length)
    : 0;
  const needFollowUp = records.filter((record: any) => {
    const progress = getTargetProgress(record);
    return record.status === "failed" || progress.repeatRecords > 0 || (record.status === "in_progress" && progress.recordCount === 0);
  }).length;

  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [currentPage, pageSize, records]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleDelete = (record: any) => {
    if (!window.confirm(`Hapus target tahsin "${record.description}"?`)) return;
    deleteMutate(
      { resource: "tahsin_student_targets", id: record.id as string },
      {
        onSuccess: () => toast.success("Target tahsin berhasil dihapus"),
        onError: () => toast.error("Gagal menghapus target tahsin"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Personal Tahsin"
        description="Kelola target jilid, halaman, atau tilawah per siswa dan pantau progresnya dari jurnal Tahsin serta ujian kenaikan jilid."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Target className="h-4 w-4" />
              Target tahsin berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Setiap siswa punya arah pembinaan bacaan yang terukur</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Target personal membantu guru melihat siapa yang perlu latihan ulang, siapa yang siap ujian jilid, dan siapa yang belum mulai jurnal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Target, label: "Target", value: totalTargets },
              { icon: CheckCircle2, label: "Tercapai", value: completedTargets },
              { icon: ClipboardCheck, label: "Berjalan", value: startedTargets },
              { icon: BarChart3, label: "Rata-rata", value: `${averageProgress}%` },
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
              <p className="text-xl font-bold">{inProgressTargets}</p>
              <p className="text-[11px] text-muted-foreground">Proses</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{failedTargets}</p>
              <p className="text-[11px] text-muted-foreground">Perlu ulang</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{needFollowUp}</p>
              <p className="text-[11px] text-muted-foreground">Follow-up</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done target tahsin
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Siswa jelas", "Halaqoh", "Target terukur", "Jurnal berjalan", "Status tindak lanjut"].map((item) => (
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
              {halaqohs.map((halaqoh: any) => <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>)}
            </select>
            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setCurrentPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Semua status</option>
              <option value="in_progress">Proses</option>
              <option value="completed">Tercapai</option>
              <option value="failed">Perlu Ulang</option>
            </select>
          </div>
          <Link
            to={selectedHalaqohId ? `/tahsin-student-targets/create?halaqoh_id=${selectedHalaqohId}` : "/tahsin-student-targets/create"}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah Target
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari siswa, NIS, atau target..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold">Daftar target personal tahsin</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Menampilkan {records.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, records.length)} dari {records.length} target
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
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Target</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Jumlah</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Progres</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Memuat data...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Belum ada target tahsin personal pada filter ini.</td>
                </tr>
              ) : (
                paginatedRecords.map((record: any) => {
                  const progress = getTargetProgress(record);
                  return (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/students/show/${record.student_id}`} className="font-bold text-gray-900 hover:text-primary">
                          {record.students?.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {record.students?.nis ? `NIS: ${record.students.nis} - ` : ""}{record.students?.classes?.units?.name || "-"} / {record.students?.classes?.name || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-emerald-700">{record.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.subjects?.name || "Mapel Tahsin belum ditautkan"} · {record.tahfidz_halaqohs?.name || "Tanpa halaqoh"}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-medium">{record.target_amount} {record.amount_unit}</td>
                      <td className="px-6 py-4 min-w-[190px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{progress.percentage}%</span>
                          <span className="text-muted-foreground">{progress.recordCount} jurnal / {progress.assessmentCount} ujian</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress.percentage}%` }} />
                        </div>
                        {progress.repeatRecords > 0 && <p className="mt-1 text-xs text-red-600">{progress.repeatRecords} catatan mengulang</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusClass(record.status)}`}>
                          {statusLabel[record.status] || record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/tahsin-records?student_id=${record.student_id}`} className="rounded-lg p-2 text-cyan-600 hover:bg-cyan-50" title="Jurnal tahsin">
                            <BookOpen className="h-4 w-4" />
                          </Link>
                          <Link to={`/tahsin-assessments?student_id=${record.student_id}`} className="rounded-lg p-2 text-purple-600 hover:bg-purple-50" title="Ujian jilid">
                            <Award className="h-4 w-4" />
                          </Link>
                          <Link to={`/tahsin-student-targets/edit/${record.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit target">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button onClick={() => handleDelete(record)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Hapus target">
                            <Trash2 className="h-4 w-4" />
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
