import React, { useEffect, useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Edit,
  Plus,
  Search,
  Filter,
  BookOpen,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  Users,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useSelect, useDelete, useList } from "@refinedev/core";
import { toast } from "sonner";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  name: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, name, isDeleting, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Hapus Kelas?</h3>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus data kelas <span className="font-bold text-foreground">"{name}"</span> secara permanen.
          </p>
          <div className="bg-red-50 text-red-800 text-xs p-3 rounded-md text-left border border-red-100 leading-relaxed">
            <strong className="block mb-1">Peringatan Keamanan Database</strong>
            Penghapusan akan ditolak otomatis jika kelas ini masih berelasi dengan data Siswa, Jadwal, atau data nilai. Kosongkan kelas ini sebelum dihapus.
          </div>
        </div>
        <div className="flex bg-muted/30 p-4 gap-3 justify-end border-t">
          <button onClick={onCancel} disabled={isDeleting} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
          <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Hapus Permanen
          </button>
        </div>
      </div>
    </div>
  );
};

// ── TABLE PAGINATION ──
const TablePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  const actualTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
      <p className="text-sm text-muted-foreground">
        Menampilkan <span className="font-medium text-foreground">{start}-{end}</span> dari <span className="font-medium text-foreground">{totalItems}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium px-2">{currentPage} / {actualTotalPages}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= actualTotalPages}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const getClassGradeLevel = (klass: any) => {
  const directGrade = Number(klass.grade_level || klass.level);
  if (Number.isFinite(directGrade) && directGrade > 0) return directGrade;
  const fromName = String(klass.name || "").match(/\d+/)?.[0];
  return fromName ? Number(fromName) : 0;
};

const getHomeroomAssignment = (klass: any) => {
  return klass.teacher_assignments?.find((assignment: any) => assignment.role_type === "homeroom" || assignment.role_type === "wali_kelas");
};

const getClassReadiness = (
  klass: any,
  students: any[] = [],
  schedules: any[] = [],
  curriculums: any[] = []
) => {
  const studentCount = students.filter((student: any) => student.class_id === klass.id).length;
  const capacity = Number(klass.capacity || 30);
  const grade = getClassGradeLevel(klass);
  const hasHomeroom = Boolean(getHomeroomAssignment(klass)?.employees?.full_name);
  const hasSchedule = schedules.some((schedule: any) => schedule.class_id === klass.id);
  const hasCurriculum = curriculums.some((record: any) => Number(record.grade_level) === grade);
  const missing: string[] = [];

  if (!hasHomeroom) missing.push("wali kelas");
  if (studentCount === 0) missing.push("siswa");
  if (!hasSchedule) missing.push("jadwal");
  if (!hasCurriculum) missing.push("kurikulum");
  if (studentCount > capacity) missing.push("kapasitas");

  return {
    grade,
    studentCount,
    capacity,
    hasHomeroom,
    hasSchedule,
    hasCurriculum,
    isOverCapacity: studentCount > capacity,
    isReady: missing.length === 0,
    missing,
    score: [hasHomeroom, studentCount > 0, hasSchedule, hasCurriculum, studentCount <= capacity].filter(Boolean).length,
  };
};

export const ClassesList: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterYear, setFilterYear] = useState(activeYearId || "");
  const [filterSemester, setFilterSemester] = useState(activeSemesterId || "");

  useEffect(() => {
    if (activeYearId) setFilterYear((current) => current || activeYearId);
  }, [activeYearId]);

  useEffect(() => {
    if (activeSemesterId) setFilterSemester((current) => current || activeSemesterId);
  }, [activeSemesterId]);

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: yearOptions } = useSelect({ resource: "academic_years", optionLabel: "name", optionValue: "id" });
  const { options: semesterOptions } = useSelect({
    resource: "semesters",
    optionLabel: "name",
    optionValue: "id",
    filters: filterYear ? [{ field: "academic_year_id", operator: "eq", value: filterYear }] : [],
  });
  const { data: studentsData } = useList({
    resource: "students",
    filters: filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : [],
    pagination: { pageSize: 3000 },
  });
  const { data: schedulesData } = useList({
    resource: "employee_schedules",
    filters: [
      ...(filterYear ? [{ field: "academic_year_id", operator: "eq", value: filterYear }] : []),
      ...(filterSemester ? [{ field: "semester_id", operator: "eq", value: filterSemester }] : []),
      ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : []),
      { field: "schedule_type", operator: "eq", value: "mengajar" },
    ] as any,
    pagination: { pageSize: 3000 },
  });
  const { data: curriculumsData } = useList({
    resource: "subject_curriculums",
    filters: filterYear ? [{ field: "academic_year_id", operator: "eq", value: filterYear }] : [],
    pagination: { pageSize: 3000 },
  });

  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
    deleteMutate(
      { resource: "classes", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success(`Kelas ${deleteModal.name} berhasil dihapus!`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        },
        onError: (error) => {
          console.error(error);
          toast.error(`Gagal menghapus Kelas ${deleteModal.name}. Data ini mungkin masih digunakan oleh Siswa, Jadwal, atau data lainnya.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        }
      }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Nama Kelas",
        cell: function render({ row, getValue }) {
          const code = row.original.code;
          return (
            <div>
              <p className="font-semibold text-foreground">{getValue<string>()}</p>
              {code && <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">KODE: {code}</p>}
            </div>
          );
        },
      },
      {
        id: "level",
        accessorKey: "level",
        header: "Tingkat",
        cell: function render({ getValue }) {
          return getValue() ? <span className="bg-muted px-2 py-0.5 rounded-md font-medium text-xs">{getValue<string>()}</span> : "-";
        },
      },
      {
        id: "unit",
        accessorKey: "units.name",
        header: "Unit Pendidikan",
        cell: function render({ getValue }) {
          return getValue() || "-";
        },
      },
      {
        id: "homeroom",
        header: "Wali Kelas",
        cell: function render({ row }) {
          const assignments = row.original.teacher_assignments;
          const homeroom = assignments?.find((a: any) => a.role_type === 'homeroom' || a.role_type === 'wali_kelas');
          const name = homeroom?.employees?.full_name;
          if (name) return <span className="font-semibold text-foreground">{name}</span>;
          return <span className="text-muted-foreground italic text-xs">Belum Ditentukan</span>;
        },
      },
      {
        id: "students",
        header: "Siswa",
        cell: function render({ row }) {
          const metrics = getClassReadiness(row.original, studentsData?.data, schedulesData?.data, curriculumsData?.data);
          return (
            <span className={`text-xs font-semibold ${metrics.isOverCapacity ? "text-rose-600" : metrics.studentCount >= metrics.capacity ? "text-amber-600" : "text-foreground"}`}>
              {metrics.studentCount}/{metrics.capacity}
            </span>
          );
        },
      },
      {
        id: "workflow",
        header: "Kesiapan",
        cell: function render({ row }) {
          const metrics = getClassReadiness(row.original, studentsData?.data, schedulesData?.data, curriculumsData?.data);
          return (
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${metrics.hasCurriculum ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  Kurikulum
                </span>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${metrics.hasSchedule ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  Jadwal
                </span>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${metrics.hasHomeroom ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  Wali
                </span>
              </div>
              <p className={`text-[10px] font-medium ${metrics.isReady ? "text-emerald-700" : "text-amber-700"}`}>
                {metrics.isReady ? "Siap operasional" : `Lengkapi: ${metrics.missing.slice(0, 2).join(", ")}`}
              </p>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "is_active",
        header: "Status",
        cell: function render({ getValue }) {
          const isActive = getValue<boolean>();
          return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ row }) {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/classes/show/${row.original.id}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Masuk Kelas"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/classes/edit/${row.original.id}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Pengaturan Kelas"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/curriculum/subjects?grade_level=${row.original.grade_level || row.original.level || 1}`)}
                className="p-1.5 text-muted-foreground hover:text-emerald-600 transition-colors rounded-md hover:bg-emerald-50"
                title="Kurikulum kelas"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(row.original.id, row.original.name)}
                className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                title="Hapus Kelas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate, studentsData?.data, schedulesData?.data, curriculumsData?.data]
  );

  const buildFilters = () => {
    const filters: any[] = [];
    if (searchQuery) {
      filters.push({
        operator: "or",
        value: [
          { field: "name", operator: "ilike", value: `%${searchQuery}%` },
          { field: "code", operator: "ilike", value: `%${searchQuery}%` }
        ]
      });
    }
    if (filterUnit) {
      filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    }
    if (filterYear) {
      filters.push({ field: "academic_year_id", operator: "eq", value: filterYear });
    }
    return filters;
  };

  const { refineCore: { tableQueryResult }, ...table } = useTable({
    columns,
    refineCoreProps: {
      resource: "classes",
      pagination: { pageSize: 15 },
      filters: {
        permanent: buildFilters(),
      },
      meta: {
        select: "*, units(name), teacher_assignments(role_type, employees(full_name))"
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;
  const isError = tableQueryResult.isError;
  const error = tableQueryResult.error;
  const rows = table.getRowModel().rows;
  const visibleClasses = rows.map((row: any) => row.original);
  const classReadiness = visibleClasses.map((klass: any) => getClassReadiness(klass, studentsData?.data, schedulesData?.data, curriculumsData?.data));
  const totalStudents = visibleClasses.reduce((sum: number, klass: any) => {
    return sum + (studentsData?.data?.filter((student: any) => student.class_id === klass.id).length || 0);
  }, 0);
  const classesWithHomeroom = classReadiness.filter((metrics) => metrics.hasHomeroom).length;
  const classesWithSchedule = classReadiness.filter((metrics) => metrics.hasSchedule).length;
  const classesWithCurriculum = classReadiness.filter((metrics) => metrics.hasCurriculum).length;
  const readyClasses = classReadiness.filter((metrics) => metrics.isReady).length;
  const attentionClasses = classReadiness.filter((metrics) => !metrics.isReady).length;
  const overCapacityClasses = classReadiness.filter((metrics) => metrics.isOverCapacity).length;
  const readinessPercent = visibleClasses.length ? Math.round((readyClasses / visibleClasses.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {isError && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          <p className="font-bold">Error fetching data:</p>
          <pre className="text-xs">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      <PageHeader
        title="Kelas & Rombongan Belajar"
        description="Pusat navigasi kelas untuk siswa, wali kelas, jadwal, kurikulum per kelas, absensi, dan nilai."
        action={
          <Link
            to="/classes/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas
          </Link>
        }
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <GraduationCap className="h-4 w-4" />
              Hub operasional kelas
            </div>
            <h2 className="mt-3 text-2xl font-bold">Mulai dari kelas, lanjut ke aktivitas akademik</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Setelah kurikulum menjadi per kelas dan per mapel, halaman kelas dipakai untuk mengecek rombel, wali kelas, jadwal mengajar, dan akses cepat ke kurikulum kelas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: "Siswa", value: totalStudents },
              { icon: ClipboardCheck, label: "Wali Kelas", value: `${classesWithHomeroom}/${visibleClasses.length}` },
              { icon: CalendarDays, label: "Jadwal", value: `${classesWithSchedule}/${visibleClasses.length}` },
              { icon: BookOpen, label: "Kurikulum", value: `${classesWithCurriculum}/${visibleClasses.length}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/20 p-4">
                <Icon className="mb-2 h-5 w-5 text-primary" />
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
            <Gauge className="h-4 w-4 text-primary" />
            Mutu kesiapan rombel
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">{readinessPercent}%</p>
              <p className="text-xs text-muted-foreground">kelas siap operasional</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${attentionClasses ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {attentionClasses} perlu tindak lanjut
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${readinessPercent}%` }} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Perlu perhatian
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{attentionClasses}</p>
              <p className="text-[11px] text-muted-foreground">Belum siap</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{overCapacityClasses}</p>
              <p className="text-[11px] text-muted-foreground">Over kapasitas</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{visibleClasses.length - classesWithHomeroom}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa wali</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done kelas
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {[
              `${classesWithHomeroom}/${visibleClasses.length} wali kelas terisi`,
              `${classesWithSchedule}/${visibleClasses.length} kelas punya jadwal`,
              `${classesWithCurriculum}/${visibleClasses.length} tingkat punya kurikulum`,
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama atau kode kelas..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors">
            Cari
          </button>
        </form>

        <div className="flex flex-wrap gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
          </div>
          <select 
            value={filterYear} 
            onChange={(e) => {
              const nextYear = e.target.value;
              setFilterYear(nextYear);
              setFilterSemester(nextYear === activeYearId ? activeSemesterId || "" : "");
            }}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Tahun Ajaran</option>
            {yearOptions?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Semester</option>
            {semesterOptions?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select 
            value={filterUnit} 
            onChange={(e) => setFilterUnit(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Unit</option>
            {unitOptions?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
           <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground">Memuat data...</div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Tidak Ada Data Kelas</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Gunakan tombol Buat Kelas Baru untuk memulai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 flex flex-col">
            <div className="flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                  {table.getHeaderGroups().map((headerGroup: any) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header: any) => (
                        <th key={header.id} className="px-6 py-4 whitespace-nowrap">
                          {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border">
                  {table.getRowModel().rows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell: any) => (
                        <td key={cell.id} className="px-6 py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <TablePagination
              currentPage={table.getState().pagination.pageIndex + 1}
              totalPages={table.getPageCount()}
              totalItems={tableQueryResult?.data?.total || 0}
              itemsPerPage={table.getState().pagination.pageSize}
              onPageChange={(p) => table.setPageIndex(p - 1)}
            />
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        name={deleteModal.name}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
      />
    </div>
  );
};
