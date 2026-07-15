import React, { useState } from "react";
import { useShow, useList, useUpdate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { AlertTriangle, ArrowLeft, BarChart3, BookOpen, CalendarCheck, CheckCircle2, ClipboardCheck, Edit, GraduationCap, Plus, ShieldCheck, UserCheck, UserMinus, Users, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const ClassShow: React.FC = () => {
  const { activeSemesterId } = useAcademicYear();
  const { queryResult } = useShow({
    meta: { select: "*, units(name), academic_years(name)" }
  });
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();
  const record = data?.data;

  // Fetch Students in this class
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useList({
    resource: "students",
    filters: [
      { field: "class_id", operator: "eq", value: record?.id }
    ],
    queryOptions: { enabled: !!record?.id }
  });

  // Fetch Teacher Assignments for this class
  const { data: assignmentsData, isLoading: assignmentsLoading } = useList({
    resource: "teacher_assignments",
    filters: [
      { field: "class_id", operator: "eq", value: record?.id }
    ],
    meta: { select: "*, employees(full_name)" },
    queryOptions: { enabled: !!record?.id }
  });

  const { data: schedulesData } = useList({
    resource: "employee_schedules",
    filters: [
      { field: "class_id", operator: "eq", value: record?.id },
      { field: "schedule_type", operator: "eq", value: "mengajar" },
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq", value: activeSemesterId }] : []),
    ] as any,
    queryOptions: { enabled: !!record?.id },
  });

  const classGrade = Number(record?.grade_level || record?.level || 0);
  const { data: curriculumsData } = useList({
    resource: "subject_curriculums",
    filters: [
      { field: "grade_level", operator: "eq", value: classGrade },
      ...(record?.academic_year_id ? [{ field: "academic_year_id", operator: "eq", value: record.academic_year_id }] : []),
    ] as any,
    queryOptions: { enabled: !!record?.id && !!classGrade },
  });

  const { mutate: updateStudent } = useUpdate();

  // Modal State for Adding Students
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Fetch available students (those without a class or just all students in the unit)
  // For simplicity, we fetch students in the same unit who don't have this class_id
  const { data: availableStudentsData } = useList({
    resource: "students",
    filters: [
      { field: "unit_id", operator: "eq", value: record?.unit_id },
      { field: "status", operator: "eq", value: "active" }
    ],
    queryOptions: { enabled: isModalOpen && !!record?.unit_id }
  });

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    updateStudent({
      resource: "students",
      id: selectedStudentId,
      values: { class_id: record?.id },
      successNotification: () => ({ message: "Siswa berhasil ditambahkan ke kelas", type: "success" })
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setSelectedStudentId("");
        refetchStudents();
      }
    });
  };

  const handleRemoveStudent = (studentId: string, studentName: string) => {
    if (confirm(`Keluarkan ${studentName} dari kelas ini?`)) {
      updateStudent({
        resource: "students",
        id: studentId,
        values: { class_id: null },
        successNotification: () => ({ message: "Siswa dikeluarkan dari kelas", type: "success" })
      }, {
        onSuccess: () => refetchStudents()
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded-xl"></div>
        <div className="h-64 bg-muted animate-pulse rounded-xl"></div>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-center text-muted-foreground">Kelas tidak ditemukan.</div>;
  }

  const currentCapacity = studentsData?.data?.length || 0;
  const maxCapacity = record.capacity || 30;
  const capacityPercent = Math.min(100, Math.round((currentCapacity / maxCapacity) * 100));
  
  const homeroomAssignment = assignmentsData?.data?.find((a: any) => a.role_type === 'homeroom' || a.role_type === 'wali_kelas');
  const homeroomName = homeroomAssignment?.employees?.full_name;
  const scheduleCount = schedulesData?.data?.length || 0;
  const curriculumCount = curriculumsData?.data?.length || 0;
  const todayIso = new Date().toISOString().split("T")[0];
  const students = studentsData?.data || [];
  const maleCount = students.filter((student: any) => String(student.gender || "").toLowerCase().startsWith("l")).length;
  const femaleCount = students.filter((student: any) => String(student.gender || "").toLowerCase().startsWith("p")).length;
  const readinessItems = [
    { label: "Wali kelas", done: Boolean(homeroomName), detail: homeroomName || "Belum ditentukan" },
    { label: "Siswa aktif", done: currentCapacity > 0, detail: `${currentCapacity}/${maxCapacity} siswa` },
    { label: "Jadwal mengajar", done: scheduleCount > 0, detail: `${scheduleCount} jadwal` },
    { label: "Kurikulum tingkat", done: curriculumCount > 0, detail: `${curriculumCount} mapel/kurikulum` },
    { label: "Kapasitas aman", done: currentCapacity <= maxCapacity, detail: currentCapacity > maxCapacity ? "Melebihi kapasitas" : "Dalam batas" },
  ];
  const doneItems = readinessItems.filter((item) => item.done).length;
  const readinessPercent = Math.round((doneItems / readinessItems.length) * 100);
  const missingItems = readinessItems.filter((item) => !item.done);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dashboard ${record.name}`}
        description="Profil rombel, siswa, wali kelas, jadwal, kurikulum, absensi, dan nilai dalam satu halaman."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/classes")}
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <Link
              to={`/classes/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Pengaturan Kelas
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Users, label: "Siswa", value: `${currentCapacity}/${maxCapacity}`, detail: `${maleCount} L / ${femaleCount} P`, tone: currentCapacity > maxCapacity ? "text-rose-600" : "text-primary" },
          { icon: UserCheck, label: "Wali Kelas", value: homeroomName ? "Terisi" : "Kosong", detail: homeroomName || "Perlu ditugaskan", tone: homeroomName ? "text-emerald-600" : "text-amber-600" },
          { icon: CalendarCheck, label: "Jadwal", value: `${scheduleCount}`, detail: "jadwal mengajar", tone: scheduleCount ? "text-emerald-600" : "text-amber-600" },
          { icon: BookOpen, label: "Kurikulum", value: `${curriculumCount}`, detail: `tingkat ${classGrade || "-"}`, tone: curriculumCount ? "text-emerald-600" : "text-amber-600" },
        ].map(({ icon: Icon, label, value, detail, tone }) => (
          <div key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Skor kesiapan kelas</p>
              <p className="mt-2 text-3xl font-bold">{readinessPercent}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${readinessPercent}%` }} />
          </div>
          {missingItems.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Lengkapi sebelum operasional penuh
              </div>
              <p className="mt-1 text-xs">Belum selesai: {missingItems.map((item) => item.label.toLowerCase()).join(", ")}.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Definition of done rombel</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile & Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-xl bg-blue-50 flex items-center justify-center border-4 border-white shadow-sm mb-4">
              <BookOpen className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold">{record.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {record.code && <span className="font-bold uppercase">KODE: {record.code} • </span>}
              Tingkat {record.level} • {record.units?.name}
            </p>
            
            <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border mb-6 ${record.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              Status: {record.is_active ? 'Kelas Aktif' : 'Nonaktif'}
            </div>

            <div className="text-left border-t pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Wali Kelas (Homeroom Teacher)</p>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{homeroomName || <span className="italic text-muted-foreground text-sm">Belum ditentukan</span>}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tahun Ajaran</p>
                <span className="font-medium text-sm">{record.academic_years?.name}</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-muted-foreground">Kapasitas Kelas</span>
                  <span className="font-bold">{currentCapacity} / {maxCapacity}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full ${capacityPercent >= 100 ? 'bg-destructive' : capacityPercent >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${capacityPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 text-muted-foreground">
              <GraduationCap className="w-4 h-4" /> Akses Cepat Kelas
            </h3>
            <div className="grid gap-2">
              <Link
                to={`/curriculum/subjects?grade_level=${classGrade || 1}`}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Kurikulum Kelas</span>
                <span className="text-xs text-muted-foreground">{curriculumCount} dokumen</span>
              </Link>
              <Link
                to="/schedules"
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                <span className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> Jadwal Mengajar</span>
                <span className="text-xs text-muted-foreground">{scheduleCount} jadwal</span>
              </Link>
              <Link
                to={`/attendance/class/${record.id}?date=${todayIso}`}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                <ClipboardCheck className="h-4 w-4 text-primary" /> Input Absensi
              </Link>
              <Link
                to={`/academic/gradebook?class_id=${record.id}`}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                <ShieldCheck className="h-4 w-4 text-primary" /> Gradebook
              </Link>
              <Link
                to={`/student-journals/create?class_id=${record.id}`}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                <GraduationCap className="h-4 w-4 text-primary" /> Catatan Siswa
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Roster & Assignments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB: Siswa */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Rombongan Belajar (Daftar Siswa)
              </h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={currentCapacity >= maxCapacity}
                className="text-sm flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Tambah Siswa
              </button>
            </div>
            
            {studentsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat daftar siswa...</p>
            ) : studentsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada siswa di kelas ini.</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs font-medium border-b">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center">No</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">NIS</th>
                      <th className="px-4 py-3 text-center">L/P</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {studentsData?.data?.map((student: any, index: number) => (
                      <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/students/show/${student.id}`} className="hover:text-primary hover:underline">{student.full_name}</Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{student.nis || "-"}</td>
                        <td className="px-4 py-3 text-center">{student.gender}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleRemoveStudent(student.id, student.full_name)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Keluarkan dari kelas"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TAB: Guru Mapel */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Penugasan Guru di Kelas Ini
            </h3>
            
            {assignmentsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat penugasan guru...</p>
            ) : assignmentsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada penugasan guru mata pelajaran untuk kelas ini.</p>
                <p className="text-xs text-muted-foreground mt-1">Atur jadwal mengajar dari menu Jadwal Pegawai.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignmentsData?.data?.map((assignment: any) => (
                  <div key={assignment.id} className="border rounded-xl p-4 bg-background">
                    <p className="font-semibold text-sm">{assignment.employees?.full_name}</p>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-xs text-muted-foreground uppercase font-bold">{assignment.role_type?.replace('_', ' ')}</span>
                      {assignment.subject && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md self-start font-medium">
                          {assignment.subject}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Tambah Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold text-lg">Masukan Siswa ke Kelas</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddStudent} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pilih siswa dari {record.units?.name} untuk dimasukkan ke kelas ini.
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Siswa</label>
                  <select 
                    required 
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {availableStudentsData?.data
                      ?.filter((s: any) => s.class_id !== record.id) // Exclude those already here
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} {s.class_id ? `(Pindah dari kelas lain)` : `(Belum ada kelas)`}
                        </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Batal</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Tambahkan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
