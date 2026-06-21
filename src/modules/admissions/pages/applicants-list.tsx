import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Search, Filter, Eye, CheckCircle, XCircle, CalendarDays, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Trash2, AlertTriangle } from "lucide-react";
import { mockApplicants, getSpmbSettings } from "../mock";
import type { Applicant } from "../mock";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  getFilteredRowModel, 
  flexRender 
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

export const ApplicantsList: React.FC = () => {
  const currentAcademicYear = getSpmbSettings().academicYear;
  
  // Local state to simulate backend updates
  const [data, setData] = useState<Applicant[]>(mockApplicants);
  
  const [selectedYear, setSelectedYear] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Modal State for user-friendly feedback
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'verify' | 'reject' | 'remove' | null;
    appId: string;
    appName: string;
  }>({
    isOpen: false,
    type: null,
    appId: '',
    appName: ''
  });

  // Apply manual filters before passing to TanStack table
  const filteredData = useMemo(() => {
    return data.filter(app => {
      const matchesYear = selectedYear === "Semua" || app.academicYear === selectedYear;
      const matchesStatus = selectedStatus === "Semua" || app.status === selectedStatus;
      return matchesYear && matchesStatus;
    });
  }, [data, selectedYear, selectedStatus]);

  // Actions
  const handleOpenModal = (type: 'verify' | 'reject' | 'remove', id: string, name: string) => {
    setModalState({ isOpen: true, type, appId: id, appName: name });
  };

  const handleConfirmAction = () => {
    const { type, appId, appName } = modalState;
    if (type === 'verify') {
      setData(prev => prev.map(app => app.id === appId ? { ...app, status: 'Verifikasi Valid' } : app));
      toast.success(`Berkas pendaftaran ${appName} berhasil diverifikasi!`);
    } else if (type === 'reject') {
      setData(prev => prev.map(app => app.id === appId ? { ...app, status: 'Ditolak' } : app));
      toast.error(`Pendaftar ${appName} telah ditolak.`);
    } else if (type === 'remove') {
      setData(prev => prev.filter(app => app.id !== appId));
      toast.success(`Data pendaftar ${appName} berhasil dihapus permanen.`);
    }
    setModalState({ isOpen: false, type: null, appId: '', appName: '' });
  };

  const columns = useMemo<ColumnDef<Applicant>[]>(() => [
    {
      accessorKey: "id",
      header: "No. Registrasi",
      cell: info => <span className="font-medium text-foreground">{info.getValue() as string}</span>
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground transition-colors outline-none" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Nama Pendaftar
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: info => <span className="font-semibold">{info.getValue() as string}</span>
    },
    {
      accessorKey: "school",
      header: "Asal Sekolah",
      cell: info => <span className="text-muted-foreground">{info.getValue() as string}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        let colorClass = "bg-amber-100 text-amber-700";
        if (status === 'Lulus Tes') colorClass = "bg-emerald-100 text-emerald-700";
        if (status === 'Verifikasi Valid') colorClass = "bg-blue-100 text-blue-700";
        if (status === 'Berkas Lengkap') colorClass = "bg-purple-100 text-purple-700";
        if (status === 'Ditolak') colorClass = "bg-rose-100 text-rose-700";
        
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      accessorKey: "score",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground transition-colors outline-none" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Nilai Tes
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: info => <span className="font-bold">{info.getValue() as number}</span>
    },
    {
      id: "actions",
      header: () => <div className="text-center">Aksi</div>,
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="flex items-center justify-center gap-1">
            <Link to={`/admissions/applicants/${app.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Lihat Detail">
              <Eye className="w-4 h-4" />
            </Link>
            <button 
              onClick={() => handleOpenModal('verify', app.id, app.name)}
              disabled={app.status === 'Verifikasi Valid' || app.status === 'Lulus Tes' || app.status === 'Ditolak'}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
              title="Verifikasi"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleOpenModal('reject', app.id, app.name)}
              disabled={app.status === 'Ditolak' || app.status === 'Lulus Tes'}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
              title="Tolak"
            >
              <XCircle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleOpenModal('remove', app.id, app.name)}
              className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors" 
              title="Hapus"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const allYears = Array.from(new Set([...mockApplicants.map(a => a.academicYear), currentAcademicYear])).sort().reverse();
  const allStatuses = Array.from(new Set(mockApplicants.map(a => a.status))).sort();

  return (
    <div className="space-y-6 relative">
      <PageHeader 
        title="Daftar Pendaftar SPMB" 
        description="Kelola dan verifikasi berkas calon siswa baru."
      />

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Cari nama, asal sekolah, atau registrasi..." 
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto shadow-sm rounded-lg">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-background border px-4 py-2 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Semua">Semua Tahun</option>
                {allYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <CalendarDays className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative w-full sm:w-auto shadow-sm rounded-lg">
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-background border px-4 py-2 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Semua">Semua Status</option>
                {allStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
                {!allStatuses.includes('Ditolak') && <option value="Ditolak">Ditolak</option>}
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b">
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
            <tbody className="divide-y">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
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
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-muted/50 p-4 rounded-full mb-4">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground">Data tidak ditemukan</p>
                      <p className="text-xs mt-1">Belum ada data pendaftar yang cocok dengan filter atau pencarian Anda.</p>
                    </div>
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
                <span className="ml-2 hidden sm:inline">(Total: {table.getFilteredRowModel().rows.length} pendaftar)</span>
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                className="bg-background border rounded-md text-xs px-2 py-1 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
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
                className="p-1.5 border rounded-md hover:bg-muted disabled:opacity-50 transition-colors text-foreground bg-background"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 border rounded-md hover:bg-muted disabled:opacity-50 transition-colors text-foreground bg-background"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full shrink-0 ${
                  modalState.type === 'remove' ? 'bg-red-100 text-red-600' : 
                  modalState.type === 'reject' ? 'bg-rose-100 text-rose-600' : 
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {modalState.type === 'remove' && <Trash2 className="w-6 h-6" />}
                  {modalState.type === 'reject' && <XCircle className="w-6 h-6" />}
                  {modalState.type === 'verify' && <CheckCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {modalState.type === 'remove' ? 'Hapus Pendaftar' : 
                     modalState.type === 'reject' ? 'Tolak Pendaftar' : 
                     'Verifikasi Berkas'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {modalState.type === 'remove' ? `Anda akan menghapus data pendaftar atas nama ${modalState.appName} secara permanen. Tindakan ini tidak dapat dibatalkan.` : 
                     modalState.type === 'reject' ? `Apakah Anda yakin ingin menolak pendaftar atas nama ${modalState.appName}?` : 
                     `Verifikasi bahwa berkas pendaftar atas nama ${modalState.appName} sudah valid dan lengkap.`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/30 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalState({ isOpen: false, type: null, appId: '', appName: '' })}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors border shadow-sm bg-background"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-colors ${
                  modalState.type === 'remove' ? 'bg-red-600 hover:bg-red-700' : 
                  modalState.type === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 
                  'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {modalState.type === 'remove' ? 'Ya, Hapus Data' : 
                 modalState.type === 'reject' ? 'Ya, Tolak' : 
                 'Ya, Verifikasi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
