import React, { useMemo, useState } from "react";
import { useCreate, useDelete, useList, useShow } from "@refinedev/core";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  FileText,
  Filter,
  Search,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

export const TahsinHalaqohShow: React.FC = () => {
  const { id } = useParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const { queryResult } = useShow({
    resource: "tahfidz_halaqohs",
    id,
    meta: { select: "*, employees(full_name), subjects(id, name, unit_id, quran_program_type, units(id, name))" },
  });
  const halaqoh = queryResult?.data?.data;
  const subjectUnitId = halaqoh?.subjects?.unit_id || "";

  const { data: membersData, isLoading: isLoadingMembers, refetch: refetchMembers } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: id }],
    meta: { select: "*, students(id, full_name, nis, nisn, class_id, classes(name, unit_id, units(id, name)))" },
    pagination: { mode: "off" },
  });
  const members = membersData?.data || [];
  const memberStudentIds = members.map((member: any) => member.student_id);
  const memberIdSet = new Set(memberStudentIds);

  const { data: allStudents } = useList({
    resource: "students",
    filters: [{ field: "status", operator: "eq" as const, value: "active" }],
    meta: { select: "id, full_name, nis, class_id, classes(name, unit_id, units(id, name))" },
    pagination: { mode: "off" },
  });

  const { data: targetsData } = useList({
    resource: "tahsin_student_targets",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "target_type", operator: "eq" as const, value: "tahsin" },
    ],
    meta: { select: "id, student_id, halaqoh_id, subject_id, status, subjects(name)" },
    pagination: { mode: "off" },
  });

  const { data: recordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "record_type", operator: "eq" as const, value: "tahsin" },
    ],
    meta: { select: "id, halaqoh_id, student_id, fluency_score, date" },
    pagination: { mode: "off" },
  });

  const { data: assessmentsData } = useList({
    resource: "quran_assessments",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "assessment_type", operator: "eq" as const, value: "tahsin_jilid" },
    ],
    meta: { select: "id, student_id, halaqoh_id, subject_id, status, subjects(name)" },
    pagination: { mode: "off" },
  });

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const lowered = memberSearch.toLowerCase();
    return members.filter((member: any) =>
      member.students?.full_name?.toLowerCase().includes(lowered) ||
      String(member.students?.nis || "").toLowerCase().includes(lowered)
    );
  }, [members, memberSearch]);

  const availableUnits = useMemo(() => {
    const unitsMap = new Map();
    allStudents?.data?.filter((student: any) => !subjectUnitId || student.classes?.unit_id === subjectUnitId).forEach((student: any) => {
      const unit = student.classes?.units;
      if (unit && !unitsMap.has(unit.id)) unitsMap.set(unit.id, { id: unit.id, name: unit.name });
    });
    return Array.from(unitsMap.values());
  }, [allStudents?.data, subjectUnitId]);

  const availableClasses = useMemo(() => {
    const classesMap = new Map();
    allStudents?.data?.forEach((student: any) => {
      const klass = student.classes;
      if (klass && (!filterUnit || klass.unit_id === filterUnit) && !classesMap.has(student.class_id)) {
        classesMap.set(student.class_id, { id: student.class_id, name: klass.name });
      }
    });
    return Array.from(classesMap.values());
  }, [allStudents?.data, filterUnit]);

  const availableStudents = useMemo(() => {
    let list = allStudents?.data?.filter((student: any) => !memberStudentIds.includes(student.id)) || [];
    if (subjectUnitId) list = list.filter((student: any) => student.classes?.unit_id === subjectUnitId);
    if (filterUnit) list = list.filter((student: any) => student.classes?.unit_id === filterUnit);
    if (filterClass) list = list.filter((student: any) => student.class_id === filterClass);
    if (studentSearch) list = list.filter((student: any) => student.full_name?.toLowerCase().includes(studentSearch.toLowerCase()));
    return list;
  }, [allStudents?.data, filterClass, filterUnit, memberStudentIds, studentSearch, subjectUnitId]);

  const { mutate: createMutate, isLoading: isCreating } = useCreate();
  const { mutate: deleteMutate } = useDelete();

  const halaqohTargets = (targetsData?.data || []).filter((target: any) => target.halaqoh_id === id || (!target.halaqoh_id && memberIdSet.has(target.student_id)));
  const halaqohRecords = (recordsData?.data || []).filter((record: any) => record.halaqoh_id === id || memberIdSet.has(record.student_id));
  const halaqohAssessments = (assessmentsData?.data || []).filter((assessment: any) => assessment.halaqoh_id === id || (!assessment.halaqoh_id && memberIdSet.has(assessment.student_id)));
  const completedTargets = halaqohTargets.filter((target: any) => target.status === "completed").length;
  const repeatRecords = halaqohRecords.filter((record: any) => record.fluency_score === "Mengulang").length;
  const passedAssessments = halaqohAssessments.filter((assessment: any) => assessment.status === "Lulus").length;

  const readinessItems = [
    { label: "Mata pelajaran", done: Boolean(halaqoh?.subject_id), detail: halaqoh?.subjects?.name || "Belum terhubung" },
    { label: "Guru tahsin", done: Boolean(halaqoh?.employee_id), detail: halaqoh?.employees?.full_name || "Belum ditentukan" },
    { label: "Jadwal halaqoh", done: Boolean(halaqoh?.schedule_day || halaqoh?.schedule_time), detail: halaqoh?.schedule_day || halaqoh?.schedule_time ? `${halaqoh?.schedule_day || "-"}, ${halaqoh?.schedule_time || "-"}` : "Belum diatur" },
    { label: "Anggota aktif", done: members.length > 0, detail: `${members.length} siswa` },
    { label: "Target personal", done: members.length > 0 && halaqohTargets.length >= members.length, detail: `${halaqohTargets.length}/${members.length} target` },
    { label: "Jurnal berjalan", done: halaqohRecords.length > 0, detail: `${halaqohRecords.length} catatan` },
  ];
  const readinessPercent = Math.round((readinessItems.filter((item) => item.done).length / readinessItems.length) * 100);
  const missingItems = readinessItems.filter((item) => !item.done);

  const handleAddMember = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent) return;
    createMutate(
      {
        resource: "tahfidz_halaqoh_members",
        values: { halaqoh_id: id, student_id: selectedStudent },
      },
      {
        onSuccess: () => {
          toast.success("Siswa berhasil ditambahkan ke halaqoh tahsin");
          setSelectedStudent("");
          setIsAdding(false);
          refetchMembers();
        },
        onError: (error: any) => toast.error("Gagal menambahkan siswa", { description: error?.message || "Periksa unit dan keanggotaan halaqoh siswa." }),
      }
    );
  };

  const handleRemoveMember = (member: any) => {
    if (!window.confirm(`Keluarkan "${member.students?.full_name || "siswa"}" dari halaqoh tahsin ini?`)) return;
    deleteMutate(
      { resource: "tahfidz_halaqoh_members", id: member.id as string },
      {
        onSuccess: () => {
          toast.success("Siswa berhasil dikeluarkan dari halaqoh tahsin");
          refetchMembers();
        },
        onError: () => toast.error("Gagal mengeluarkan siswa"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tahsin-halaqohs" className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title={`Halaqoh Tahsin: ${halaqoh?.name || "Memuat..."}`}
          description={`${halaqoh?.subjects?.name || "Mapel belum terhubung"} | Guru Tahsin: ${halaqoh?.employees?.full_name || "Belum ditentukan"}`}
        />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Users, label: "Anggota", value: members.length, detail: "siswa aktif" },
          { icon: Target, label: "Target", value: `${halaqohTargets.length}/${members.length}`, detail: `${completedTargets} selesai` },
          { icon: ClipboardCheck, label: "Jurnal", value: halaqohRecords.length, detail: `${repeatRecords} mengulang` },
          { icon: Award, label: "Ujian", value: halaqohAssessments.length, detail: `${passedAssessments} lulus` },
        ].map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <Icon className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Skor kesiapan halaqoh</p>
              <p className="mt-2 text-3xl font-bold">{readinessPercent}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${readinessPercent}%` }} />
          </div>
          {missingItems.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Lengkapi sebelum monitoring penuh
              </div>
              <p className="mt-1 text-xs">Belum selesai: {missingItems.map((item) => item.label.toLowerCase()).join(", ")}.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Definition of done halaqoh tahsin</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {readinessItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="flex items-center gap-2 border-b pb-3 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Informasi Halaqoh
            </h3>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nama Halaqoh</p>
                <p className="font-medium text-base">{halaqoh?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Guru Pengampu</p>
                <p className="font-medium">{halaqoh?.employees?.full_name || "Belum ditentukan"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jadwal</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>{halaqoh?.schedule_day || "-"}, {halaqoh?.schedule_time || "-"}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Deskripsi</p>
                <p className="font-medium">{halaqoh?.description || "Tidak ada deskripsi"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Akses Cepat Tahsin
            </h3>
            <div className="grid gap-2">
              <Link to={`/tahsin-student-targets/create?halaqoh_id=${id}`} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600" /> Tambah Target</span>
                <span className="text-xs text-muted-foreground">{halaqohTargets.length}</span>
              </Link>
              <Link to={`/tahsin-records/create?halaqoh_id=${id}`} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-600" /> Input Jurnal</span>
                <span className="text-xs text-muted-foreground">{halaqohRecords.length}</span>
              </Link>
              <Link to={`/tahsin-assessments/create?halaqoh_id=${id}`} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <span className="flex items-center gap-2"><Award className="h-4 w-4 text-emerald-600" /> Ujian Jilid</span>
                <span className="text-xs text-muted-foreground">{halaqohAssessments.length}</span>
              </Link>
              <Link to={`/tahsin-reports?halaqoh_id=${id}`} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
                <FileText className="h-4 w-4 text-emerald-600" /> Laporan Tahsin
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="flex min-h-[540px] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col items-start justify-between gap-4 border-b bg-muted/20 p-4 sm:flex-row sm:items-center">
              <h3 className="text-lg font-semibold">Daftar Anggota Siswa</h3>
              <div className="flex w-full items-center gap-3 sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <input
                    type="text"
                    placeholder="Cari anggota..."
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    className="w-full rounded-lg border py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                    isAdding ? "border bg-background text-foreground hover:bg-muted" : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {isAdding ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {isAdding ? "Batal" : "Tambah Anggota"}
                </button>
              </div>
            </div>

            {isAdding && (
              <div className="space-y-4 border-b border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <Filter className="h-4 w-4" />
                  Filter Pencarian Siswa
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select value={filterUnit} onChange={(event) => { setFilterUnit(event.target.value); setFilterClass(""); setSelectedStudent(""); }} className="h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="">Semua Unit</option>
                    {availableUnits.map((unit: any) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  </select>
                  <select value={filterClass} onChange={(event) => { setFilterClass(event.target.value); setSelectedStudent(""); }} disabled={!filterUnit} className="h-9 rounded-md border bg-background px-3 text-sm disabled:opacity-50">
                    <option value="">Semua Kelas</option>
                    {availableClasses.map((klass: any) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
                  </select>
                  <div className="relative">
                    <input value={studentSearch} onChange={(event) => { setStudentSearch(event.target.value); setSelectedStudent(""); }} placeholder="Cari nama siswa..." className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm" />
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <form onSubmit={handleAddMember} className="flex flex-col gap-3 sm:flex-row">
                  <select required value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="h-10 flex-1 rounded-md border border-emerald-200 bg-white px-3 text-sm">
                    <option value="">-- Pilih siswa -- ({availableStudents.length} tersedia)</option>
                    {availableStudents.map((student: any) => (
                      <option key={student.id} value={student.id}>{student.full_name} ({student.classes?.name || "Tanpa Kelas"})</option>
                    ))}
                  </select>
                  <button type="submit" disabled={isCreating || !selectedStudent} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                    Simpan
                  </button>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Nama Siswa</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">NIS</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoadingMembers ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Memuat data anggota...</td></tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                        <p className="font-medium text-muted-foreground">Belum ada anggota yang cocok dengan pencarian.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member: any) => (
                      <tr key={member.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <Link to={`/students/show/${member.student_id}`} className="font-bold text-gray-900 hover:text-primary">
                            {member.students?.full_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <p>{member.students?.classes?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{member.students?.classes?.units?.name || "-"}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{member.students?.nis || "-"}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleRemoveMember(member)} className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50" title="Keluarkan dari halaqoh">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
