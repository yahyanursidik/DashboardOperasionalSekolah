import React, { useMemo, useState } from "react";
import { useDelete, useList } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  SearchX,
  Trash2,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatAssignmentDate,
  formatShortTime,
  formatSubstituteStatus,
  hasAssignmentOverlap,
  substituteStatusConfig,
  toDateInputValue,
} from "../substitute-utils";

const ConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-lg shadow-xl border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6 text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Hapus Penugasan?</h4>
            <p className="text-sm text-muted-foreground">Data penugasan inval akan dihapus dari arsip operasional.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubstitutesList: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: deleteAssignment } = useDelete();
  const today = toDateInputValue(new Date());
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 15;

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "substitute_assignments",
    meta: {
      select:
        "*, absent:absent_employee_id(full_name, position), substitute:substitute_employee_id(full_name, position), classes(name), leave_requests(id, leave_type, start_date, end_date, status)",
    },
    filters,
    sorters: [
      { field: "date", order: "desc" },
      { field: "start_time", order: "asc" },
    ],
    pagination: { mode: "off" },
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDate]);

  const assignments = data?.data ?? [];

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    assignments.forEach((first: any, index: number) => {
      assignments.slice(index + 1).forEach((second: any) => {
        if (first.status === "cancelled" || second.status === "cancelled") return;
        if (first.date !== second.date) return;
        if (first.substitute_employee_id !== second.substitute_employee_id) return;
        if (!hasAssignmentOverlap(first.start_time, first.end_time, second.start_time, second.end_time)) return;
        ids.add(first.id);
        ids.add(second.id);
      });
    });
    return ids;
  }, [assignments]);

  const metrics = useMemo(
    () => ({
      total: assignments.length,
      today: assignments.filter((item: any) => item.date === today && item.status !== "cancelled").length,
      scheduled: assignments.filter((item: any) => item.status === "scheduled").length,
      completed: assignments.filter((item: any) => item.status === "completed").length,
      linkedToLeave: assignments.filter((item: any) => !!item.leave_request_id).length,
      conflicts: conflictIds.size,
    }),
    [assignments, conflictIds, today]
  );

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return assignments.filter((item: any) => {
      const matchSearch =
        !keyword ||
        [
          item.absent?.full_name,
          item.substitute?.full_name,
          item.subject,
          item.notes,
          item.classes?.name,
          item.leave_requests?.leave_type,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const matchStatus = filterStatus ? item.status === filterStatus : true;
      const matchDate = filterDate ? item.date === filterDate : true;

      return matchSearch && matchStatus && matchDate;
    });
  }, [assignments, filterDate, filterStatus, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    deleteAssignment(
      { resource: "substitute_assignments", id: deleteConfirmId },
      {
        onSuccess: () => {
          toast.success("Penugasan berhasil dihapus");
          setDeleteConfirmId(null);
        },
        onError: () => toast.error("Gagal menghapus penugasan"),
        onSettled: () => setIsDeleting(false),
      }
    );
  };

  const renderStatus = (status: string) => {
    const config = substituteStatusConfig[status] ?? substituteStatusConfig.scheduled;
    return <span className={`px-2.5 py-1 border text-xs font-semibold rounded-md ${config.className}`}>{formatSubstituteStatus(status)}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guru Inval / Pengganti"
        description="Kelola penugasan pengganti agar kelas tetap berjalan saat guru berhalangan."
        action={
          <Link
            to="/substitutes/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Buat Penugasan
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total", value: metrics.total, icon: FileText, tone: "text-slate-700 bg-slate-100" },
          { label: "Hari Ini", value: metrics.today, icon: Calendar, tone: "text-blue-700 bg-blue-100" },
          { label: "Dijadwalkan", value: metrics.scheduled, icon: Clock, tone: "text-amber-700 bg-amber-100" },
          { label: "Selesai", value: metrics.completed, icon: CheckCircle2, tone: "text-green-700 bg-green-100" },
          { label: "Terkait Izin", value: metrics.linkedToLeave, icon: UserMinus, tone: "text-purple-700 bg-purple-100" },
          { label: "Konflik Jam", value: metrics.conflicts, icon: AlertTriangle, tone: "text-red-700 bg-red-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-col md:flex-row gap-3 bg-card p-4 rounded-lg border shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari guru, kelas, pelajaran, atau catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full md:w-48 shrink-0">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
              />
            </div>
            <div className="relative w-full md:w-48 shrink-0">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="scheduled">Dijadwalkan</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold">Definition of Done</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Guru pengganti tersedia tanpa bentrok jam.
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Kelas, mapel, dan instruksi mengajar jelas.
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Jika terkait izin/cuti, relasinya tercatat.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/leaves" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Izin & Cuti
            </Link>
            <Link to="/schedules" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Jadwal Pegawai
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border-b last:border-0 animate-pulse">
                <div className="h-10 w-24 bg-muted/50 rounded" />
                <div className="flex-1 h-10 bg-muted/50 rounded" />
                <div className="flex-1 h-10 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-16">
            <SearchX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-foreground">Tidak ada penugasan guru inval</p>
            <p className="text-sm text-muted-foreground mt-1">Coba sesuaikan kata kunci atau filter pencarian.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-5 py-4">Waktu & Kelas</th>
                <th className="px-5 py-4">Guru Absen</th>
                <th className="px-5 py-4">Guru Pengganti</th>
                <th className="px-5 py-4">Tugas Mengajar</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item: any) => {
                const hasConflict = conflictIds.has(item.id);
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors align-top">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {formatAssignmentDate(item.date)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}
                        </div>
                        {item.classes?.name && <p className="text-xs text-muted-foreground">Kelas {item.classes.name}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-red-700 font-medium">
                        <UserMinus className="w-4 h-4" />
                        <div>
                          <p>{item.absent?.full_name || "Pegawai tidak ditemukan"}</p>
                          <p className="text-[11px] text-muted-foreground uppercase">{(item.absent?.position || "pegawai").replace(/_/g, " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2 text-green-700 font-semibold">
                        <UserCheck className="w-4 h-4 mt-0.5" />
                        <div>
                          <p>{item.substitute?.full_name || "Pegawai tidak ditemukan"}</p>
                          {hasConflict && <p className="text-xs text-red-600 font-medium mt-1">Bentrok jadwal inval</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-[320px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          {item.subject || "-"}
                        </span>
                        {item.leave_request_id && <span className="text-xs text-purple-700">Terkait pengajuan izin/cuti</span>}
                        {item.notes && <span className="text-xs text-muted-foreground bg-muted/30 p-1.5 rounded line-clamp-2">{item.notes}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">{renderStatus(item.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/substitutes/edit/${item.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Ubah penugasan"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Hapus penugasan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="bg-muted/10 border-t px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} data
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} onConfirm={handleDelete} isDeleting={isDeleting} />
    </div>
  );
};
