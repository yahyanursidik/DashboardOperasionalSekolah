import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Plus, Users, Search, Filter } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useSelect } from "@refinedev/core";

export const TeachersList: React.FC = () => {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState("");

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Pegawai",
        cell: function render({ row, getValue }) {
          const nip = row.original.nip;
          return (
            <div>
              <p className="font-semibold text-foreground">{getValue<string>()}</p>
              {nip && <p className="text-xs text-muted-foreground">NIP: {nip}</p>}
            </div>
          );
        },
      },
      {
        id: "role_title",
        accessorKey: "role_title",
        header: "Jabatan Utama",
        cell: function render({ getValue }) {
          return getValue() || "-";
        },
      },
      {
        id: "unit",
        accessorKey: "units.name",
        header: "Unit Utama",
        cell: function render({ getValue }) {
          return getValue() || "-";
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status Kepegawaian",
        cell: function render({ getValue, row }) {
          const val = getValue<string>();
          const isActive = row.original.is_active;
          
          let label = "Aktif";
          let color = "bg-green-100 text-green-800";
          if (val === "contract") { label = "Kontrak"; color = "bg-blue-100 text-blue-800"; }
          else if (val === "part_time") { label = "Part-time"; color = "bg-amber-100 text-amber-800"; }
          else if (val === "inactive") { label = "Nonaktif"; color = "bg-gray-100 text-gray-800"; }

          return (
            <div className="flex flex-col gap-1 items-start">
              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${color}`}>{label}</span>
              {!isActive && <span className="text-[10px] text-destructive font-medium border border-destructive px-2 py-0.5 rounded-full">Akun Suspend</span>}
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
                onClick={() => navigate(`/teachers/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/teachers/edit/${getValue()}`)}
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

  const buildFilters = () => {
    const filters: any[] = [];
    if (searchQuery) {
      filters.push({
        operator: "or",
        value: [
          { field: "full_name", operator: "ilike", value: `%${searchQuery}%` },
          { field: "nip", operator: "ilike", value: `%${searchQuery}%` },
          { field: "nickname", operator: "ilike", value: `%${searchQuery}%` }
        ]
      });
    }
    if (filterUnit) {
      filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    }
    if (filterStatus) {
      filters.push({ field: "status", operator: "eq", value: filterStatus });
    }
    if (filterGender) {
      filters.push({ field: "gender", operator: "eq", value: filterGender });
    }
    return filters;
  };

  const { reactTable: table, refineCore: { tableQueryResult } } = useTable({
    columns,
    refineCoreProps: {
      resource: "teachers",
      filters: {
        permanent: buildFilters(),
      },
      meta: {
        select: "*, units(name)"
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Direktori Guru & Pegawai"
        description="Kelola data pegawai, jabatan, dan akses sistem."
        action={
          <Link
            to="/teachers/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Pegawai
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
              placeholder="Cari berdasarkan nama atau NIP..."
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
            value={filterUnit} 
            onChange={(e) => setFilterUnit(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Unit</option>
            {unitOptions?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Status</option>
            <option value="active">Pegawai Tetap</option>
            <option value="contract">Pegawai Kontrak</option>
            <option value="part_time">Honorer</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <select 
            value={filterGender} 
            onChange={(e) => setFilterGender(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua Gender</option>
            <option value="L">Ikhwan</option>
            <option value="P">Akhawat</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
           <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground">Memuat data...</div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Tidak Ada Data Pegawai</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Belum ada data pegawai yang sesuai dengan filter.
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
