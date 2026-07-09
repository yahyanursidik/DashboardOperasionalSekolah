import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Edit, Plus, Trash2, ArrowLeft, Users, Eye, BookOpen, Layers3, CalendarDays, FileText } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SD_PHASES } from "../subject-curriculums/sdCurriculumStructure";

export const SubjectsList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: deleteSubject } = useDelete();
  const [filterCategory, setFilterCategory] = useState("");

  const { data: unitsData } = useList({ resource: "units", pagination: { mode: "off" } });

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Nama Mata Pelajaran",
        cell: function render({ getValue }) {
          return <span className="font-semibold">{getValue<string>()}</span>;
        },
      },
      {
        id: "code",
        accessorKey: "code",
        header: "Kode",
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Kategori",
        cell: function render({ getValue }) {
          const cat = getValue<string>();
          let color = "bg-slate-100 text-slate-700";
          if (cat === "Nasional") color = "bg-blue-100 text-blue-700 border border-blue-200";
          if (cat === "Khas Sekolah") color = "bg-emerald-100 text-emerald-700 border border-emerald-200";
          return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>{cat}</span>;
        },
      },
      {
        id: "grade_levels",
        accessorKey: "grade_levels",
        header: "Fase / Kelas",
        cell: function render({ getValue }) {
          const grades = getValue<number[]>();
          if (!grades || grades.length === 0) return <span className="text-muted-foreground">-</span>;
          const sortedGrades = grades.map(Number).sort((a, b) => a - b);
          const activePhases = SD_PHASES.filter((phase) => phase.grades.some((grade) => sortedGrades.includes(grade)));
          return (
            <div className="flex flex-wrap gap-1.5">
              {activePhases.map((phase) => (
                <span key={phase.id} className="rounded-md border bg-primary/5 px-2 py-1 text-xs font-semibold text-primary">
                  {phase.label}: {phase.grades.filter((grade) => sortedGrades.includes(grade)).join(", ")}
                </span>
              ))}
            </div>
          );
        }
      },
      {
        id: "semesters",
        accessorKey: "semesters",
        header: "Semester",
        cell: function render({ getValue }) {
          const sems = getValue<string[]>();
          if (!sems || sems.length === 0) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex gap-1 flex-wrap">
              {sems.map(s => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                  {s}
                </span>
              ))}
            </div>
          );
        }
      },
      {
        id: "unit",
        accessorKey: "units.name",
        header: "Unit",
        cell: function render({ row }) {
          return row.original.units?.name || "-";
        },
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: "Status",
        cell: function render({ getValue }) {
          return getValue() ? (
            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-200">Aktif</span>
          ) : (
            <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-200">Nonaktif</span>
          );
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
                onClick={() => navigate(`/curriculum/subjects/show/${id}`)}
                className="p-1.5 text-muted-foreground hover:text-emerald-600 transition-colors rounded-md hover:bg-emerald-50"
                title="Buka Kurikulum"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/curriculum/subjects/edit/${id}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Edit Mapel"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) {
                    deleteSubject(
                      { resource: "subjects", id },
                      {
                        onSuccess: () => {
                          toast.success("Mata pelajaran berhasil dihapus");
                        },
                        onError: (error) => {
                          toast.error("Gagal menghapus mata pelajaran: " + error.message);
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
    [navigate, deleteSubject]
  );

  const filters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (filterCategory) filters.push({ field: "category", operator: "eq", value: filterCategory });

  const { refineCore: { tableQueryResult }, getHeaderGroups, getRowModel } = useTable({
    columns,
    refineCoreProps: {
      resource: "subjects",
      meta: { select: "*, units(name)" },
      filters: { permanent: filters as any },
      sorters: { permanent: [{ field: "name", order: "asc" }] },
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
          title="Mata Pelajaran & Kurikulum SD"
          description="Kelola mapel, CP/ATP per fase, dan perangkat ajar per kelas sesuai alur Kurikulum Merdeka."
          action={
            <div className="flex gap-2">
              <Link
                to="/curriculum/subjects/directory"
                className="flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-muted transition-colors font-medium text-sm"
              >
                <Users className="w-4 h-4" />
                Direktori Mapel → Guru
              </Link>
              <Link
                to="/curriculum/subjects/create"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Mapel
              </Link>
            </div>
          }
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" />
              Alur Kurikulum SD
            </div>
            <h2 className="mt-3 text-2xl font-bold">Mulai dari fase, turun ke kelas</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Setiap mapel memiliki CP dan ATP untuk Fase A, B, atau C. Prota, Promes, RPPM, dan RPPH/Modul Ajar dibuat mandiri sesuai kelas dan tahun ajaran.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {SD_PHASES.map((phase) => (
              <div key={phase.id} className="rounded-lg border bg-muted/20 p-4">
                <p className="text-lg font-bold">{phase.label}</p>
                <p className="text-sm font-semibold text-primary">{phase.rangeLabel}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">CP dan ATP satu fase, perangkat ajar per kelas.</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-background p-3">
            <BookOpen className="mb-2 h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">CP & ATP Fase</p>
            <p className="text-xs text-muted-foreground">Arah capaian satu fase.</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <Layers3 className="mb-2 h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Prota & Promes</p>
            <p className="text-xs text-muted-foreground">Pemetaan kelas dan semester.</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <CalendarDays className="mb-2 h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">RPPM</p>
            <p className="text-xs text-muted-foreground">Rencana mingguan.</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <FileText className="mb-2 h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">RPPH / Modul</p>
            <p className="text-xs text-muted-foreground">Rencana per pertemuan.</p>
          </div>
        </div>
      </section>

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Kategori</option>
          <option value="Nasional">Nasional (Kurikulum Merdeka)</option>
          <option value="Khas Sekolah">Khas Sekolah</option>
          <option value="Lainnya">Lainnya</option>
        </select>
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
            <tbody className="divide-y divide-border">
              {getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                    Belum ada mata pelajaran yang ditambahkan.
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
