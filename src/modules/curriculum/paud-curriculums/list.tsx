import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Edit, Plus, Trash2, ArrowLeft, Palette } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

export const PaudThemeList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: deleteTheme } = useDelete();

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "grade_level",
        accessorKey: "grade_level",
        header: "Tingkat/Kelompok",
        cell: function render({ getValue }) {
          const val = getValue<number>();
          let label = `Level ${val}`;
          if (val === 0) label = "TK A";
          if (val === 1) label = "TK B";
          if (val === -1) label = "KB (Kelompok Bermain)";
          return <span className="font-semibold text-primary">{label}</span>;
        },
      },
      {
        id: "academic_year",
        accessorKey: "academic_years.name",
        header: "Tahun Ajaran",
        cell: function render({ row }) {
          return row.original.academic_years?.name || "-";
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ getValue }) {
          const id = getValue<string>();
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/curriculum/paud/edit/${id}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Edit Kurikulum"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus kurikulum ini?")) {
                    deleteTheme(
                      { resource: "paud_curriculums", id },
                      {
                        onSuccess: () => {
                          toast.success("Kurikulum PAUD berhasil dihapus");
                        },
                        onError: (error) => {
                          toast.error("Gagal menghapus kurikulum PAUD: " + error.message);
                        }
                      }
                    );
                  }
                }}
                className="p-1.5 text-muted-foreground hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate, deleteTheme]
  );

  const filters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });

  const { getHeaderGroups, getRowModel } = useTable({
    columns,
    refineCoreProps: {
      resource: "paud_curriculums",
      meta: { select: "*, academic_years(name)" },
      filters: { permanent: filters as any },
      sorters: { permanent: [{ field: "grade_level", order: "asc" }, { field: "created_at", order: "asc" }] },
      pagination: { pageSize: 50 }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title="Manajemen Kurikulum PAUD"
          description="Kelola daftar Kurikulum (ATP, Prota, Promes, RPPM, RPPH) untuk tingkat PAUD/TK/KB."
          action={
            <Link
              to="/curriculum/paud/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Kurikulum Baru
            </Link>
          }
        />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              {getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4 font-medium">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-rose-50">
              {getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-rose-50/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center text-rose-300">
                    <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada kurikulum PAUD yang ditambahkan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
