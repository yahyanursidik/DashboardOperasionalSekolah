import React, { useMemo, useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Edit, FileText, Filter, Plus, Search, Target, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

const estimateTargetUnits = (target: any) => {
  const amount = Number(target.target_amount || 1);
  if (target.amount_unit === "juz") return amount * 20;
  if (target.amount_unit === "surah") return amount * 2;
  return amount;
};

export const TahfidzTargetsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [searchParams] = useSearchParams();
  const [selectedHalaqoh, setSelectedHalaqoh] = useState(searchParams.get("halaqoh_id") || "");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useList({
    resource: "tahfidz_student_targets",
    filters: [
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId },
      { field: "target_type", operator: "eq", value: "tahfidz" },
    ],
    sorters: [
      { field: "created_at", order: "desc" }
    ],
    meta: {
      select: "*, students(id, full_name, nis, classes(id, name, units(name))), tahfidz_halaqohs(id, name), subjects(id, name)"
    }
  });

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [{ field: "program_type", operator: "eq", value: "tahfidz" }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
  });

  const { data: membersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "halaqoh_id, student_id, tahfidz_halaqohs(name)" },
    pagination: { mode: "off" },
  });

  const { data: quranRecordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "record_type", operator: "eq" as const, value: "tahfidz" },
    ],
    meta: { select: "id, student_id, halaqoh_id, subject_id, fluency_score, date" },
    pagination: { mode: "off" },
  });

  const targetRecords = data?.data || [];
  const members = membersData?.data || [];
  const quranRecords = quranRecordsData?.data || [];
  const getStudentHalaqoh = (studentId: string) => {
    return members.find((member: any) => member.student_id === studentId);
  };
  const getProgress = (target: any) => {
    const fallbackMembership = getStudentHalaqoh(target.student_id);
    const halaqohId = target.halaqoh_id || fallbackMembership?.halaqoh_id || "";
    const setoran = quranRecords.filter((record: any) => {
      if (record.student_id !== target.student_id) return false;
      if (target.halaqoh_id) return record.halaqoh_id === target.halaqoh_id;
      if (target.subject_id) return record.subject_id === target.subject_id;
      return true;
    });
    const estimatedTotal = estimateTargetUnits(target);
    const percentage = Math.min(100, Math.round((setoran.length / Math.max(estimatedTotal, 1)) * 100));
    return {
      halaqohId,
      halaqohName: target.tahfidz_halaqohs?.name || fallbackMembership?.tahfidz_halaqohs?.name || "Tanpa halaqoh",
      setoranCount: setoran.length,
      percentage,
    };
  };

  const filteredRecords = useMemo(() => {
    return targetRecords.filter((record: any) => {
      const progress = getProgress(record);
      const name = record.students?.full_name || "";
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || record.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !selectedStatus || record.status === selectedStatus;
      const matchesHalaqoh = !selectedHalaqoh || progress.halaqohId === selectedHalaqoh;
      return matchesSearch && matchesStatus && matchesHalaqoh;
    });
  }, [targetRecords, members, quranRecords, search, selectedStatus, selectedHalaqoh]);

  const completedCount = filteredRecords.filter((record: any) => record.status === "completed").length;
  const inProgressCount = filteredRecords.filter((record: any) => record.status === "in_progress").length;
  const failedCount = filteredRecords.filter((record: any) => record.status === "failed").length;
  const targetsWithSetoran = filteredRecords.filter((record: any) => getProgress(record).setoranCount > 0).length;
  const avgProgress = filteredRecords.length
    ? Math.round(filteredRecords.reduce((sum: number, record: any) => sum + getProgress(record).percentage, 0) / filteredRecords.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Hafalan Personal"
        description="Kelola target tahfidz per siswa sebagai dasar monitoring setoran, evaluasi muhaffizh, dan laporan perkembangan semester."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Target className="h-4 w-4" />
              Target tahfidz berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Target personal menjadi janji belajar setiap siswa</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Setiap target sebaiknya punya halaqoh, siswa, deskripsi hafalan, satuan capaian, dan setoran rutin agar progres tidak sekadar tercatat di akhir semester.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Target, label: "Target", value: filteredRecords.length },
              { icon: CheckCircle2, label: "Tercapai", value: completedCount },
              { icon: ClipboardCheck, label: "Ada Setoran", value: `${targetsWithSetoran}/${filteredRecords.length}` },
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
            Status target
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{inProgressCount}</p>
              <p className="text-[11px] text-muted-foreground">Proses</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{completedCount}</p>
              <p className="text-[11px] text-muted-foreground">Tercapai</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{failedCount}</p>
              <p className="text-[11px] text-muted-foreground">Perlu ulang</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done target
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Halaqoh", "Siswa", "Deskripsi hafalan", "Jumlah target", "Setoran berjalan"].map((item) => (
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
            value={selectedHalaqoh}
            onChange={(event) => setSelectedHalaqoh(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Semua halaqoh</option>
            {halaqohsData?.data?.map((halaqoh: any) => (
              <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Semua status</option>
            <option value="in_progress">Proses</option>
            <option value="completed">Tercapai</option>
            <option value="failed">Perlu ulang</option>
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari siswa atau target..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <Link
          to={selectedHalaqoh ? `/tahfidz-student-targets/create?halaqoh_id=${selectedHalaqoh}` : "/tahfidz-student-targets/create"}
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
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Halaqoh/Kelas</th>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Belum ada target personal untuk semester ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record: any) => {
                  const progress = getProgress(record);
                  return (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/students/show/${record.student_id}`} className="font-bold text-gray-900 hover:text-primary">
                        {record.students?.full_name || "-"}
                      </Link>
                      {record.students?.nis && <p className="mt-0.5 text-xs text-muted-foreground">NIS: {record.students.nis}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{progress.halaqohName}</span>
                        <span className="text-xs text-muted-foreground">{record.students?.classes?.name || "Tanpa kelas"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium max-w-[260px]">
                      <p className="truncate">{record.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{record.subjects?.name || "Mapel Tahfidz belum ditautkan"}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold">{record.target_amount} {record.amount_unit}</td>
                    <td className="px-6 py-4 min-w-[160px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{progress.percentage}%</span>
                        <span className="text-muted-foreground">{progress.setoranCount} setoran</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress.percentage}%` }} />
                      </div>
                    </td>
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
                          to={`/quran/create?student_id=${record.student_id}&halaqoh_id=${progress.halaqohId}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Input setoran"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/tahfidz-reports?halaqoh_id=${progress.halaqohId}`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Laporan"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/tahfidz-student-targets/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit target"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Hapus target personal ini?")) {
                              deleteMutate({
                                resource: "tahfidz_student_targets",
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
