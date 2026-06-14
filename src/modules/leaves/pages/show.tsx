import React from "react";
import { useOne, useUpdate, useGetIdentity } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, CheckCircle, XCircle, Calendar, FileText, User, Paperclip } from "lucide-react";
import { toast } from "sonner";

export const LeaveShow: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: identity } = useGetIdentity<any>();
  const { mutate: updateLeave, isLoading: isUpdating } = useUpdate();
  
  const { data, isLoading } = useOne({
    resource: "leave_requests",
    id: id as string,
    meta: { select: "*, employees(full_name, position, phone_number, nip)" }
  });

  const leave = data?.data;

  const handleStatusUpdate = (newStatus: 'approved' | 'rejected') => {
    if (!confirm(`Apakah Anda yakin ingin ${newStatus === 'approved' ? 'MENYETUJUI' : 'MENOLAK'} pengajuan ini?`)) return;

    updateLeave({
      resource: "leave_requests",
      id: id as string,
      values: {
        status: newStatus,
        approved_by: identity?.id || null // This assumes identity.id is the auth.users(id)
      },
      successNotification: () => ({ message: `Pengajuan berhasil ${newStatus === 'approved' ? 'disetujui' : 'ditolak'}`, type: "success" })
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat detail pengajuan...</div>;
  if (!leave) return <div className="p-8 text-center text-red-500">Data pengajuan tidak ditemukan.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Detail Pengajuan Izin/Cuti"
        description={`Diajukan pada ${formatDate(leave.created_at)}`}
        action={
          <button
            onClick={() => navigate("/leaves")}
            className="flex items-center gap-2 border bg-card hover:bg-muted text-foreground px-4 py-2 rounded-md transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Info Pegawai */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 border-b pb-2"><User className="w-4 h-4 text-primary"/> Pemohon</h3>
            
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Nama Lengkap</p>
              <p className="font-semibold">{leave.employees?.full_name}</p>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">NIP / ID</p>
              <p className="font-medium">{leave.employees?.nip || '-'}</p>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Posisi</p>
              <p className="font-medium capitalize">{leave.employees?.position?.replace('_', ' ')}</p>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Kontak</p>
              <p className="font-medium">{leave.employees?.phone_number || '-'}</p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Detail Cuti & Action */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary"/> Rincian Pengajuan</h3>
              {leave.status === 'pending' ? (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">MENUNGGU PERSETUJUAN</span>
              ) : leave.status === 'approved' ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">DISETUJUI</span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">DITOLAK</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Tipe Izin</p>
                <p className="font-semibold text-lg capitalize">{leave.leave_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Durasi / Tanggal</p>
                <p className="font-semibold text-primary">{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Alasan / Keterangan</p>
              <p className="text-sm bg-muted/10 p-3 border rounded-md whitespace-pre-wrap">{leave.reason}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Dokumen Lampiran</p>
              {leave.proof_document ? (
                <a 
                  href={leave.proof_document} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-medium border border-blue-200 transition-colors"
                >
                  <Paperclip className="w-4 h-4" /> Lihat Dokumen (Buka di Tab Baru)
                </a>
              ) : (
                <p className="text-sm text-muted-foreground italic">Tidak ada dokumen yang dilampirkan.</p>
              )}
            </div>
            
            {/* Action Buttons for HRD/Admin */}
            {leave.status === 'pending' && (
              <div className="pt-6 mt-6 border-t flex gap-4">
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-bold shadow-sm disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" /> SETUJUI
                </button>
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors font-bold shadow-sm disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" /> TOLAK
                </button>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
};
