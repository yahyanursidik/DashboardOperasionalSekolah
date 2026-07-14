import React, { useMemo, useState } from "react";
import { useDelete, useList, useSelect } from "@refinedev/core";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
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

export const TahsinHalaqohsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [search, setSearch] = useState("");

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data, isLoading } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "program_type", operator: "eq" as const, value: "tahsin" },
    ],
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "*, employees(full_name)" },
  });

  const { data: membersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "id, halaqoh_id, student_id, students(id, class_id, classes(name, unit_id, units(name)))" },
    pagination: { mode: "off" },
  });

  const { data: targetsData } = useList({
    resource: "tahsin_student_targets",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "target_type", operator: "eq" as const, value: "tahsin" },
    ],
    meta: { select: "id, student_id, status" },
    pagination: { mode: "off" },
  });

  const { data: recordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "record_type", operator: "eq" as const, value: "tahsin" },
    ],
    meta: { select: "id, halaqoh_id, student_id, fluency_score" },
    pagination: { mode: "off" },
  });

  const { data: assessmentsData } = useList({
    resource: "quran_assessments",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "assessment_type", operator: "eq" as const, value: "tahsin_jilid" },
    ],
    meta: { select: "id, student_id, status" },
    pagination: { mode: "off" },
  });

  const members = membersData?.data || [];
  const targets = targetsData?.data || [];
  const recordsDataList = recordsData?.data || [];
  const assessments = assessmentsData?.data || [];

  const getHalaqohStats = (halaqohId: string) => {
    const halaqohMembers = members.filter((member: any) => member.halaqoh_id === halaqohId);
    const memberIds = new Set(halaqohMembers.map((member: any) => member.student_id));
    const halaqohTargets = targets.filter((target: any) => memberIds.has(target.student_id));
    const halaqohRecords = recordsDataList.filter((record: any) => record.halaqoh_id === halaqohId || memberIds.has(record.student_id));
    const halaqohAssessments = assessments.filter((assessment: any) => memberIds.has(assessment.student_id));
    const completedTargets = halaqohTargets.filter((target: any) => target.status === "completed").length;
    const repeatRecords = halaqohRecords.filter((record: any) => record.fluency_score === "Mengulang").length;
    const passedAssessments = halaqohAssessments.filter((assessment: any) => assessment.status === "Lulus").length;
    return {
      members: halaqohMembers,
      memberCount: halaqohMembers.length,
      targetCount: halaqohTargets.length,
      completedTargets,
      recordCount: halaqohRecords.length,
      repeatRecords,
      assessmentCount: halaqohAssessments.length,
      passedAssessments,
    };
  };

  const baseRecords = data?.data || [];
  const records = useMemo(() => {
    return baseRecords.filter((record: any) => {
      const lowered = search.toLowerCase();
      const stats = getHalaqohStats(record.id);
      const matchesSearch = !search ||
        record.name?.toLowerCase().includes(lowered) ||
        record.employees?.full_name?.toLowerCase().includes(lowered) ||
        record.description?.toLowerCase().includes(lowered);
      const matchesUnit = !selectedUnitId || stats.members.some((member: any) => member.students?.classes?.unit_id === selectedUnitId);
      return matchesSearch && matchesUnit;
    });
  }, [baseRecords, members, recordsDataList, targets, assessments, search, selectedUnitId]);

  const totalMembers = records.reduce((sum: number, record: any) => sum + getHalaqohStats(record.id).memberCount, 0);
  const totalTargets = records.reduce((sum: number, record: any) => sum + getHalaqohStats(record.id).targetCount, 0);
  const totalRecords = records.reduce((sum: number, record: any) => sum + getHalaqohStats(record.id).recordCount, 0);
  const totalAssessments = records.reduce((sum: number, record: any) => sum + getHalaqohStats(record.id).assessmentCount, 0);
  const withoutTeacher = records.filter((record: any) => !record.employee_id).length;
  const withoutMembers = records.filter((record: any) => getHalaqohStats(record.id).memberCount === 0).length;
  const withoutRecords = records.filter((record: any) => getHalaqohStats(record.id).recordCount === 0).length;

  const handleDelete = (record: any) => {
    if (!window.confirm(`Hapus halaqoh tahsin "${record.name}"?`)) return;
    deleteMutate(
      { resource: "tahfidz_halaqohs", id: record.id as string },
      {
        onSuccess: () => toast.success("Halaqoh tahsin berhasil dihapus"),
        onError: () => toast.error("Gagal menghapus halaqoh tahsin"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Halaqoh Tahsin"
        description="Kelola kelompok tahsin, anggota, guru pengampu, target bacaan, jurnal harian, dan ujian kenaikan jilid."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <BookOpen className="h-4 w-4" />
              Tahsin berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Kelompok kecil untuk membina bacaan, makhraj, dan kelancaran</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Halaqoh Tahsin menjadi ruang pembinaan berulang: target personal, jurnal harian, dan munaqosyah jilid harus saling tersambung.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: "Halaqoh", value: records.length },
              { icon: Users, label: "Anggota", value: totalMembers },
              { icon: Target, label: "Target", value: totalTargets },
              { icon: ClipboardCheck, label: "Jurnal", value: totalRecords },
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
              <p className="text-xl font-bold">{withoutTeacher}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa guru</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{withoutMembers}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa anggota</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{withoutRecords}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa jurnal</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done halaqoh tahsin
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Guru pengampu", "Anggota aktif", "Target personal", "Jurnal tahsin", "Ujian jilid"].map((item) => (
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
          <select value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Semua unit</option>
            {unitOptions?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari halaqoh, guru, atau deskripsi..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <Link
          to="/tahsin-halaqohs/create"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Tambah Halaqoh
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Halaqoh</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Guru</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Anggota</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Progres</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Ujian</th>
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
                    Belum ada halaqoh tahsin pada filter ini.
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const stats = getHalaqohStats(record.id);
                  const targetCoverage = stats.memberCount ? Math.round((stats.targetCount / stats.memberCount) * 100) : 0;
                  return (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/tahsin-halaqohs/show/${record.id}`} className="font-bold text-gray-900 hover:text-primary">
                          {record.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{record.description || "Belum ada deskripsi"}</p>
                      </td>
                      <td className="px-6 py-4 font-medium">{record.employees?.full_name || <span className="text-amber-600">Belum ditentukan</span>}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold">{stats.memberCount} siswa</p>
                        <p className="text-xs text-muted-foreground">{stats.targetCount} target personal</p>
                      </td>
                      <td className="px-6 py-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{targetCoverage}%</span>
                          <span className="text-muted-foreground">{stats.recordCount} jurnal</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(targetCoverage, 100)}%` }} />
                        </div>
                        {stats.repeatRecords > 0 && <p className="mt-1 text-xs text-red-600">{stats.repeatRecords} catatan mengulang</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold">{stats.assessmentCount} ujian</p>
                        <p className="text-xs text-muted-foreground">{stats.passedAssessments} lulus</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/tahsin-halaqohs/show/${record.id}`} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Kelola anggota">
                            <Users className="h-4 w-4" />
                          </Link>
                          <Link to={`/tahsin-records?halaqoh_id=${record.id}`} className="rounded-lg p-2 text-cyan-600 hover:bg-cyan-50" title="Jurnal tahsin">
                            <ClipboardCheck className="h-4 w-4" />
                          </Link>
                          <Link to={`/tahsin-assessments?halaqoh_id=${record.id}`} className="rounded-lg p-2 text-purple-600 hover:bg-purple-50" title="Ujian jilid">
                            <Award className="h-4 w-4" />
                          </Link>
                          <Link to={`/tahsin-reports?halaqoh_id=${record.id}`} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Laporan tahsin">
                            <FileText className="h-4 w-4" />
                          </Link>
                          <Link to={`/tahsin-halaqohs/edit/${record.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button onClick={() => handleDelete(record)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Hapus">
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
      </div>
    </div>
  );
};
