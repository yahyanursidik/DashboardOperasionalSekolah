import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Plus, Search, Filter, BookOpen, Trash2, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useSelect, useDelete } from "@refinedev/core";
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

export const ClassesList: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();

  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterYear, setFilterYear] = useState(activeYearId || "");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: yearOptions } = useSelect({ resource: "academic_years", optionLabel: "name", optionValue: "id" });

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
    [navigate]
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

  return (
    <div className="space-y-6">
      {isError && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          <p className="font-bold">Error fetching data:</p>
          <pre className="text-xs">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      <PageHeader
        title="Daftar Kelas"
        description="Kelola kelas, wali kelas, dan rombongan belajar."
        action={
          <Link
            to="/classes/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Kelas Baru
          </Link>
        }
      />

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
            onChange={(e) => setFilterYear(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Tahun Ajaran</option>
            {yearOptions?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
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
