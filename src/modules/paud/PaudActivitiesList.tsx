import React from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Camera, Trash2, Edit } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";

export const PaudActivitiesList: React.FC = () => {
  const { mutate: deleteMutate } = useDelete();
  
  const { data, isLoading } = useList({
    resource: "paud_activities",
    sorters: [
      { field: "date", order: "desc" }
    ],
    meta: {
      select: "*, students(full_name), employees(full_name)"
    }
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jurnal Foto Kegiatan PAUD"
        description="Dokumentasi aktivitas pembelajaran dan kegiatan anak sehari-hari."
      />

      <div className="flex justify-end">
        <Link
          to="/paud-activities/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Kegiatan Baru
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground animate-pulse">Memuat data...</div>
      ) : records.length === 0 ? (
        <div className="bg-card border border-dashed rounded-xl p-10 text-center text-muted-foreground flex flex-col items-center">
          <Camera className="w-10 h-10 mb-3 opacity-20" />
          Belum ada jurnal foto kegiatan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map((record) => (
            <div key={record.id} className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-48 bg-muted relative overflow-hidden flex items-center justify-center">
                {record.photo_url ? (
                  <img src={record.photo_url} alt={record.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground/30" />
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-gray-700 shadow-sm">
                  {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{record.title}</h3>
                <p className="text-sm font-medium text-emerald-600 mb-3">{record.students?.full_name}</p>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{record.description}</p>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Oleh: {record.employees?.full_name || '-'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/paud-activities/edit/${record.id}`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        if (window.confirm("Hapus dokumentasi kegiatan ini?")) {
                          deleteMutate({
                            resource: "paud_activities",
                            id: record.id as string,
                          });
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
