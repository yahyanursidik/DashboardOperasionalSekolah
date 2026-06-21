import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Plus, Search, FilterX, UploadCloud, Download, FileSpreadsheet, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import Papa from "papaparse";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { Modal } from "../../../components/common/Modal";

// Helper function to calculate completeness
export const calculateCompleteness = (student: any) => {
  const fields = [
    "full_name", "gender", "unit_id", "nis", 
    "nisn", "class_id", "birth_place", "date_of_birth", "address"
  ];
  const filled = fields.filter(f => student[f] !== null && student[f] !== "").length;
  return Math.round((filled / fields.length) * 100);
};

// --- DELETE CONFIRM MODAL ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  studentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, studentName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Hapus Data Siswa?</h3>
          <p className="text-muted-foreground text-sm">
            Apakah Anda yakin ingin menghapus data <span className="font-semibold text-foreground">{studentName}</span>?
            Tindakan ini tidak dapat dibatalkan. Pastikan data tidak berelasi dengan tabel lain.
          </p>
        </div>
        <div className="flex bg-muted/30 p-4 border-t gap-3 justify-end">
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

export const StudentsList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  // Local Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadUnitId, setUploadUnitId] = useState("");
  const [uploadClassId, setUploadClassId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Delete State
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });

  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: classes } = useList({ 
    resource: "classes", 
    filters: (activeUnitId || filterUnit) ? [{ field: "unit_id", operator: "eq", value: activeUnitId || filterUnit }] : [],
    pagination: { mode: "off" } 
  });

  const buildFilters = () => {
    const filters: any[] = [];
    
    // Prioritize activeUnitId from global context, otherwise use local filterUnit
    if (activeUnitId) {
      filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    } else if (filterUnit) {
      filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    }

    if (filterClass) filters.push({ field: "class_id", operator: "eq", value: filterClass });
    if (filterGender) filters.push({ field: "gender", operator: "eq", value: filterGender });
    if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
    if (searchTerm) filters.push({ field: "full_name", operator: "ilike", value: `%${searchTerm}%` });
    
    return filters;
  };

  const downloadTemplate = () => {
    const csvContent = "Nama Lengkap,NIS,NISN,Jenis Kelamin (L/P),Tempat Lahir,Tanggal Lahir (YYYY-MM-DD),Alamat\nSiswa Contoh,2024001,0123456789,L,Jakarta,2010-05-15,Jl. Merdeka No 1";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Upload_Siswa.csv");
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
    if (!uploadUnitId) {
      toast.error("Pilih Unit Sekolah terlebih dahulu!");
      return;
    }
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

      const studentsToInsert = validRows.map((row: any) => ({
        full_name: row['Nama Lengkap'],
        nis: row['NIS'] || null,
        nisn: row['NISN'] || null,
        gender: row['Jenis Kelamin (L/P)'] === 'P' || row['Jenis Kelamin (L/P)']?.toLowerCase() === 'perempuan' ? 'P' : 'L',
        birth_place: row['Tempat Lahir'] || null,
        date_of_birth: row['Tanggal Lahir (YYYY-MM-DD)'] || null,
        address: row['Alamat'] || null,
        unit_id: uploadUnitId,
        class_id: uploadClassId || null,
        status: 'active'
      }));

      const { error } = await supabaseClient.from('students').insert(studentsToInsert);
      
      if (error) throw error;
      
      toast.success(`Berhasil mengunggah ${studentsToInsert.length} siswa!`);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setPreviewData([]);
      setUploadClassId("");
      
      tableQueryResult.refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mengunggah data: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    if (!deleteModal.id) return;
    deleteMutate(
      { resource: "students", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success("Siswa berhasil dihapus!");
          setDeleteModal({ isOpen: false, id: "", name: "" });
          tableQueryResult.refetch();
        },
        onError: (error: any) => {
          console.error(error);
          toast.error("Gagal menghapus siswa. Data mungkin berelasi dengan tabel lain.");
        }
      }
    );
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Siswa",
        cell: function render({ row, getValue }) {
          const photoUrl = row.original.photo_url;
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border">
                {photoUrl ? (
                  <img 
                    src={photoUrl.startsWith('http') ? photoUrl : `https://ebdkupeqmpqrdfketgab.supabase.co/storage/v1/object/public/school-documents/${photoUrl}`}
                    alt={getValue<string>()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-primary/50 text-xs">
                    {getValue<string>().charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{getValue<string>()}</span>
                {row.original.nickname && (
                  <span className="text-xs text-muted-foreground">Panggilan: {row.original.nickname}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "nis",
        accessorKey: "nis",
        header: "NIS / NISN",
        cell: function render({ row }) {
          return (
            <div className="flex flex-col text-sm">
              <span className="font-mono">{row.original.nis}</span>
              <span className="text-xs text-muted-foreground">{row.original.nisn || "-"}</span>
            </div>
          );
        },
      },
      {
        id: "gender",
        accessorKey: "gender",
        header: "L/P",
        cell: function render({ getValue }) {
          return getValue() === "L" ? "Ikhwan (L)" : "Akhawat (P)";
        },
      },
      {
        id: "unit",
        header: "Unit",
        cell: function render({ row }) {
          const u = row.original.units as any;
          const name = Array.isArray(u) ? u[0]?.name : u?.name;
          return <span className="text-xs font-bold px-2 py-1 bg-muted rounded-md">{name || "-"}</span>;
        },
      },
      {
        id: "class",
        header: "Kelas",
        cell: function render({ row }) {
          const c = row.original.classes as any;
          const name = Array.isArray(c) ? c[0]?.name : c?.name;
          return <span className="font-medium">{name || "Belum ada"}</span>;
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: function render({ getValue }) {
          const status = getValue<string>();
          const styles: Record<string, { bg: string, text: string, border: string, dot: string, label: string }> = {
            active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Aktif" },
            inactive: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", label: "Nonaktif" },
            graduated: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500", label: "Lulus" },
            transferred: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Pindah" },
            dropped_out: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", label: "Dikeluarkan" },
          };
          const style = styles[status] || styles.active;
          return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
              {style.label}
            </div>
          );
        },
      },
      {
        id: "completeness",
        header: "Data",
        cell: function render({ row }) {
          const score = calculateCompleteness(row.original);
          const color = score === 100 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-destructive";
          return (
            <div className="flex items-center gap-2 w-24">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${score === 100 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${score}%` }}></div>
              </div>
              <span className={`text-xs font-semibold ${color}`}>{score}%</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ row, getValue }) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(`/students/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/students/edit/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Ubah Data"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: getValue() as string, name: row.original.full_name })}
                className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                title="Hapus"
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
      resource: "students",
      filters: {
        permanent: buildFilters(),
      },
      meta: {
        select: "*, units(name), classes(name)",
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrasi Siswa"
        description="Kelola data induk siswa, riwayat akademik, dan mutasi."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/students/mass-promotion"
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-md hover:bg-emerald-100 transition-colors shadow-sm font-medium text-sm"
            >
              <FilterX className="w-4 h-4" /> {/* Or use an icon like GraduationCap/Users */}
              Aksi Massal
            </Link>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors shadow-sm font-medium text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Masal
            </button>
            <Link
              to="/students/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Siswa Baru
            </Link>
          </div>
        }
      />

      {/* Advanced Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ketik nama siswa untuk mencari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 font-medium"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-end gap-3">
          {!activeUnitId && (
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Sekolah</label>
              <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">Semua Unit</option>
                {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Kelas</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="graduated">Lulus</option>
              <option value="transferred">Pindah</option>
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">L / P</label>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua (L/P)</option>
              <option value="L">Ikhwan</option>
              <option value="P">Akhawat</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterUnit(""); setFilterClass(""); setFilterGender(""); setFilterStatus(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2 h-[38px]"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 p-12">
            <div className="animate-pulse flex flex-col items-center gap-4 w-full max-w-md">
              <div className="h-10 bg-muted w-full rounded-md"></div>
              <div className="h-10 bg-muted w-full rounded-md"></div>
              <div className="h-10 bg-muted w-full rounded-md"></div>
              <div className="h-10 bg-muted w-full rounded-md"></div>
            </div>
            <p className="animate-pulse">Memuat data siswa...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Data Tidak Ditemukan</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tidak ada siswa yang cocok dengan filter saat ini. Ubah kriteria filter atau tambah siswa baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
        )}

        {/* Pagination */}
        {!isLoading && table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 mt-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Halaman <strong>{table.getState().pagination.pageIndex + 1}</strong> dari <strong>{table.getPageCount()}</strong>
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="bg-background border border-input rounded-md text-sm px-2 py-1 ml-4 focus:ring-1 focus:ring-primary outline-none"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    Tampilkan {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => !isUploading && setIsUploadModalOpen(false)} title="Upload Masal Data Siswa">
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold mb-1">Panduan Upload</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
                <li>Unduh template CSV terlebih dahulu jika belum memilikinya.</li>
                <li>Isi data siswa sesuai format pada template. Kolom <b>Nama Lengkap</b> wajib diisi.</li>
                <li>Pilih Unit dan Kelas (opsional) pada form di bawah, sehingga Anda tidak perlu mengetik ID Unit/Kelas di file.</li>
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
              <label className="text-sm font-medium text-gray-700">Unit Sekolah <span className="text-red-500">*</span></label>
              <select 
                value={uploadUnitId} 
                onChange={(e) => { setUploadUnitId(e.target.value); setUploadClassId(""); }} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary text-sm"
              >
                <option value="">-- Pilih Unit --</option>
                {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Kelas (Opsional)</label>
              <select 
                value={uploadClassId} 
                onChange={(e) => setUploadClassId(e.target.value)} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary text-sm"
                disabled={!uploadUnitId}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes?.data?.filter(c => c.unit_id === uploadUnitId).map(c => (
                  <option key={c.id} value={c.id as string}>{c.name}</option>
                ))}
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
              Ditemukan <span className="font-bold text-primary">{previewData.filter(r => r['Nama Lengkap']).length}</span> baris data siswa yang valid siap untuk diunggah.
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
              disabled={isUploading || !uploadUnitId || !uploadFile}
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

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        studentName={deleteModal.name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        isDeleting={isDeleting}
      />
    </div>
  );
};
