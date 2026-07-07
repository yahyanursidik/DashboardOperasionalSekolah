import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, AlertTriangle, Loader2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useDelete } from "@refinedev/core";
import { toast } from "sonner";

// --- DELETE CONFIRM MODAL ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  name: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, name, isDeleting, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Hapus Kategori?</h3>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus kategori <span className="font-bold text-foreground">"{name}"</span> secara permanen.
          </p>
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

// --- TABLE PAGINATION ---
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

export const DigitalLibraryCategoriesList: React.FC = () => {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
    deleteMutate(
      { resource: "digital_library_categories", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success(`Kategori ${deleteModal.name} berhasil dihapus!`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        },
        onError: (error) => {
          console.error(error);
          toast.error(`Gagal menghapus Kategori ${deleteModal.name}.`);
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
        header: "Nama Kategori",
        cell: function render({ getValue }) {
          return <span className="font-medium">{getValue<string>()}</span>;
        },
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Deskripsi",
        cell: function render({ getValue }) {
          const val = getValue<string>();
          return val ? <span className="text-muted-foreground">{val}</span> : "-";
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
                onClick={() => navigate(`/digital-library/categories/edit/${row.original.id}`)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit Kategori"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(row.original.id, row.original.name)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus Kategori"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const filters = [];
  if (searchQuery) {
    filters.push({ field: "name", operator: "contains", value: searchQuery });
  }

  const {
    getHeaderGroups,
    getRowModel,
    getState,
    setPageIndex,
    getCanPreviousPage,
    getPageCount,
    getCanNextPage,
    nextPage,
    previousPage,
    refineCore: { setCurrent, pageCount, current },
  } = useTable({
    columns,
    refineCoreProps: {
      resource: "digital_library_categories",
      filters: {
        initial: filters as any,
        permanent: [],
      },
      pagination: { pageSize: 10 },
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        name={deleteModal.name}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
      />

      <PageHeader
        title="Kategori Perpustakaan"
        description="Kelola kategori perpustakaan digital."
      />

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-muted/10 shrink-0">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </form>

          <Link
            to="/digital-library/categories/create"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Kategori Baru</span>
          </Link>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
              {getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4 font-semibold whitespace-nowrap">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {getRowModel().rows.length > 0 ? (
                getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                    Belum ada kategori yang ditambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={current}
          totalPages={pageCount}
          totalItems={pageCount * 10} // Approximation since refine doesn't give total count directly in useTable easily
          itemsPerPage={10}
          onPageChange={setCurrent}
        />
      </div>
    </div>
  );
};
