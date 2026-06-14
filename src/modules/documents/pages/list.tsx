import React, { useState } from "react";
import { useList } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { FolderOpen, UploadCloud, Filter, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  belum_lengkap: { label: "Belum Lengkap", color: "bg-slate-100 text-slate-800", icon: AlertCircle },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", color: "bg-amber-100 text-amber-800 border border-amber-200", icon: Clock },
  valid: { label: "Valid", color: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: CheckCircle2 },
  perlu_revisi: { label: "Perlu Revisi", color: "bg-red-100 text-red-800 border border-red-200", icon: AlertCircle },
};

export const DocumentsList: React.FC = () => {
  const navigate = useNavigate();
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filters: any[] = [];
  if (filterOwner) filters.push({ field: "owner_type", operator: "eq", value: filterOwner });
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "documents",
    meta: { select: "*, document_types(name, category), uploaded:profiles!uploaded_by(full_name)" },
    filters,
    sorters: [{ field: "created_at", order: "desc" }]
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Vault"
        description="Pusat penyimpanan dan verifikasi dokumen digital sekolah."
        action={
          <Link
            to="/documents/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Dokumen
          </Link>
        }
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Pemilik</option>
          <option value="student">Siswa</option>
          <option value="employee">Pegawai / Guru</option>
          <option value="school">Sekolah / Yayasan</option>
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Status</option>
          <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
          <option value="valid">Valid</option>
          <option value="perlu_revisi">Perlu Revisi</option>
        </select>
        
        <Link to="/document-types" className="ml-auto text-sm text-primary hover:underline font-medium">
          Kelola Master Jenis Dokumen &rarr;
        </Link>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat vault...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">File Dokumen</th>
                <th className="px-6 py-4">Tipe Dokumen</th>
                <th className="px-6 py-4">Pemilik Data</th>
                <th className="px-6 py-4">Status Verifikasi</th>
                <th className="px-6 py-4">Tanggal Upload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((doc) => {
                const status = statusConfig[doc.status] || statusConfig['belum_lengkap'];
                const Icon = status.icon;
                return (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/documents/show/${doc.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FolderOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground leading-tight truncate max-w-[200px]" title={doc.file_name}>{doc.file_name}</p>
                          {doc.document_number && (
                            <p className="text-xs font-mono text-blue-600 mt-1">{doc.document_number}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            {doc.document_date ? `Tgl: ${new Date(doc.document_date).toLocaleDateString('id-ID')} • ` : ""}
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "Unknown Size"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{doc.document_types?.name}</span>
                      <p className="text-[10px] text-muted-foreground uppercase">{doc.document_types?.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 border text-xs rounded-md uppercase">{doc.owner_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center w-max gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md ${status.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <br/>Oleh: {doc.uploaded?.full_name?.split(' ')[0] || "Unknown"}
                    </td>
                  </tr>
                );
              })}
              {data?.data.length === 0 && (
                <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">Tidak ada dokumen di Vault yang sesuai filter.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
