import React, { useEffect, useMemo, useState } from "react";
import { useList, useSelect } from "@refinedev/core";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Filter,
  Printer,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const estimateTargetUnits = (target: any) => {
  const amount = Number(target?.target_amount || 1);
  if (target?.amount_unit === "juz") return amount * 20;
  if (target?.amount_unit === "surah") return amount * 2;
  if (target?.amount_unit === "jilid") return amount * 40;
  return amount;
};

const getQualityTone = (value: number) => {
  if (value >= 80) return "text-emerald-600";
  if (value >= 60) return "text-amber-600";
  return "text-red-600";
};

export const TahfidzReportDashboard: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [searchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get("class_id") || "");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState(searchParams.get("halaqoh_id") || "");
  const [selectedStudentId, setSelectedStudentId] = useState(searchParams.get("student_id") || "");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq" as const, value: "tahfidz" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "id, name, employee_id, employees(full_name)" },
    pagination: { mode: "off" },
  });
  const halaqohs = halaqohsData?.data || [];

  const { data: membersData } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: selectedHalaqohId ? [{ field: "halaqoh_id", operator: "eq" as const, value: selectedHalaqohId }] : [],
    queryOptions: { enabled: !!selectedHalaqohId },
    meta: { select: "*, students(id, full_name, nis, class_id, classes(name, unit_id, units(name)))" },
    pagination: { mode: "off" },
  });
  const halaqohMembers = membersData?.data || [];
  const memberStudentIdSet = useMemo(() => new Set(halaqohMembers.map((member: any) => member.student_id)), [halaqohMembers]);

  const { data: studentsData } = useList({
    resource: "students",
    filters: [
      { field: "status", operator: "eq" as const, value: "active" },
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
    ],
    meta: { select: "id, full_name, nis, class_id, classes(name, unit_id, units(name))" },
    pagination: { mode: "off" },
  });

  const studentPool = useMemo(() => {
    const source = selectedHalaqohId
      ? halaqohMembers.map((member: any) => member.students).filter(Boolean)
      : studentsData?.data || [];
    return source.filter((student: any) => {
      const matchesUnit = !selectedUnitId || student.classes?.unit_id === selectedUnitId;
      const matchesClass = !selectedClassId || student.class_id === selectedClassId;
      const lowered = search.toLowerCase();
      const matchesSearch = !search ||
        student.full_name?.toLowerCase().includes(lowered) ||
        String(student.nis || "").toLowerCase().includes(lowered);
      return matchesUnit && matchesClass && matchesSearch;
    });
  }, [halaqohMembers, search, selectedClassId, selectedHalaqohId, selectedUnitId, studentsData?.data]);

  const visibleStudentIds = useMemo(() => new Set(studentPool.map((student: any) => student.id)), [studentPool]);

  const { data: targetsData } = useList({
    resource: "tahfidz_student_targets",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "target_type", operator: "eq" as const, value: "tahfidz" },
      ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
    ],
    meta: { select: "*, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" },
  });

  const { data: recordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "record_type", operator: "eq" as const, value: "tahfidz" },
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
      ...(selectedHalaqohId ? [{ field: "halaqoh_id", operator: "eq" as const, value: selectedHalaqohId }] : []),
      ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
    ],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, students(id, full_name, nis, class_id, classes(name, unit_id, units(name))), classes(name), employees(full_name), tahfidz_halaqohs(name)" },
    pagination: { pageSize: 1000 },
  });

  const { data: assessmentsData } = useList({
    resource: "quran_assessments",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "assessment_type", operator: "in" as const, value: ["tahfidz_juz", "tasmi"] },
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
      ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
    ],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, students(id, full_name, nis, class_id, classes(name, unit_id, units(name))), classes(name), employees(full_name)" },
    pagination: { pageSize: 1000 },
  });

  const targets = useMemo(() => {
    return (targetsData?.data || []).filter((target: any) => {
      if (selectedStudentId) return true;
      if (selectedHalaqohId) return memberStudentIdSet.has(target.student_id);
      return visibleStudentIds.size === 0 || visibleStudentIds.has(target.student_id);
    });
  }, [memberStudentIdSet, selectedHalaqohId, selectedStudentId, targetsData?.data, visibleStudentIds]);

  const records = useMemo(() => {
    return (recordsData?.data || []).filter((record: any) => {
      if (selectedStudentId) return true;
      if (selectedHalaqohId) return memberStudentIdSet.has(record.student_id) || record.halaqoh_id === selectedHalaqohId;
      return visibleStudentIds.size === 0 || visibleStudentIds.has(record.student_id);
    });
  }, [memberStudentIdSet, recordsData?.data, selectedHalaqohId, selectedStudentId, visibleStudentIds]);

  const assessments = useMemo(() => {
    return (assessmentsData?.data || []).filter((assessment: any) => {
      if (selectedStudentId) return true;
      if (selectedHalaqohId) return memberStudentIdSet.has(assessment.student_id);
      return visibleStudentIds.size === 0 || visibleStudentIds.has(assessment.student_id);
    });
  }, [assessmentsData?.data, memberStudentIdSet, selectedHalaqohId, selectedStudentId, visibleStudentIds]);

  const selectedStudent = useMemo(() => {
    return studentPool.find((student: any) => student.id === selectedStudentId) ||
      targets.find((target: any) => target.student_id === selectedStudentId)?.students ||
      records.find((record: any) => record.student_id === selectedStudentId)?.students ||
      assessments.find((assessment: any) => assessment.student_id === selectedStudentId)?.students;
  }, [assessments, records, selectedStudentId, studentPool, targets]);

  const studentRows = useMemo(() => {
    const map = new Map<string, any>();
    const ensure = (student: any, studentId?: string) => {
      const id = student?.id || studentId;
      if (!id) return null;
      if (!map.has(id)) {
        map.set(id, {
          id,
          student,
          targetCount: 0,
          completedTargets: 0,
          targetUnits: 0,
          recordCount: 0,
          assessmentCount: 0,
          passedAssessments: 0,
          repeatRecords: 0,
          latestDate: "",
        });
      }
      const row = map.get(id);
      if (!row.student && student) row.student = student;
      return row;
    };

    studentPool.forEach((student: any) => ensure(student));
    targets.forEach((target: any) => {
      const row = ensure(target.students, target.student_id);
      if (!row) return;
      row.targetCount += 1;
      if (target.status === "completed") row.completedTargets += 1;
      row.targetUnits += estimateTargetUnits(target);
    });
    records.forEach((record: any) => {
      const row = ensure(record.students, record.student_id);
      if (!row) return;
      row.recordCount += 1;
      if (record.fluency_score === "Mengulang") row.repeatRecords += 1;
      if (!row.latestDate || new Date(record.date) > new Date(row.latestDate)) row.latestDate = record.date;
    });
    assessments.forEach((assessment: any) => {
      const row = ensure(assessment.students, assessment.student_id);
      if (!row) return;
      row.assessmentCount += 1;
      if (assessment.status === "Lulus") row.passedAssessments += 1;
      if (!row.latestDate || new Date(assessment.date) > new Date(row.latestDate)) row.latestDate = assessment.date;
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      progress: Math.min(100, Math.round((row.recordCount / Math.max(row.targetUnits || row.targetCount || 1, 1)) * 100)),
    }));
  }, [assessments, records, studentPool, targets]);

  const totalStudentRows = studentRows.length;
  const pageCount = Math.max(1, Math.ceil(totalStudentRows / pageSize));
  const paginatedStudentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return studentRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, studentRows]);
  const firstRowNumber = totalStudentRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRowNumber = Math.min(currentPage * pageSize, totalStudentRows);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, search, selectedClassId, selectedHalaqohId, selectedStudentId, selectedUnitId]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const totalStudents = studentRows.length;
  const totalTargets = targets.length;
  const completedTargets = targets.filter((target: any) => target.status === "completed").length;
  const totalRecords = records.length;
  const repeatRecords = records.filter((record: any) => record.fluency_score === "Mengulang").length;
  const passedAssessments = assessments.filter((assessment: any) => assessment.status === "Lulus").length;
  const qualityScore = Math.round(
    (
      (totalTargets ? (completedTargets / totalTargets) * 35 : 0) +
      (totalStudents ? (studentRows.filter((row) => row.recordCount > 0).length / totalStudents) * 35 : 0) +
      (assessments.length ? (passedAssessments / assessments.length) * 30 : 0)
    )
  );
  const studentsWithoutTarget = studentRows.filter((row) => row.targetCount === 0).length;
  const studentsWithoutRecords = studentRows.filter((row) => row.recordCount === 0).length;
  const studentsNeedFollowUp = studentRows.filter((row) => row.repeatRecords > 0 || row.progress < 50 || (row.assessmentCount > 0 && row.passedAssessments === 0)).length;

  const chartData = useMemo(() => {
    const grouped = new Map<string, { label: string; setoran: number; ujian: number }>();
    [...records].reverse().forEach((record: any) => {
      const key = new Date(record.date).toISOString().slice(0, 10);
      const label = new Date(record.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      if (!grouped.has(key)) grouped.set(key, { label, setoran: 0, ujian: 0 });
      grouped.get(key)!.setoran += 1;
    });
    [...assessments].reverse().forEach((assessment: any) => {
      const key = new Date(assessment.date).toISOString().slice(0, 10);
      const label = new Date(assessment.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      if (!grouped.has(key)) grouped.set(key, { label, setoran: 0, ujian: 0 });
      grouped.get(key)!.ujian += 1;
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).slice(-14);
  }, [assessments, records]);

  const halaqohChartData = useMemo(() => {
    const grouped = new Map<string, { name: string; anggota: number; setoran: number; ujian: number }>();
    halaqohs.forEach((halaqoh: any) => grouped.set(halaqoh.id, { name: halaqoh.name, anggota: 0, setoran: 0, ujian: 0 }));
    halaqohMembers.forEach((member: any) => {
      if (!grouped.has(member.halaqoh_id)) grouped.set(member.halaqoh_id, { name: "Halaqoh", anggota: 0, setoran: 0, ujian: 0 });
      grouped.get(member.halaqoh_id)!.anggota += 1;
    });
    records.forEach((record: any) => {
      if (!record.halaqoh_id) return;
      if (!grouped.has(record.halaqoh_id)) grouped.set(record.halaqoh_id, { name: record.tahfidz_halaqohs?.name || "Halaqoh", anggota: 0, setoran: 0, ujian: 0 });
      grouped.get(record.halaqoh_id)!.setoran += 1;
    });
    return Array.from(grouped.values()).filter((item) => item.anggota || item.setoran || item.ujian).slice(0, 8);
  }, [halaqohMembers, halaqohs, records]);

  const selectedStudentTargets = targets.filter((target: any) => target.student_id === selectedStudentId);
  const selectedStudentRecords = records.filter((record: any) => record.student_id === selectedStudentId);
  const selectedStudentAssessments = assessments.filter((assessment: any) => assessment.student_id === selectedStudentId);
  const selectedTarget = selectedStudentTargets[0];
  const selectedProgress = selectedTarget
    ? Math.min(100, Math.round((selectedStudentRecords.length / Math.max(estimateTargetUnits(selectedTarget), 1)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Mutu Tahfidz"
        description="Pantau target, mutaba'ah, munaqosyah, dan tindak lanjut tahfidz per unit, kelas, halaqoh, atau siswa."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <FileText className="h-4 w-4" />
              Laporan tahfidz berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Dari target sampai munaqosyah dalam satu monitoring</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Halaman ini membantu guru dan pimpinan melihat siswa yang berjalan baik, belum punya target, jarang setoran, atau perlu muraja'ah.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: "Siswa", value: totalStudents },
              { icon: Target, label: "Target", value: totalTargets },
              { icon: ClipboardCheck, label: "Setoran", value: totalRecords },
              { icon: BarChart3, label: "Skor Mutu", value: `${qualityScore}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/20 p-4">
                <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                <p className={`text-2xl font-bold ${label === "Skor Mutu" ? getQualityTone(Number(qualityScore)) : ""}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
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
              onChange={(event) => {
                setSelectedUnitId(event.target.value);
                setSelectedClassId("");
                setSelectedStudentId("");
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
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setSelectedStudentId("");
              }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Semua kelas</option>
              {classOptions?.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={selectedHalaqohId}
              onChange={(event) => {
                setSelectedHalaqohId(event.target.value);
                setSelectedStudentId("");
              }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Semua halaqoh</option>
              {halaqohs.map((halaqoh: any) => (
                <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>
              ))}
            </select>
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="h-10 min-w-[220px] rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Semua siswa</option>
              {studentPool.map((student: any) => (
                <option key={student.id} value={student.id}>{student.full_name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari siswa atau NIS..."
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Perlu tindak lanjut
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{studentsWithoutTarget}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa target</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{studentsWithoutRecords}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa setoran</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{studentsNeedFollowUp}</p>
              <p className="text-[11px] text-muted-foreground">Butuh follow-up</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done laporan tahfidz
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Target aktif", "Setoran berjalan", "Mutu bacaan", "Munaqosyah", "Tindak lanjut"].map((item) => (
              <div key={item} className="rounded-lg border bg-muted/20 p-3 text-xs font-semibold text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tren setoran dan ujian
            </h3>
            <span className="text-xs text-muted-foreground">14 tanggal terakhir</span>
          </div>
          {chartData.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="setoran" name="Setoran" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ujian" name="Ujian" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Belum ada data setoran atau ujian pada filter ini.
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-5 w-5 text-primary" />
              Ringkasan halaqoh
            </h3>
          </div>
          {halaqohChartData.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={halaqohChartData} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="setoran" name="Setoran" radius={[0, 6, 6, 0]}>
                    {halaqohChartData.map((_, index) => <Cell key={index} fill="#059669" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Pilih halaqoh atau lengkapi anggota/setoran.
            </div>
          )}
        </div>
      </section>

      {selectedStudentId && (
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Profil laporan siswa</p>
                <h3 className="mt-1 text-xl font-bold">{selectedStudent?.full_name || "Siswa"}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent?.classes?.units?.name || "-"} - {selectedStudent?.classes?.name || "-"}
                </p>
              </div>
              <Link to={`/students/show/${selectedStudentId}`} className="rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                Profil
              </Link>
            </div>

            <div className="mt-5 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Progres target utama</span>
                <span className="font-bold">{selectedProgress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${selectedProgress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedTarget ? `${selectedTarget.target_amount} ${selectedTarget.amount_unit} - ${selectedTarget.description}` : "Belum ada target aktif."}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xl font-bold">{selectedStudentTargets.length}</p>
                <p className="text-[11px] text-muted-foreground">Target</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xl font-bold">{selectedStudentRecords.length}</p>
                <p className="text-[11px] text-muted-foreground">Setoran</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xl font-bold">{selectedStudentAssessments.length}</p>
                <p className="text-[11px] text-muted-foreground">Ujian</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Link to={`/quran/create?student_id=${selectedStudentId}`} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-600" /> Input setoran</span>
                <span className="text-xs text-muted-foreground">{selectedStudentRecords.length}</span>
              </Link>
              <Link to={`/tahfidz-student-targets/create?student_id=${selectedStudentId}`} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600" /> Target personal</span>
                <span className="text-xs text-muted-foreground">{selectedStudentTargets.length}</span>
              </Link>
              <Link to={`/quran-assessments/create?student_id=${selectedStudentId}&class_id=${selectedStudent?.class_id || ""}`} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <span className="flex items-center gap-2"><Award className="h-4 w-4 text-emerald-600" /> Input munaqosyah</span>
                <span className="text-xs text-muted-foreground">{selectedStudentAssessments.length}</span>
              </Link>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="border-b bg-muted/20 px-5 py-4">
                <h3 className="font-semibold">Mutaba'ah terakhir</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Tanggal</th>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Materi</th>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Kelancaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedStudentRecords.slice(0, 8).map((record: any) => (
                      <tr key={record.id}>
                        <td className="px-5 py-3 text-muted-foreground">{new Date(record.date).toLocaleDateString("id-ID")}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold">{record.surah_or_jilid}</p>
                          <p className="text-xs text-muted-foreground">{record.ayat_or_page}</p>
                        </td>
                        <td className="px-5 py-3">{record.fluency_score}</td>
                      </tr>
                    ))}
                    {selectedStudentRecords.length === 0 && (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Belum ada mutaba'ah.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="border-b bg-muted/20 px-5 py-4">
                <h3 className="font-semibold">Riwayat munaqosyah</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Tanggal</th>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Ujian</th>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">Hasil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedStudentAssessments.slice(0, 8).map((assessment: any) => (
                      <tr key={assessment.id}>
                        <td className="px-5 py-3 text-muted-foreground">{new Date(assessment.date).toLocaleDateString("id-ID")}</td>
                        <td className="px-5 py-3 font-semibold">{assessment.title}</td>
                        <td className="px-5 py-3">
                          <p className="font-bold">{assessment.score}</p>
                          <p className="text-xs text-muted-foreground">{assessment.status || "Lulus"}</p>
                        </td>
                      </tr>
                    ))}
                    {selectedStudentAssessments.length === 0 && (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Belum ada munaqosyah.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold">Rekap siswa tahfidz</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Menampilkan {firstRowNumber}-{lastRowNumber} dari {totalStudentRows} siswa
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Baris</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Kelas</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Target</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Setoran</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Ujian</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Progres</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedStudentRows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <button type="button" onClick={() => setSelectedStudentId(row.id)} className="text-left font-bold hover:text-primary">
                      {row.student?.full_name || "Siswa"}
                    </button>
                    {row.student?.nis && <p className="text-xs text-muted-foreground">NIS: {row.student.nis}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <p>{row.student?.classes?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{row.student?.classes?.units?.name || "-"}</p>
                  </td>
                  <td className="px-5 py-3">{row.completedTargets}/{row.targetCount}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{row.recordCount}</p>
                    {row.repeatRecords > 0 && <p className="text-xs text-red-600">{row.repeatRecords} mengulang</p>}
                  </td>
                  <td className="px-5 py-3">{row.passedAssessments}/{row.assessmentCount}</td>
                  <td className="px-5 py-3 min-w-[150px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{row.progress}%</span>
                      <span className="text-muted-foreground">{row.latestDate ? new Date(row.latestDate).toLocaleDateString("id-ID") : "-"}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${row.progress}%` }} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/quran?student_id=${row.id}`} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Mutaba'ah">
                        <BookOpen className="h-4 w-4" />
                      </Link>
                      <Link to={`/quran-assessments?student_id=${row.id}`} className="rounded-lg p-2 text-purple-600 hover:bg-purple-50" title="Munaqosyah">
                        <Award className="h-4 w-4" />
                      </Link>
                      <Link to={`/students/show/${row.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Profil siswa">
                        <FileText className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {studentRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    Belum ada siswa pada filter laporan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalStudentRows > 0 && (
          <div className="flex flex-col gap-3 border-t bg-muted/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Awal
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="rounded-md border bg-background px-3 py-1.5 text-sm font-semibold">
                {currentPage}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={currentPage === pageCount}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(pageCount)}
                disabled={currentPage === pageCount}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Akhir
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
