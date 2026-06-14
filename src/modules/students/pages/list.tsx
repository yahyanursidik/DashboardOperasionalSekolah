import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Plus, Search, FilterX } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

// Helper function to calculate completeness
export const calculateCompleteness = (student: any) => {
  const fields = [
    "full_name", "gender", "unit_id", "nis", 
    "nisn", "class_id", "birth_place", "date_of_birth", "address"
  ];
  const filled = fields.filter(f => student[f] !== null && student[f] !== "").length;
  return Math.round((filled / fields.length) * 100);
};

export const StudentsList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  // Local Filter State
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  const buildFilters = () => {
    const filters: any[] = [];
    if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    if (filterClass) filters.push({ field: "class_id", operator: "eq", value: filterClass });
    if (filterGender) filters.push({ field: "gender", operator: "eq", value: filterGender });
    if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
    return filters;
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Siswa",
        cell: function render({ row, getValue }) {
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{getValue<string>()}</span>
              {row.original.nickname && (
                <span className="text-xs text-muted-foreground">Panggilan: {row.original.nickname}</span>
              )}
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
        id: "class",
        accessorKey: "classes.name",
        header: "Kelas",
        cell: function render({ row }) {
          return <span className="font-medium">{row.original.classes?.name || "Belum ada"}</span>;
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: function render({ getValue }) {
          const status = getValue<string>();
          const colors: Record<string, string> = {
            active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
            graduated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            transferred: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
            dropped_out: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          };
          const labels: Record<string, string> = {
            active: "Aktif",
            inactive: "Nonaktif",
            graduated: "Lulus",
            transferred: "Pindah",
            dropped_out: "Dikeluarkan",
          };
          return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.active}`}>
              {labels[status] || status}
            </span>
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
        cell: function render({ getValue }) {
          return (
            <div className="flex items-center gap-2">
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
          <Link
            to="/students/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Siswa Baru
          </Link>
        }
      />

      {/* Advanced Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="graduated">Lulus</option>
            <option value="transferred">Pindah</option>
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jenis Kelamin</label>
          <select 
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">Semua (Ikhwan & Akhawat)</option>
            <option value="L">Ikhwan</option>
            <option value="P">Akhawat</option>
          </select>
        </div>
        <button 
          onClick={() => { setFilterClass(""); setFilterGender(""); setFilterStatus(""); }}
          className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
        >
          <FilterX className="w-4 h-4" />
          Reset
        </button>
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
    </div>
  );
};
