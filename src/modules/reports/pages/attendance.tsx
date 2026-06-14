import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, FilterX, Download, ArrowLeft } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { exportToCsv } from "../../../lib/csv";

export const AttendanceReport: React.FC = () => {
  // Local Filter State
  const [filterClass, setFilterClass] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const buildFilters = () => {
    const filters: any[] = [];
    // Active unit filter can be joined if we had unit_id directly on attendance, but it's usually on students or classes.
    // Assuming attendance_records has class_id.
    if (filterClass) filters.push({ field: "class_id", operator: "eq", value: filterClass });
    if (startDate) filters.push({ field: "date", operator: "gte", value: startDate });
    if (endDate) filters.push({ field: "date", operator: "lte", value: endDate });
    return filters;
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "date",
        accessorKey: "date",
        header: "Tanggal",
      },
      {
        id: "student",
        accessorKey: "students.full_name",
        header: "Nama Siswa",
        cell: function render({ row }) {
          return row.original.students?.full_name || "-";
        },
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
      {
        id: "notes",
        accessorKey: "notes",
        header: "Catatan",
      },
    ],
    []
  );

  const { refineCore: { tableQueryResult }, ...table } = useTable({
    columns,
    refineCoreProps: {
      resource: "attendance_records",
      filters: {
        permanent: buildFilters(),
      },
      meta: {
        select: "*, students(full_name), classes(name)",
      },
      pagination: {
        mode: "off",
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;
  const data = tableQueryResult.data?.data || [];

  // Calculate Summary
  const summary = data.reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    acc.total++;
    return acc;
  }, { total: 0 });

  const handleExport = () => {
    const exportData = data.map(item => ({
      "Tanggal": item.date,
      "Nama Siswa": item.students?.full_name || "",
      "Kelas": item.classes?.name || "",
      "Status": item.status,
      "Catatan": item.notes || "",
    }));
    exportToCsv(exportData, `Laporan_Absensi_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/reports" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title="Laporan Absensi"
          description="Rekapitulasi kehadiran siswa berdasarkan rentang waktu."
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

      {/* Summary Cards */}
      {!isLoading && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{summary.total}</div>
            <div className="text-xs text-muted-foreground uppercase">Total Record</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.present || 0}</div>
            <div className="text-xs text-muted-foreground uppercase">Hadir</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{summary.sick || 0}</div>
            <div className="text-xs text-muted-foreground uppercase">Sakit</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.permission || 0}</div>
            <div className="text-xs text-muted-foreground uppercase">Izin</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.absent || 0}</div>
            <div className="text-xs text-muted-foreground uppercase">Alpa</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal Mulai</label>
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal Akhir</label>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
        <button 
          onClick={() => { setFilterClass(""); setStartDate(""); setEndDate(""); }}
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
            <p className="animate-pulse">Memuat laporan absensi...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Data Tidak Ditemukan</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tidak ada catatan absensi yang cocok dengan filter saat ini.
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
      </div>
    </div>
  );
};
