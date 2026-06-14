import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Plus, Search, Filter, BookOpen } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useSelect } from "@refinedev/core";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const ClassesList: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();

  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterYear, setFilterYear] = useState(activeYearId || "");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: yearOptions } = useSelect({ resource: "academic_years", optionLabel: "name", optionValue: "id" });

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
        accessorKey: "teachers.full_name",
        header: "Wali Kelas",
        cell: function render({ getValue }) {
          return getValue() || <span className="text-muted-foreground italic text-xs">Belum Ditentukan</span>;
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
        cell: function render({ getValue }) {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/classes/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Masuk Kelas"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/classes/edit/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Pengaturan Kelas"
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
      filters: {
        permanent: buildFilters(),
      },
      meta: {
        select: "*, units(name), teachers(full_name)"
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
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
