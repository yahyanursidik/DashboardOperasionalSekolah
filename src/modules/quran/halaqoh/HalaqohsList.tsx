import React from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Users, Trash2, Edit } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const HalaqohsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  
  const { data, isLoading } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId }
    ],
    sorters: [
      { field: "name", order: "asc" }
    ],
    meta: {
      select: "*, employees(name)"
    }
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Halaqoh Tahfidz"
        description="Kelola kelompok halaqoh tahfidz dan muhaffizh/guru pengampunya."
      />

      <div className="flex justify-end">
        <Link
          to="/tahfidz-halaqohs/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Halaqoh
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Nama Halaqoh</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Muhaffizh / Guru</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Deskripsi</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada data halaqoh pada semester ini.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{record.name}</td>
                    <td className="px-6 py-4 font-medium">{record.employees?.name || "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{record.description || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/tahfidz-halaqohs/show/${record.id}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Kelola Anggota"
                        >
                          <Users className="w-4 h-4" /> Anggota
                        </Link>
                        <Link
                          to={`/tahfidz-halaqohs/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Hapus halaqoh ini?")) {
                              deleteMutate({
                                resource: "tahfidz_halaqohs",
                                id: record.id as string,
                              });
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
