import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { Eye, Edit, Plus, Search, FilterX, Trash2, AlertTriangle, Loader2, Calendar } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { getAssessmentBasisLabel, getReportTypeLabel } from "../../report-period-utils";

// --- DELETE CONFIRM MODAL ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  periodName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, periodName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Hapus Periode Rapor?</h3>
          <p className="text-muted-foreground text-sm">
            Apakah Anda yakin ingin menghapus periode <span className="font-semibold text-foreground">{periodName}</span>?
            Tindakan ini tidak dapat dibatalkan dan akan menghapus semua rapor terkait.
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

export const ReportPeriodsList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  // Local Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Delete State
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });

  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: academicYears } = useList({ resource: "academic_years", pagination: { mode: "off" } });
  const { data: semesters } = useList({ resource: "semesters", pagination: { mode: "off" }, filters: filterAcademicYear ? [{ field: "academic_year_id", operator: "eq", value: filterAcademicYear }] : [] });

  const buildFilters = () => {
    const filters: any[] = [];
    
    if (activeUnitId) {
      filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    } else if (filterUnit) {
      filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    }

    if (filterAcademicYear) filters.push({ field: "academic_year_id", operator: "eq", value: filterAcademicYear });
    if (filterSemester) filters.push({ field: "semester_id", operator: "eq", value: filterSemester });
    if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
    if (searchTerm) filters.push({ field: "name", operator: "ilike", value: `%${searchTerm}%` });
    
    return filters;
  };

  const handleDelete = () => {
    if (!deleteModal.id) return;
    deleteMutate(
      { resource: "report_periods", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success("Periode rapor berhasil dihapus!");
          setDeleteModal({ isOpen: false, id: "", name: "" });
          tableQueryResult.refetch();
        },
        onError: (error: any) => {
          console.error(error);
          toast.error("Gagal menghapus periode. Pastikan tidak ada data terkait.");
        }
      }
    );
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Nama Periode",
        cell: function render({ row, getValue }) {
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{getValue<string>()}</span>
              <span className="text-xs text-muted-foreground">{getReportTypeLabel(row.original.report_type)}</span>
              <span className="mt-1 w-fit rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{getAssessmentBasisLabel(row.original.assessment_basis)}</span>
            </div>
          );
        },
      },
      {
        id: "academic_period",
        header: "Tahun / Semester",
        cell: function render({ row }) {
          const ay = row.original.academic_years as any;
          const sm = row.original.semesters as any;
          const ayName = Array.isArray(ay) ? ay[0]?.name : ay?.name;
          const smName = Array.isArray(sm) ? sm[0]?.name : sm?.name;
          return (
            <div className="flex flex-col text-sm">
              <span className="font-medium">{ayName || "-"}</span>
              <span className="text-xs text-muted-foreground">Semester {smName || "-"}</span>
            </div>
          );
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
        id: "timeline",
        header: "Jadwal",
        cell: function render({ row }) {
          const startDate = row.original.input_start_date;
          const endDate = row.original.publish_date;
          
          if (!startDate || !endDate) return <span className="text-xs text-muted-foreground">-</span>;
          
          return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(new Date(startDate), "dd MMM", { locale: idLocale })} - {format(new Date(endDate), "dd MMM yy", { locale: idLocale })}</span>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: function render({ getValue }) {
          const status = getValue<string>();
          const styles: Record<string, { bg: string, text: string, border: string, dot: string, label: string }> = {
            draft: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", label: "Draft" },
            active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Aktif" },
            closed: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Ditutup" },
            archived: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500", label: "Diarsipkan" },
          };
          const style = styles[status] || styles.draft;
          return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
              {style.label}
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
                onClick={() => navigate(`/reports/periods/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/reports/periods/edit/${getValue()}`)}
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
      resource: "report_periods",
      filters: {
        permanent: buildFilters(),
      },
      sorters: {
        initial: [
          { field: "created_at", order: "desc" }
        ]
      },
      meta: {
        select: "*, units(name), academic_years(name), semesters(name)",
      }
    },
  });

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Periode Rapor"
        description="Kelola jadwal dan pembukaan akses rapor untuk guru dan orang tua."
        action={
          <Link
            to="/reports/periods/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Periode Baru
          </Link>
        }
      />

      {/* Advanced Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama periode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 font-medium"
          />
        </div>

        {/* Filter Dropdowns */}
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tahun Ajaran</label>
            <select value={filterAcademicYear} onChange={(e) => { setFilterAcademicYear(e.target.value); setFilterSemester(""); }} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Tahun Ajaran</option>
              {academicYears?.data?.map(ay => <option key={ay.id} value={ay.id as string}>{ay.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Semester</label>
            <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background" disabled={!filterAcademicYear}>
              <option value="">Semua Semester</option>
              {semesters?.data?.map(s => <option key={s.id} value={s.id as string}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="closed">Ditutup</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterUnit(""); setFilterAcademicYear(""); setFilterSemester(""); setFilterStatus(""); }}
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
            <p className="animate-pulse">Memuat data periode...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Belum ada periode rapor.</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Buat periode rapor terlebih dahulu sebelum menyusun template dan draft rapor siswa. Periode aktif akan digunakan guru untuk mengisi rapor.
            </p>
            <Link
              to="/reports/periods/create"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Buat Periode Sekarang
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

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        periodName={deleteModal.name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        isDeleting={isDeleting}
      />
    </div>
  );
};
