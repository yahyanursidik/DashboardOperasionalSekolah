import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, FilterX, Download, ArrowLeft } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { exportToCsv } from "../../../lib/csv";

export const StudentReport: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();

  // Local Filter State
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const buildFilters = () => {
    const filters: any[] = [];
    if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    if (filterClass) filters.push({ field: "class_id", operator: "eq", value: filterClass });
    if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
    return filters;
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Siswa",
      },
      {
        id: "nis",
        accessorKey: "nis",
        header: "NIS",
      },
      {
        id: "gender",
        accessorKey: "gender",
        header: "L/P",
      },
      {
        id: "class",
        accessorKey: "classes.name",
        header: "Kelas",
        cell: function render({ row }) {
          return row.original.classes?.name || "-";
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
      },
    ],
    []
  );

  const { reactTable: table, refineCore: { tableQueryResult } } = useTable({
    columns,
    refineCoreProps: {
      resource: "students",
      filters: {
        permanent: buildFilters(),
      },
      meta: {
        select: "*, units(name), classes(name)",
      },
      pagination: {
        mode: "off", // Load all for report export, or handle server-side. For simplicity, off.
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;
  const data = tableQueryResult.data?.data || [];

  const handleExport = () => {
    const exportData = data.map(item => ({
      "Nama Lengkap": item.full_name,
      "NIS": item.nis,
      "NISN": item.nisn || "",
      "Jenis Kelamin": item.gender === "L" ? "Laki-laki" : "Perempuan",
      "Kelas": item.classes?.name || "",
      "Unit": item.units?.name || "",
      "Status": item.status,
    }));
    exportToCsv(exportData, `Laporan_Siswa_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/reports" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title="Laporan Siswa"
          description="Data lengkap siswa berdasarkan unit, kelas, dan status."
          action={
            <button
              onClick={handleExport}
              disabled={isLoading || data.length === 0}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          }
        />
      </div>

      {/* Filters */}
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
        <button 
          onClick={() => { setFilterClass(""); setFilterStatus(""); }}
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
            </div>
            <p className="animate-pulse">Memuat laporan siswa...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Data Tidak Ditemukan</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tidak ada siswa yang cocok dengan filter saat ini.
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
        <div className="px-6 py-4 border-t bg-muted/20 text-sm text-muted-foreground">
          Total: {data.length} baris
        </div>
      </div>
    </div>
  );
};
