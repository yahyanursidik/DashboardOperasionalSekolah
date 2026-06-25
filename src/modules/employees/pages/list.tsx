import React, { useState, useMemo } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSelect, useList, useDelete } from "@refinedev/core";
import {
  Eye, Edit, Plus, Search, Users, Shield, BookOpen,
  Filter, LayoutGrid, LayoutList, Phone, Building2,
  UserCheck, UserX, GraduationCap, Briefcase, TrendingUp,
  ChevronRight, Star, Clock, UploadCloud, Download, FileSpreadsheet, Trash2
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import Papa from "papaparse";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { Modal } from "../../../components/common/Modal";

// ─── Position label & color helpers ───────────────────────────────────────────
const POSITION_MAP: Record<string, { label: string; color: string }> = {
  kepala_sekolah: { label: "Kepala Sekolah", color: "bg-purple-100 text-purple-800 border-purple-200" },
  wakasek:        { label: "Wakil Kepala",   color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  guru:           { label: "Guru",           color: "bg-blue-100 text-blue-800 border-blue-200" },
  school_center:  { label: "School Center",  color: "bg-pink-100 text-pink-800 border-pink-200" },
  bendahara:      { label: "Bendahara / Keuangan", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  penanggung_jawab:{ label: "Penanggung Jawab", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  bk:             { label: "Bimbingan Konseling", color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
  pustakawan:     { label: "Pustakawan",     color: "bg-orange-100 text-orange-800 border-orange-200" },
  laboran:        { label: "Laboran",        color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  tu:             { label: "Tata Usaha",     color: "bg-amber-100 text-amber-800 border-amber-200" },
  satpam:         { label: "Satpam",         color: "bg-slate-100 text-slate-800 border-slate-200" },
  cleaning_service:{ label: "Kebersihan",   color: "bg-teal-100 text-teal-800 border-teal-200" },
  lainnya:        { label: "Lainnya",        color: "bg-gray-100 text-gray-800 border-gray-200" },
};

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  active:   { label: "Aktif",    color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  inactive: { label: "Nonaktif", color: "bg-gray-100 text-gray-600",      dot: "bg-gray-400" },
  resigned: { label: "Resign",   color: "bg-red-50 text-red-700",         dot: "bg-red-500" },
  contract: { label: "Kontrak",  color: "bg-yellow-50 text-yellow-700",   dot: "bg-yellow-500" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
  "from-cyan-500 to-sky-600",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Stat Card Component ───────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Employee Card (Grid View) ─────────────────────────────────────────────────
function EmployeeCard({ employee, onClick, onEdit, onDelete }: { employee: any; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const pos = POSITION_MAP[employee.position] ?? { label: employee.position ?? "—", color: "bg-gray-100 text-gray-800 border-gray-200" };
  const sts = STATUS_MAP[employee.status] ?? { label: employee.status ?? "—", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  const avatarColor = getAvatarColor(employee.full_name ?? "?");

  const assignments: any[] = employee._assignments ?? [];
  const subjects = assignments
    .filter((a) => a.subject)
    .map((a) => a.subject)
    .slice(0, 2);

  return (
    <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
            {getInitials(employee.full_name ?? "?")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm leading-tight truncate max-w-[150px]">{employee.full_name}</p>
            {employee.nik && <p className="text-[10px] text-muted-foreground mt-0.5">NIK: {employee.nik}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sts.color}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${sts.dot}`} />
          {sts.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${pos.color}`}>{pos.label}</span>
        {subjects.map((s, i) => (
          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
            {s}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {employee.units?.name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{employee.units.name}</span>
          </div>
        )}
        {employee.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{employee.phone}</span>
          </div>
        )}
        {assignments.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>{assignments.length} penugasan aktif</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1 border-t">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 py-1.5 rounded-md transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Detail
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:bg-muted py-1.5 rounded-md transition-colors"
        >
          <Edit className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 py-1.5 rounded-md transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Hapus
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export const EmployeesList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/hrd") ? "/hrd/employees" : "/employees";
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadUnitId, setUploadUnitId] = useState("");
  const [uploadPosition, setUploadPosition] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { mutate: deleteEmployee } = useDelete();

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    deleteEmployee(
      {
        resource: "employees",
        id: deleteTarget.id,
        successNotification: () => {
          return {
            message: `Berhasil dihapus`,
            description: `Data pegawai "${deleteTarget.name}" telah dihapus secara permanen.`,
            type: "success",
          };
        },
      },
      {
        onSuccess: () => {
          setIsDeleting(false);
          setDeleteTarget(null);
        },
        onError: () => {
          setIsDeleting(false);
        }
      }
    );
  };

  // Load all employees for stats (no filter)
  const { data: allEmployeesData } = useList({
    resource: "employees",
    pagination: { pageSize: 1000 },
    meta: { select: "id, status, position" },
  });

  // Stats calculation
  const stats = useMemo(() => {
    const all = allEmployeesData?.data ?? [];
    return {
      total: all.length,
      active: all.filter((e) => e.status === "active").length,
      teachers: all.filter((e) => e.position === "guru" && e.status === "active").length,
      nonTeachers: all.filter((e) => e.position !== "guru" && e.status === "active").length,
      inactive: all.filter((e) => e.status !== "active").length,
    };
  }, [allEmployeesData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const buildFilters = () => {
    const filters: any[] = [];
    if (searchQuery) {
      filters.push({
        operator: "or",
        value: [
          { field: "full_name", operator: "ilike", value: `%${searchQuery}%` },
          { field: "nik", operator: "ilike", value: `%${searchQuery}%` },
        ],
      });
    }
    if (filterUnit) filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    if (filterPosition) filters.push({ field: "position", operator: "eq", value: filterPosition });
    if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
    return filters;
  };

  const downloadTemplate = () => {
    const csvContent = "Nama Lengkap,NIK,NUPTK,Jenis Kelamin (L/P),Tempat Lahir,Tanggal Lahir (YYYY-MM-DD),Agama,Alamat,No HP\nPegawai Contoh,1234567890123456,,L,Jakarta,1985-05-15,Islam,Jl. Merdeka No 1,08123456789";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Upload_Pegawai.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          setPreviewData(results.data);
        }
      });
    }
  };

  const processUpload = async () => {
    if (!uploadFile) {
      toast.error("Pilih file CSV yang akan diunggah!");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const validRows = previewData.filter((row: any) => row['Nama Lengkap']);
      
      if (validRows.length === 0) {
        toast.error("File CSV kosong atau format tidak sesuai.");
        setIsUploading(false);
        return;
      }

      const employeesToInsert = validRows.map((row: any) => ({
        full_name: row['Nama Lengkap'],
        nik: row['NIK'] || null,
        nuptk: row['NUPTK'] || null,
        gender: row['Jenis Kelamin (L/P)'] === 'P' || row['Jenis Kelamin (L/P)']?.toLowerCase() === 'perempuan' ? 'P' : 'L',
        birth_place: row['Tempat Lahir'] || null,
        date_of_birth: row['Tanggal Lahir (YYYY-MM-DD)'] || null,
        religion: row['Agama'] || 'Islam',
        address: row['Alamat'] || null,
        phone: row['No HP'] || null,
        unit_id: uploadUnitId || null,
        position: uploadPosition || 'lainnya',
        status: 'active'
      }));

      const { error } = await supabaseClient.from('employees').insert(employeesToInsert);
      
      if (error) throw error;
      
      toast.success(`Berhasil mengunggah ${employeesToInsert.length} pegawai!`);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setPreviewData([]);
      setUploadUnitId("");
      setUploadPosition("");
      
      tableQueryResult.refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mengunggah data: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Pegawai",
        cell: function render({ row, getValue }) {
          const name = getValue<string>() ?? "";
          const nik = row.original.nik;
          const avatarColor = getAvatarColor(name);
          return (
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {getInitials(name)}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{name}</p>
                {nik && <p className="text-[10px] text-muted-foreground">NIK: {nik}</p>}
              </div>
            </div>
          );
        },
      },
      {
        id: "position",
        accessorKey: "position",
        header: "Jabatan",
        cell: function render({ getValue }) {
          const pos = getValue<string>() ?? "";
          const cfg = POSITION_MAP[pos] ?? { label: pos.replace(/_/g, " "), color: "bg-gray-100 text-gray-800 border-gray-200" };
          return (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
              {cfg.label}
            </span>
          );
        },
      },
      {
        id: "unit",
        accessorKey: "units.name",
        header: "Unit / Divisi",
        cell: function render({ getValue }) {
          const val = getValue<string>();
          return val ? (
            <span className="flex items-center gap-1.5 text-sm">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> {val}
            </span>
          ) : (
            <span className="text-muted-foreground italic text-xs">Lintas Unit</span>
          );
        },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "No. HP",
        cell: function render({ getValue }) {
          const val = getValue<string>();
          return val ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> {val}
            </span>
          ) : <span className="text-muted-foreground text-xs">—</span>;
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: function render({ getValue }) {
          const val = getValue<string>() ?? "";
          const cfg = STATUS_MAP[val] ?? { label: val, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
          return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          );
        },
      },
      {
        id: "assignments",
        accessorKey: "id",
        header: "Penugasan",
        cell: function render({ row }) {
          const assignments: any[] = row.original._assignments ?? [];
          if (assignments.length === 0) return <span className="text-xs text-muted-foreground italic">Belum ada</span>;
          const subjects = assignments.filter((a) => a.subject).map((a) => a.subject);
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {subjects.slice(0, 2).map((s, i) => (
                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                  {s}
                </span>
              ))}
              {subjects.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{subjects.length - 2}</span>
              )}
              {assignments.length > 0 && subjects.length === 0 && (
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  {assignments.length} tugas
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ getValue, row }) {
          const id = getValue<string>();
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(`${basePath}/show/${id}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail & Penugasan"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`${basePath}/edit/${id}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Edit Pegawai"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`${basePath}/show/${id}#assignments`)}
                className="p-1.5 text-muted-foreground hover:text-emerald-600 transition-colors rounded-md hover:bg-emerald-50"
                title="Kelola Penugasan"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(id, row.original.full_name)}
                className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                title="Hapus Pegawai"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  const { refineCore: { tableQueryResult }, ...table } = useTable({
    columns,
    refineCoreProps: {
      resource: "employees",
      filters: { permanent: buildFilters() },
      sorters: { permanent: [{ field: "full_name", order: "asc" }] },
      pagination: { pageSize: 20 },
      meta: { select: "*, units(name)" },
    },
  });

  const isLoading = tableQueryResult.isLoading;
  const rows = table.getRowModel().rows;

  // Load assignments for card view enrichment
  const employeeIds = rows.map((r) => r.original.id);
  const { data: assignmentsData } = useList({
    resource: "teacher_assignments",
    filters: employeeIds.length > 0 ? [{ field: "employee_id", operator: "in", value: employeeIds }] : [],
    pagination: { pageSize: 500 },
    meta: { select: "employee_id, subject, role_type, is_active" },
    queryOptions: { enabled: employeeIds.length > 0 },
  });

  // Enrich rows with assignment data
  const enrichedRows = useMemo(() => {
    const assignmentMap: Record<string, any[]> = {};
    (assignmentsData?.data ?? []).forEach((a) => {
      if (!assignmentMap[a.employee_id]) assignmentMap[a.employee_id] = [];
      assignmentMap[a.employee_id].push(a);
    });
    return rows.map((row) => ({
      ...row,
      original: {
        ...row.original,
        _assignments: assignmentMap[row.original.id] ?? [],
      },
    }));
  }, [rows, assignmentsData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Pegawai & Staf"
        description="Kelola data kepegawaian, penugasan mata pelajaran, dan informasi staf sekolah."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors shadow-sm font-medium text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Masal
            </button>
            <Link
              to={`${basePath}/create`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Pegawai
            </Link>
          </div>
        }
      />

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Pegawai"   value={stats.total}      color="bg-blue-100 text-blue-700"    />
        <StatCard icon={UserCheck}    label="Pegawai Aktif"   value={stats.active}     color="bg-emerald-100 text-emerald-700" sub={`${stats.inactive} nonaktif`} />
        <StatCard icon={GraduationCap} label="Tenaga Pengajar" value={stats.teachers}  color="bg-purple-100 text-purple-700" />
        <StatCard icon={Briefcase}    label="Staf Non-Guru"   value={stats.nonTeachers} color="bg-amber-100 text-amber-700" />
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        <div className="flex gap-3 items-center">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama pegawai atau NIK..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Cari
            </button>
          </form>
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              title="Tampilan Tabel"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 transition-colors ${viewMode === "card" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Jabatan</option>
            <option value="kepala_sekolah">Kepala Sekolah</option>
            <option value="wakasek">Wakil Kepala Sekolah</option>
            <option value="guru">Guru / Pengajar</option>
            <option value="school_center">School Center</option>
            <option value="bendahara">Bendahara / Keuangan</option>
            <option value="penanggung_jawab">Penanggung Jawab</option>
            <option value="bk">Bimbingan Konseling</option>
            <option value="pustakawan">Pustakawan</option>
            <option value="laboran">Laboran</option>
            <option value="tu">Tata Usaha</option>
            <option value="satpam">Satpam</option>
            <option value="cleaning_service">Cleaning Service</option>
            <option value="lainnya">Lainnya</option>
          </select>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Unit</option>
            {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="resigned">Resign</option>
          </select>
          {(filterPosition || filterUnit || filterStatus || searchQuery) && (
            <button
              onClick={() => { setFilterPosition(""); setFilterUnit(""); setFilterStatus(""); setQ(""); setSearchQuery(""); }}
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Reset Filter
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {isLoading ? "Memuat..." : `${table.getRowModel().rows.length} pegawai ditampilkan`}
          </span>
        </div>
      </div>

      {/* ── Content Area ── */}
      {isLoading ? (
        <div className="bg-card rounded-xl border shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat data kepegawaian...</p>
          </div>
        </div>
      ) : enrichedRows.length === 0 ? (
        <div className="bg-card rounded-xl border shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-1">Tidak Ada Data Pegawai</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-4">
            Tidak ada pegawai yang sesuai dengan filter. Coba ubah kriteria pencarian.
          </p>
          <Link to={`${basePath}/create`} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <Plus className="w-4 h-4" /> Tambah Pegawai Baru
          </Link>
        </div>
      ) : viewMode === "card" ? (
        /* ── CARD VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {enrichedRows.map((row) => (
            <EmployeeCard
              key={row.original.id}
              employee={row.original}
              onClick={() => navigate(`${basePath}/show/${row.original.id}`)}
              onEdit={() => navigate(`${basePath}/edit/${row.original.id}`)}
              onDelete={() => handleDelete(row.original.id, row.original.full_name)}
            />
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
                {table.getHeaderGroups().map((headerGroup: any) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header: any) => (
                      <th key={header.id} className="px-5 py-3.5 whitespace-nowrap">
                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {enrichedRows.map((row: any) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {row.getVisibleCells().map((cell: any) => (
                      <td key={cell.id} className="px-5 py-3.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="text-xs px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="text-xs px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => !isUploading && setIsUploadModalOpen(false)} title="Upload Masal Data Pegawai">
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold mb-1">Panduan Upload</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
                <li>Unduh template CSV terlebih dahulu jika belum memilikinya.</li>
                <li>Isi data pegawai sesuai format pada template. Kolom <b>Nama Lengkap</b> wajib diisi.</li>
                <li>Pilih Jabatan dan Unit (opsional) di form ini agar diterapkan ke semua pegawai dalam file CSV tersebut.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 text-gray-700 hover:border-primary hover:text-primary px-4 py-3 rounded-xl transition-all font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Download Template CSV
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Jabatan Umum</label>
              <select 
                value={uploadPosition} 
                onChange={(e) => setUploadPosition(e.target.value)} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary text-sm bg-white"
              >
                <option value="">-- Pilih Jabatan --</option>
                <option value="kepala_sekolah">Kepala Sekolah</option>
                <option value="wakasek">Wakil Kepala Sekolah</option>
                <option value="guru">Guru / Pengajar</option>
                <option value="school_center">School Center</option>
                <option value="bendahara">Bendahara / Keuangan</option>
                <option value="penanggung_jawab">Penanggung Jawab</option>
                <option value="bk">Bimbingan Konseling</option>
                <option value="pustakawan">Pustakawan</option>
                <option value="laboran">Laboran</option>
                <option value="tu">Tata Usaha</option>
                <option value="satpam">Satpam</option>
                <option value="cleaning_service">Cleaning Service</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Unit (Opsional)</label>
              <select 
                value={uploadUnitId} 
                onChange={(e) => setUploadUnitId(e.target.value)} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary text-sm bg-white"
              >
                <option value="">Lintas Unit</option>
                {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Upload File CSV</label>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="w-full border rounded-md px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {previewData.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg border text-sm text-center">
              Ditemukan <span className="font-bold text-primary">{previewData.filter(r => r['Nama Lengkap']).length}</span> baris data pegawai yang valid siap untuk diunggah.
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t mt-4">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
              className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              Batal
            </button>
            <button 
              onClick={processUpload}
              disabled={isUploading || !uploadFile}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengunggah...
                </>
              ) : (
                "Mulai Upload"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => !isDeleting && setDeleteTarget(null)} title="Konfirmasi Hapus Pegawai">
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 text-red-800 rounded-xl border border-red-100">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold mb-1 text-red-900">Hapus Permanen?</h4>
              <p className="text-sm text-red-700/90 leading-relaxed">
                Anda akan menghapus data pegawai <span className="font-bold">{deleteTarget?.name}</span> secara permanen. Tindakan ini tidak dapat dibatalkan dan seluruh penugasan serta data terkait mungkin akan terpengaruh.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus Permanen"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
