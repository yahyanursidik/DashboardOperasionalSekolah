import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Users, Trash2, Edit, Search, BookOpen, Clock } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";
import { toast } from "sonner";

export const HalaqohsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [search, setSearch] = useState("");
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", name: "" });

  const { data, isLoading, refetch, isError, error } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "program_type", operator: "eq" as const, value: "tahfidz" },
      ...(search ? [{ field: "name", operator: "contains" as const, value: search }] : [])
    ],
    sorters: [
      { field: "name", order: "asc" }
    ],
    pagination: {
      mode: "server",
      pageSize: 500
    },
    meta: {
      select: "*, employees(full_name)"
    }
  });

  const records = data?.data || [];

  const confirmDelete = () => {
    deleteMutate({
      resource: "tahfidz_halaqohs",
      id: deleteModal.id,
    }, {
      onSuccess: () => {
        toast.success("Halaqoh berhasil dihapus");
        setDeleteModal({ isOpen: false, id: "", name: "" });
        refetch();
      },
      onError: () => {
        toast.error("Gagal menghapus halaqoh");
        setDeleteModal({ isOpen: false, id: "", name: "" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        onConfirm={confirmDelete}
        title="Hapus Halaqoh"
        message={`Apakah Anda yakin ingin menghapus halaqoh "${deleteModal.name}"? Semua data anggota di dalamnya juga akan terhapus.`}
      />

      <PageHeader
        title="Data Halaqoh Tahfidz"
        description="Kelola kelompok halaqoh tahfidz dan muhaffizh/guru pengampunya."
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari nama halaqoh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        <Link
          to="/tahfidz-halaqohs/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Halaqoh
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Nama Halaqoh</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Muhaffizh / Guru</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Jadwal</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Deskripsi</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p>Memuat data halaqoh...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 opacity-50" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">Belum ada halaqoh</h3>
                      <p className="max-w-sm mb-4">Belum ada data halaqoh pada semester ini atau kata kunci pencarian tidak ditemukan.</p>
                      {!search && (
                        <Link
                          to="/tahfidz-halaqohs/create"
                          className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> Buat Halaqoh Pertama
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/tahfidz-halaqohs/show/${record.id}`} className="font-bold text-gray-900 hover:text-primary transition-colors">
                        {record.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {record.employees?.full_name ? (
                        <Link to={`/employees/show/${record.employee_id}`} className="hover:text-primary transition-colors">
                          {record.employees.full_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {record.schedule_day || record.schedule_time ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{record.schedule_day || "-"}, {record.schedule_time || "-"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground truncate max-w-[200px]" title={record.description}>
                      {record.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/tahfidz-halaqohs/show/${record.id}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Kelola Anggota"
                        >
                          <Users className="w-4 h-4" /> <span className="text-xs font-medium">Anggota</span>
                        </Link>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <Link
                          to={`/tahfidz-halaqohs/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Halaqoh"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, id: record.id as string, name: record.name })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Halaqoh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
