import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Filter, Calendar, Trash2, Edit, UserMinus, UserCheck, BookOpen, Clock, Search, ChevronLeft, ChevronRight, SearchX, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Modal Komponen Lokal
const ConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Hapus Penugasan?</h4>
            <p className="text-sm text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus data penugasan ini?
            </p>
          </div>
          <div className="flex gap-3 pt-4">
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
  const [filterStatus, setFilterStatus] = useState("");

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "substitute_assignments",
    // We need to fetch both absent and substitute employee details
    // PostgREST syntax for fetching two foreign keys to the same table:
    // absent_employee_id(full_name), substitute_employee_id(full_name)
    // Refine supports this via select
    meta: { select: "*, absent:absent_employee_id(full_name), substitute:substitute_employee_id(full_name), classes(name)" },
    sorters: [
      { field: "date", order: "desc" },
      { field: "start_time", order: "asc" }
    ],
    pagination: { mode: "off" }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset ke halaman 1 jika filter berubah
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDate]);

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
        onSettled: () => setIsDeleting(false)
      }
    );
  };

  // Client-side filtering
  const filteredData = React.useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item: any) => {
      const searchLower = searchTerm.toLowerCase();
      const absentName = item.absent?.full_name?.toLowerCase() || '';
      const substituteName = item.substitute?.full_name?.toLowerCase() || '';
      const subjectName = item.subject?.toLowerCase() || '';
      const notesDesc = item.notes?.toLowerCase() || '';

      const matchSearch = searchTerm === "" ? true : (
        absentName.includes(searchLower) || 
        substituteName.includes(searchLower) || 
        subjectName.includes(searchLower) ||
        notesDesc.includes(searchLower)
      );

      const matchStatus = filterStatus ? item.status === filterStatus : true;
      const matchDate = filterDate ? item.date === filterDate : true;

      return matchSearch && matchStatus && matchDate;
    });
  }, [data?.data, searchTerm, filterStatus, filterDate]);

  // Pagination
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guru Inval / Pengganti"
        description="Kelola penugasan guru pengganti untuk kelas yang kosong."
        action={
          <Link
            to="/substitutes/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Tugaskan Inval
          </Link>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari guru, pelajaran, atau catatan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative w-full md:w-48 shrink-0">
            <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input 
              type="date" 
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
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

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border-b last:border-0 animate-pulse">
                <div className="h-10 w-24 bg-muted/50 rounded"></div>
                <div className="flex-1 h-10 bg-muted/50 rounded"></div>
                <div className="flex-1 h-10 bg-muted/50 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-16">
            <SearchX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-foreground">Tidak ada penugasan guru inval</p>
            <p className="text-sm text-muted-foreground mt-1">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Waktu & Kelas</th>
                <th className="px-6 py-4">Penugasan (Guru Absen ➔ Pengganti)</th>
                <th className="px-6 py-4">Pelajaran & Catatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {formatDate(item.date)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                        <UserMinus className="w-3.5 h-3.5" /> 
                        <span className="line-through opacity-70">{item.absent?.full_name || 'Guru Dihapus'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-700 font-bold">
                        <UserCheck className="w-4 h-4" /> 
                        {item.substitute?.full_name || 'Guru Dihapus'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" /> 
                        {item.subject} (Kelas {item.classes?.name || '-'})
                      </span>
                      {item.notes && <span className="text-xs text-muted-foreground bg-muted/30 p-1.5 rounded line-clamp-2">{item.notes}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'scheduled' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-md">Dijadwalkan</span>}
                    {item.status === 'completed' && <span className="px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 text-xs font-semibold rounded-md">Selesai</span>}
                    {item.status === 'cancelled' && <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-md">Dibatalkan</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/substitutes/edit/${item.id}`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Ubah Status/Detail"
                      ><Edit className="w-4 h-4"/></button>
                      <button 
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus Penugasan"
                      ><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-muted/10 border-t px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} data
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};
