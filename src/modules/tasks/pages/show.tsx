import React from "react";
import { useShow, useUpdate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CheckSquare, Edit, ArrowLeft, Calendar, User, Building, Clock, AlertCircle, History } from "lucide-react";
import { AuditHistory } from "../../../components/common/AuditHistory";
import { Link, useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string, color: string }> = {
  belum_mulai: { label: "Belum Mulai", color: "bg-slate-100 border-slate-200 text-slate-800" },
  diproses: { label: "Diproses", color: "bg-blue-50 border-blue-200 text-blue-800" },
  menunggu_pihak_lain: { label: "Menunggu Pihak Lain", color: "bg-amber-50 border-amber-200 text-amber-800" },
  selesai: { label: "Selesai", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  ditunda: { label: "Ditunda", color: "bg-gray-100 border-gray-200 text-gray-800" },
};

const priorityConfig: Record<string, { label: string, color: string }> = {
  low: { label: "Rendah", color: "bg-slate-100 text-slate-700" },
  medium: { label: "Menengah", color: "bg-blue-100 text-blue-700" },
  high: { label: "Tinggi", color: "bg-amber-100 text-amber-700" },
  urgent: { label: "Mendesak", color: "bg-red-100 text-red-700 font-bold" },
};

export const TaskShow: React.FC = () => {
  const { queryResult } = useShow({
    meta: { select: "*, units(name), assigned:profiles!assigned_to(full_name), creator:profiles!created_by(full_name)" }
  });
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();
  const record = data?.data;

  const { mutate: updateTask } = useUpdate();

  const handleStatusChange = (newStatus: string) => {
    if (!record) return;
    updateTask({
      resource: "admin_tasks",
      id: record.id,
      values: { 
        status: newStatus,
        completed_at: newStatus === "selesai" ? new Date().toISOString() : null
      },
      successNotification: () => ({ message: "Status tugas diperbarui", type: "success" })
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded-xl"></div>
        <div className="h-64 bg-muted animate-pulse rounded-xl"></div>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-center text-muted-foreground">Tugas tidak ditemukan.</div>;
  }

  const isOverdue = record.due_date && new Date(record.due_date) < new Date() && record.status !== 'selesai';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Tugas"
        description="Informasi lengkap penugasan operasional."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/tasks")}
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <Link
              to={`/tasks/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Edit Tugas
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">{record.title}</h1>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusConfig[record.status].color}`}>
                    Status: {statusConfig[record.status].label}
                  </span>
                  <span className={`px-2.5 py-1 text-xs uppercase font-bold rounded-md ${priorityConfig[record.priority].color}`}>
                    Prioritas: {priorityConfig[record.priority].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {record.description || <span className="italic text-muted-foreground">Tidak ada deskripsi.</span>}
            </div>

            <div className="mt-8 pt-6 border-t flex flex-wrap gap-3">
              <h4 className="w-full text-sm font-semibold mb-2">Tindakan Cepat:</h4>
              {record.status !== 'belum_mulai' && (
                <button onClick={() => handleStatusChange('belum_mulai')} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium transition-colors">
                  Set Belum Mulai
                </button>
              )}
              {record.status !== 'diproses' && (
                <button onClick={() => handleStatusChange('diproses')} className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md font-medium transition-colors">
                  Sedang Diproses
                </button>
              )}
              {record.status !== 'menunggu_pihak_lain' && (
                <button onClick={() => handleStatusChange('menunggu_pihak_lain')} className="px-4 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md font-medium transition-colors">
                  Menunggu Konfirmasi
                </button>
              )}
              {record.status !== 'selesai' && (
                <button onClick={() => handleStatusChange('selesai')} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors">
                  Tandai Selesai
                </button>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 text-muted-foreground">
              <History className="w-4 h-4" /> Riwayat Aktivitas
            </h3>
            <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground">Audit log perubahan status akan muncul di sini.</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-base mb-4 border-b pb-2">Informasi Detail</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Ditugaskan Kepada</p>
                <p className="font-medium text-sm">{record.assigned?.full_name || "Belum ditugaskan"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Unit Terkait</p>
                <p className="font-medium text-sm">{record.units?.name || "Umum"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Tenggat Waktu (Due Date)</p>
                {record.due_date ? (
                  <p className={`font-medium text-sm flex items-center gap-2 ${isOverdue ? 'text-destructive' : ''}`}>
                    {new Date(record.due_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {isOverdue && <AlertCircle className="w-4 h-4" />}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Tidak ada tenggat</p>
                )}
                {isOverdue && <p className="text-xs text-destructive mt-1 font-medium">Tugas ini melewati batas waktu!</p>}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Dibuat Pada</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(record.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>

              {record.completed_at && (
                <div className="bg-emerald-50 p-3 rounded-md border border-emerald-100">
                  <p className="text-xs text-emerald-800 mb-1 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5"/> Diselesaikan Pada</p>
                  <p className="font-semibold text-sm text-emerald-700">
                    {new Date(record.completed_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </p>
                </div>
              )}
            </div>
          </div>
          <AuditHistory resource="admin_tasks" resourceId={record.id as string} />
        </div>
      </div>
    </div>
  );
};
