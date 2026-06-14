import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { FileText, Plus, Filter, Calendar, Trash2, Eye, User, FileSignature } from "lucide-react";

export const LeavesList: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: deleteLeave } = useDelete();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
  if (filterType) filters.push({ field: "leave_type", operator: "eq", value: filterType });

  const { data, isLoading } = useList({
    resource: "leave_requests",
    meta: { select: "*, employees(full_name, position)" },
    filters,
    sorters: [
      { field: "created_at", order: "desc" }
    ],
    pagination: { pageSize: 50 }
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md">Disetujui</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md">Ditolak</span>;
      default:
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-md">Menunggu</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengajuan Izin & Cuti"
        description="Kelola dan berikan persetujuan untuk pengajuan cuti atau izin sakit pegawai."
        action={
          <Link
            to="/leaves/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Ajukan Izin
          </Link>
        }
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none"
        >
          <option value="">Semua Status</option>
          <option value="pending">Menunggu Persetujuan</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>

        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none"
        >
          <option value="">Semua Tipe Izin</option>
          <option value="sakit">Sakit</option>
          <option value="izin">Izin Pribadi</option>
          <option value="cuti_tahunan">Cuti Tahunan</option>
          <option value="cuti_melahirkan">Cuti Melahirkan</option>
          <option value="dinas_luar">Dinas Luar</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Tgl Pengajuan</th>
                <th className="px-6 py-4">Pegawai</th>
                <th className="px-6 py-4">Tipe & Durasi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((leave) => (
                <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {formatDate(leave.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{leave.employees?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{leave.employees?.position?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-medium capitalize text-foreground">
                        <FileSignature className="w-3.5 h-3.5 text-blue-500" />
                        {leave.leave_type?.replace('_', ' ')}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(leave.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => navigate(`/leaves/show/${leave.id}`)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Lihat Detail & Proses"
                    ><Eye className="w-4 h-4"/></button>
                    {leave.status === 'pending' && (
                      <button 
                        onClick={() => { if(confirm('Hapus pengajuan ini?')) deleteLeave({ resource: "leave_requests", id: leave.id as string }) }}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors ml-1"
                        title="Hapus Pengajuan"
                      ><Trash2 className="w-4 h-4"/></button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">Tidak ada data pengajuan izin.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
