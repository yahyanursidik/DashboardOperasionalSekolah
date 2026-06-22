import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { Eye, Edit, Plus, Search, FilterX, Trash2, AlertTriangle, Loader2, Copy } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { toast } from "sonner";
import { supabaseClient } from "../../../../lib/supabase/client";
import { useGetIdentity } from "@refinedev/core";

// --- MODALS ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, templateName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Hapus Template?</h3>
          <p className="text-muted-foreground text-sm">
            Apakah Anda yakin ingin menghapus template <span className="font-semibold text-foreground">{templateName}</span>?
            Ini juga akan menghapus semua section dan item di dalamnya.
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

const DuplicateModal: React.FC<{
  isOpen: boolean;
  templateName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
  isDuplicating: boolean;
}> = ({ isOpen, templateName, onConfirm, onCancel, isDuplicating }) => {
  const [newName, setNewName] = useState(`${templateName} (Copy)`);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDuplicating && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-2">Duplikasi Template</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Buat salinan dari template <span className="font-semibold text-foreground">{templateName}</span> beserta seluruh section dan item penilaiannya.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Template Baru</label>
            <input 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <div className="flex bg-muted/30 p-4 border-t gap-3 justify-end">
          <button onClick={onCancel} disabled={isDuplicating} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
          <button onClick={() => onConfirm(newName)} disabled={isDuplicating || !newName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            {isDuplicating && <Loader2 className="w-4 h-4 animate-spin" />}
            Duplikasi Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReportTemplatesList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();

  // Local Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState("");

  // Modals State
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });
  const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });
  const [isDuplicating, setIsDuplicating] = useState(false);

  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });

  const buildFilters = () => {
    const filters: any[] = [];
    
    if (activeUnitId) {
      filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    } else if (filterUnit) {
      filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    }

    if (filterType) filters.push({ field: "report_type", operator: "eq", value: filterType });
    if (filterActive) filters.push({ field: "is_active", operator: "eq", value: filterActive === "true" });
    if (searchTerm) filters.push({ field: "name", operator: "ilike", value: `%${searchTerm}%` });
    
    return filters;
  };

  const handleDelete = () => {
    if (!deleteModal.id) return;
    deleteMutate(
      { resource: "report_templates", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success("Template berhasil dihapus!");
          setDeleteModal({ isOpen: false, id: "", name: "" });
          tableQueryResult.refetch();
        },
        onError: (error: any) => {
          console.error(error);
          toast.error("Gagal menghapus template. Pastikan tidak sedang digunakan oleh rapor.");
        }
      }
    );
  };

  const handleDuplicate = async (newName: string) => {
    if (!duplicateModal.id || !user?.id) return;
    setIsDuplicating(true);
    try {
      const { data, error } = await supabaseClient.rpc('duplicate_report_template', {
        p_template_id: duplicateModal.id,
        p_new_name: newName,
        p_user_id: user.id
      });
      if (error) throw error;
      toast.success("Template berhasil diduplikasi!");
      setDuplicateModal({ isOpen: false, id: "", name: "" });
      tableQueryResult.refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menduplikasi: " + error.message);
    } finally {
      setIsDuplicating(false);
    }
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Nama Template",
        cell: function render({ getValue }) {
          return <span className="font-semibold text-foreground">{getValue<string>()}</span>;
        },
      },
      {
        id: "report_type",
        accessorKey: "report_type",
        header: "Jenis Rapor",
        cell: function render({ getValue }) {
          const type = getValue<string>();
          return <span className="text-xs font-medium uppercase text-muted-foreground">{type?.replace(/_/g, ' ')}</span>;
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
        id: "status",
        accessorKey: "is_active",
        header: "Status",
        cell: function render({ getValue }) {
          const isActive = getValue<boolean>();
          return isActive ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border bg-slate-50 text-slate-700 border-slate-200">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Nonaktif
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
                onClick={() => navigate(`/reports/templates/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDuplicateModal({ isOpen: true, id: getValue() as string, name: row.original.name })}
                className="p-1.5 text-muted-foreground hover:text-amber-600 transition-colors rounded-md hover:bg-amber-50"
                title="Duplikasi"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/reports/templates/edit/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Ubah Data"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: getValue() as string, name: row.original.name })}
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
      resource: "report_templates",
      filters: {
        permanent: buildFilters(),
      },
      sorters: {
        initial: [
          { field: "created_at", order: "desc" }
        ]
      },
      meta: {
        select: "*, units(name)",
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Template Rapor"
        description="Kelola struktur, format, dan komponen penilaian rapor digital siswa."
        action={
          <Link
            to="/reports/templates/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Template
          </Link>
        }
      />

      {/* Advanced Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 font-medium"
          />
        </div>

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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jenis Rapor</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Jenis</option>
              <option value="progress_awal">Progress Awal</option>
              <option value="progress_tengah">Progress Tengah</option>
              <option value="rapor_semester">Rapor Semester</option>
              <option value="rapor_program_khusus">Program Khusus</option>
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterUnit(""); setFilterType(""); setFilterActive(""); }}
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
            </div>
            <p className="animate-pulse">Memuat data template...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Edit className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Belum ada template rapor.</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Buat struktur rapor terlebih dahulu dengan menentukan bagian-bagian (sections) dan komponen penilaiannya.
            </p>
            <Link
              to="/reports/templates/create"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Buat Template Baru
            </Link>
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
                {[10, 20, 30].map((pageSize) => (
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

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        templateName={deleteModal.name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        isDeleting={isDeleting}
      />

      <DuplicateModal
        isOpen={duplicateModal.isOpen}
        templateName={duplicateModal.name}
        onConfirm={handleDuplicate}
        onCancel={() => setDuplicateModal({ isOpen: false, id: "", name: "" })}
        isDuplicating={isDuplicating}
      />
    </div>
  );
};
