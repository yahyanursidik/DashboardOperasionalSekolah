import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Book, Filter, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useDelete, useSelect } from "@refinedev/core";
import { toast } from "sonner";

// --- DELETE CONFIRM MODAL ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, isDeleting, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Hapus Buku?</h3>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus buku <span className="font-bold text-foreground">"{title}"</span> secara permanen.
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

export const DigitalLibraryBooksList: React.FC = () => {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const { options: categoryOptions } = useSelect({
    resource: "digital_library_categories",
    optionLabel: "name",
    optionValue: "id",
  });

  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: "", title: "" });

  const handleDelete = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, id, title });
  };

  const confirmDelete = () => {
    deleteMutate(
      { resource: "digital_library_books", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success(`Buku ${deleteModal.title} berhasil dihapus!`);
          setDeleteModal({ isOpen: false, id: "", title: "" });
        },
        onError: (error) => {
          console.error(error);
          toast.error(`Gagal menghapus Buku ${deleteModal.title}.`);
          setDeleteModal({ isOpen: false, id: "", title: "" });
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
        id: "cover",
        header: "Cover",
        cell: function render({ row }) {
          const cover = row.original.cover_url;
          return cover ? (
            <div className="w-12 h-16 bg-muted rounded overflow-hidden">
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground">
              <Book className="w-6 h-6 opacity-50" />
            </div>
          );
        },
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Judul Buku",
        cell: function render({ row }) {
          return (
            <div>
              <p className="font-semibold text-foreground">{row.original.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{row.original.author}</p>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Kategori",
        cell: function render({ row }) {
          return row.original.digital_library_categories?.name || "-";
        },
      },
      {
        id: "status",
        accessorKey: "is_active",
        header: "Status",
        cell: function render({ getValue }) {
          const isActive = getValue<boolean>();
          return isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
              <XCircle className="w-3 h-3" /> Nonaktif
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
              <a
                href={row.original.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                title="Buka File"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => navigate(`/digital-library/edit/${row.original.id}`)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit Buku"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(row.original.id, row.original.title)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus Buku"
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
    filters.push({ field: "title", operator: "contains", value: searchQuery });
  }
  if (filterCategory) {
    filters.push({ field: "category_id", operator: "eq", value: filterCategory });
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
      resource: "digital_library_books",
      filters: {
        initial: filters as any,
        permanent: [],
      },
      meta: {
        select: "*, digital_library_categories(name)"
      },
      pagination: { pageSize: 10 },
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", title: "" })}
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <PageHeader
          title="Koleksi Buku"
          description="Kelola koleksi perpustakaan digital."
        />
        <Link
          to="/digital-library/categories"
          className="flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-lg transition-colors text-sm font-medium shadow-sm"
        >
          <Filter className="w-4 h-4" />
          <span>Kelola Kategori</span>
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-muted/10 shrink-0">
          <div className="flex flex-1 gap-4 flex-col sm:flex-row">
            <form onSubmit={handleSearch} className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari judul buku..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </form>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full sm:max-w-[200px] px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Semua Kategori</option>
              {categoryOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <Link
            to="/digital-library/create"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Buku</span>
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
                    Belum ada buku yang ditambahkan.
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
          totalItems={pageCount * 10} // Approximation
          itemsPerPage={10}
          onPageChange={setCurrent}
        />
      </div>
    </div>
  );
};
