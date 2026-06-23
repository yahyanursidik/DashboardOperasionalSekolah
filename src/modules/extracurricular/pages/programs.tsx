import React, { useState, useMemo } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Edit2, Trash2, Search, Activity, Loader2, Save, X, ArrowUpDown, Target, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  getFilteredRowModel, 
  flexRender
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState
} from "@tanstack/react-table";

// ─── Modal Konfirmasi Lokal ──────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Hapus Program Ekskul?</h4>
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus program ini? Semua data pendaftar dan absensi terkait mungkin akan ikut terhapus.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md font-semibold transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProgramsList: React.FC = () => {
  const { data, isLoading, refetch } = useList({ resource: "extracurriculars", pagination: { mode: "off" } });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coach_name: "",
    schedule: "",
    internal_fee: 0,
    external_fee: 0,
    is_active: true,
    program_type: "ROUTINE"
  });

  const isSaving = isCreating || isUpdating;

  const openCreate = () => {
    setFormData({ name: "", description: "", coach_name: "", schedule: "", internal_fee: 0, external_fee: 0, is_active: true, program_type: "ROUTINE" });
    setEditId(null);
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      coach_name: item.coach_name || "",
      schedule: item.schedule || "",
      internal_fee: item.internal_fee || 0,
      external_fee: item.external_fee || 0,
      is_active: item.is_active,
      program_type: item.program_type || "ROUTINE"
    });
    setEditId(item.id);
    setModalMode("edit");
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    deleteMutate({ resource: "extracurriculars", id: deleteConfirmId }, {
      onSuccess: () => {
        toast.success("Program berhasil dihapus");
        setDeleteConfirmId(null);
        refetch();
      },
      onError: (error) => {
        toast.error(`Gagal menghapus: ${error?.message || 'Terjadi kesalahan sistem'}`);
        setDeleteConfirmId(null);
      }
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nama program wajib diisi");
      return;
    }
    
    if (modalMode === "create") {
      create({ resource: "extracurriculars", values: formData }, { 
        onSuccess: () => {
          toast.success("Program baru berhasil ditambahkan");
          setModalMode(null);
          refetch();
        },
        onError: (error) => {
          toast.error(`Gagal menambah program: ${error?.message || 'Periksa koneksi atau validasi data'}`);
        }
      });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "extracurriculars", id: editId, values: formData }, {
        onSuccess: () => {
          toast.success("Program berhasil diperbarui");
          setModalMode(null);
          refetch();
        },
        onError: (error) => {
          toast.error(`Gagal memperbarui program: ${error?.message || 'Terjadi kesalahan sistem'}`);
        }
      });
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground transition-colors outline-none" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Program Ekskul <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: info => <span className="font-semibold">{info.getValue() as string}</span>
    },
    {
      accessorKey: "coach_name",
      header: "Pelatih / PJ",
      cell: info => <span className="text-muted-foreground">{info.getValue() as string || '-'}</span>
    },
    {
      accessorKey: "program_type",
      header: "Tipe",
      cell: info => {
        const type = info.getValue() as string;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type === 'EVENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {type === 'EVENT' ? '1 Momen' : 'Rutin'}
          </span>
        );
      }
    },
    {
      accessorKey: "schedule",
      header: "Jadwal",
      cell: info => <span className="text-muted-foreground">{info.getValue() as string || '-'}</span>
    },
    {
      accessorKey: "internal_fee",
      header: ({ column }) => (
        <div className="flex justify-end">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors outline-none" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Biaya Internal <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
      cell: info => <div className="text-right tabular-nums">Rp {Number(info.getValue() || 0).toLocaleString('id-ID')}</div>
    },
    {
      accessorKey: "external_fee",
      header: ({ column }) => (
        <div className="flex justify-end">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors outline-none" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Biaya Eksternal <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
      cell: info => <div className="text-right tabular-nums">Rp {Number(info.getValue() || 0).toLocaleString('id-ID')}</div>
    },
    {
      accessorKey: "is_active",
      header: () => <div className="text-center">Status</div>,
      cell: ({ getValue }) => {
        const isActive = getValue() as boolean;
        return (
          <div className="text-center">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
              {isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => openEdit(row.original)} className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Edit Program">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteConfirmId(row.original.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Hapus Program">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: data?.data || [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program Ekstrakurikuler"
        description="Kelola daftar ekskul, pelatih, jadwal, dan pengaturan biaya."
        action={
          <div className="flex items-center gap-2">
            <Link to="/extracurricular" className="px-4 py-2 border rounded-lg font-medium text-sm hover:bg-muted transition-colors bg-card shadow-sm">
              Kembali ke Dashboard
            </Link>
          </div>
        }
      />

      <div className="bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row justify-between gap-4 bg-muted/10">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cari program atau pelatih..." 
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm shadow-sm"
            />
          </div>
          <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Tambah Program Baru
          </button>
        </div>

        <div className="overflow-x-auto relative min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-medium border-b">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 whitespace-nowrap">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-20 text-center text-muted-foreground">
                    {!isLoading && (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                          <Target className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-foreground text-lg mb-1">Belum Ada Program Ekskul</p>
                        <p className="text-sm">Klik "Tambah Program Baru" untuk membuat program pertama Anda.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Halaman <span className="font-medium text-foreground">{table.getState().pagination.pageIndex + 1}</span> dari <span className="font-medium text-foreground">{table.getPageCount() || 1}</span>
                <span className="ml-2 hidden sm:inline">(Total: {table.getFilteredRowModel().rows.length} program)</span>
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                className="bg-background border rounded-md text-xs px-2 py-1 focus:ring-1 focus:ring-primary outline-none cursor-pointer shadow-sm"
              >
                {[10, 20, 30, 40, 50].map(pageSize => (
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
                className="p-1.5 border rounded-md hover:bg-muted disabled:opacity-50 transition-colors text-foreground bg-background shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 border rounded-md hover:bg-muted disabled:opacity-50 transition-colors text-foreground bg-background shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl shadow-2xl border w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-8 py-6 text-white ${modalMode === "create" ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                  {modalMode === "create" ? <Plus className="w-6 h-6 text-white" /> : <Edit2 className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h3 className="font-bold text-2xl tracking-tight">{modalMode === "create" ? "Tambah Program Ekskul" : "Edit Program Ekskul"}</h3>
                  <p className="text-white/80 text-sm mt-0.5">{modalMode === "create" ? "Buat kegiatan ekstrakurikuler baru untuk siswa" : "Perbarui detail dan pengaturan program"}</p>
                </div>
              </div>
              <button onClick={() => setModalMode(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-8 bg-slate-50/50 flex-1">
              
              {/* Section 1: Informasi Dasar */}
              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                  <Activity className="w-4 h-4 text-primary" /> Informasi Dasar Program
                </h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nama Program <span className="text-rose-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 font-medium placeholder:font-normal"
                    placeholder="Contoh: Futsal, Coding & Robotic, English Club"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Deskripsi / Profil Singkat</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[100px] resize-y text-slate-800"
                    placeholder="Ceritakan gambaran kegiatan, tujuan, atau manfaat ekskul ini bagi siswa..."
                  />
                </div>
              </div>

              {/* Section 2: Pelatih & Jadwal */}
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 border-b pb-3 mb-5">
                  <Target className="w-4 h-4 text-primary" /> Pelaksanaan & Pelatih
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nama Pelatih / PJ</label>
                    <input 
                      type="text"
                      value={formData.coach_name}
                      onChange={(e) => setFormData({...formData, coach_name: e.target.value})}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                      placeholder="Contoh: Kak Budi Setiawan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Jadwal Pelaksanaan</label>
                    <input 
                      type="text"
                      value={formData.schedule}
                      onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                      placeholder="Contoh: Rabu & Jumat, 15:30 - 17:00"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Biaya & Pengaturan */}
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 border-b pb-3 mb-5">
                  <Save className="w-4 h-4 text-primary" /> Pengaturan Biaya & Status
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                      <span>Biaya Internal (Rp)</span>
                      <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 rounded">Siswa Dalam</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                      <input 
                        type="number"
                        value={formData.internal_fee}
                        onChange={(e) => setFormData({...formData, internal_fee: parseInt(e.target.value) || 0})}
                        className="w-full border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono text-lg text-slate-800"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                      <span>Biaya Eksternal (Rp)</span>
                      <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 rounded">Siswa Luar</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                      <input 
                        type="number"
                        value={formData.external_fee}
                        onChange={(e) => setFormData({...formData, external_fee: parseInt(e.target.value) || 0})}
                        className="w-full border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono text-lg text-slate-800"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                   <div className="space-y-1">
                     <label className="text-sm font-bold text-indigo-900">Tipe Program Ekskul</label>
                     <p className="text-xs text-indigo-700/80">Pilih apakah ini kegiatan mingguan rutin atau satu kali event saja.</p>
                   </div>
                   <select 
                     value={formData.program_type}
                     onChange={(e) => setFormData({...formData, program_type: e.target.value})}
                     className="w-full md:w-64 border-2 border-indigo-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all bg-white text-indigo-900 font-medium cursor-pointer"
                   >
                     <option value="ROUTINE">Rutin (Berkelanjutan)</option>
                     <option value="EVENT">1 Momen Kegiatan (Event)</option>
                   </select>
                </div>

                <div className="mt-6">
                  <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all group">
                     <div className="relative flex items-center mt-0.5">
                       <input 
                         type="checkbox" 
                         checked={formData.is_active}
                         onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                         className="w-6 h-6 rounded-md border-2 border-slate-300 text-primary focus:ring-primary focus:ring-offset-2 transition-all cursor-pointer"
                       />
                     </div>
                     <div>
                       <span className="text-base font-bold text-slate-800 group-hover:text-primary transition-colors block">Program Aktif (Terbuka untuk Pendaftaran)</span>
                       <span className="text-sm text-slate-500 mt-0.5 block">Matikan centang ini jika kuota sudah penuh atau pendaftaran belum dibuka.</span>
                     </div>
                  </label>
                </div>

              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="px-8 py-5 border-t bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setModalMode(null)} 
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Batalkan
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 font-bold disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-95"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? "Menyimpan Data..." : "Simpan Program Ekskul"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
