import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Plus, Trash2, ArrowLeft, ExternalLink, Download } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

const DOCUMENT_TYPES = [
  "SK Kurikulum",
  "Panduan Kurikulum",
  "Template",
  "Referensi",
  "PDF Final",
  "Lainnya",
];

const TYPE_STYLES: Record<string, string> = {
  "SK Kurikulum": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Panduan Kurikulum": "bg-blue-100 text-blue-700 border-blue-200",
  Template: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Referensi: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "PDF Final": "bg-rose-100 text-rose-700 border-rose-200",
  Lainnya: "bg-slate-100 text-slate-700 border-slate-200",
  "Modul Ajar": "bg-amber-100 text-amber-700 border-amber-200",
  ATP: "bg-amber-100 text-amber-700 border-amber-200",
  CP: "bg-amber-100 text-amber-700 border-amber-200",
};

export const CurriculumDocumentsList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { mutate: deleteDocument } = useDelete();

  const [filterType, setFilterType] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const { data: subjectsData } = useList({ 
    resource: "subjects", 
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" } 
  });

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Judul Arsip / Lampiran",
        cell: function render({ getValue, row }) {
          return (
            <div>
              <p className="font-semibold">{getValue<string>()}</p>
              <p className="text-xs text-muted-foreground">{row.original.description || "-"}</p>
            </div>
          );
        },
      },
      {
        id: "type",
        accessorKey: "document_type",
        header: "Jenis",
        cell: function render({ getValue }) {
          const type = getValue<string>();
          const color = TYPE_STYLES[type] || TYPE_STYLES.Lainnya;
          return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>{type}</span>;
        },
      },
      {
        id: "subject",
        accessorKey: "subjects.name",
        header: "Mapel Terkait",
        cell: function render({ row }) {
          return row.original.subjects?.name || <span className="text-muted-foreground italic">Umum</span>;
        },
      },
      {
        id: "class",
        accessorKey: "classes.name",
        header: "Kelas Terkait",
        cell: function render({ row }) {
          return row.original.classes?.name || <span className="text-muted-foreground italic">Semua Kelas</span>;
        },
      },
      {
        id: "file",
        header: "Akses",
        cell: function render({ row }) {
          return (
            <div className="flex gap-2">
              {row.original.drive_link && (
                <a href={row.original.drive_link} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Buka Tautan Google Drive">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {row.original.file_url && (
                <a href={row.original.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100" title="Unduh File Berkas">
                  <Download className="w-4 h-4" />
                </a>
              )}
              {!row.original.drive_link && !row.original.file_url && (
                <span className="text-xs text-muted-foreground italic">Tidak ada lampiran</span>
              )}
            </div>
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
                onClick={() => {
                  if (confirm("Hapus dokumen ini secara permanen?")) {
                    deleteDocument(
                      { resource: "curriculum_documents", id },
                      {
                        onSuccess: () => {
                          toast.success("Dokumen berhasil dihapus");
                        },
                        onError: (error) => {
                          toast.error("Gagal menghapus dokumen: " + error.message);
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
    [deleteDocument]
  );

  const filters = [];
  if (activeUnitId) filters.push({ field: "subjects.unit_id", operator: "eq", value: activeUnitId }); // Note: requires subjects relation to filter properly if document is tied to subject. For general docs, this might filter them out. We might need client-side filtering if they are global.
  if (filterType) filters.push({ field: "document_type", operator: "eq", value: filterType });
  if (filterSubject) filters.push({ field: "subject_id", operator: "eq", value: filterSubject });

  const { refineCore: { tableQueryResult }, getHeaderGroups, getRowModel } = useTable({
    columns,
    refineCoreProps: {
      resource: "curriculum_documents",
      meta: { select: "*, subjects(name, unit_id), classes(name)" },
      filters: { permanent: filters as any },
      sorters: { permanent: [{ field: "created_at", order: "desc" }] },
      pagination: { pageSize: 50 }
    },
  });

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title="Arsip & Lampiran Kurikulum"
          description="Simpan file pendukung kurikulum seperti SK, panduan, template, referensi, dan PDF final. Penyusunan CP, ATP, Prota, Promes, RPPM, dan RPPH dilakukan dari Kurikulum Per Kelas."
          action={
            <Link
              to="/curriculum/documents/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Lampiran
            </Link>
          }
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="font-semibold">Untuk arsip pendukung</p>
            <p className="mt-1 text-sm text-muted-foreground">SK, panduan, template, referensi, dan PDF final.</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="font-semibold">Bukan form penyusunan</p>
            <p className="mt-1 text-sm text-muted-foreground">CP/ATP dan perangkat ajar tetap diisi per kelas dan mapel.</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="font-semibold">Opsional per mapel/kelas</p>
            <p className="mt-1 text-sm text-muted-foreground">Kosongkan relasi jika dokumen berlaku umum.</p>
          </div>
        </div>
      </section>

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Jenis Dokumen</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select 
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Mapel / Umum</option>
          {subjectsData?.data?.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat dokumen...</div>
        ) : (
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
                {getRowModel().rows.map((row) => {
                  // Apply client side filter for unit safety
                  const doc = row.original;
                  if (activeUnitId && doc.subjects && doc.subjects.unit_id !== activeUnitId) return null;

                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p>Belum ada arsip atau lampiran kurikulum.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
