import React, { useState } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ShieldCheck, Filter } from "lucide-react";

export const AuditLogsList: React.FC = () => {
  const [filterResource, setFilterResource] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const filters: any[] = [];
  if (filterResource) filters.push({ field: "resource_name", operator: "eq", value: filterResource });
  if (filterAction) filters.push({ field: "action", operator: "eq", value: filterAction });

  const { data, isLoading } = useList({
    resource: "audit_logs",
    meta: { select: "*, profiles!user_id(full_name)" },
    filters,
    sorters: [{ field: "created_at", order: "desc" }]
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem Audit Log"
        description="Pantau seluruh perubahan data di dalam sistem."
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Resource</option>
          <option value="students">Siswa</option>
          <option value="teachers">Guru</option>
          <option value="classes">Kelas</option>
          <option value="attendance_records">Absensi</option>
          <option value="documents">Dokumen</option>
          <option value="announcements">Pengumuman</option>
          <option value="admin_tasks">Tasks</option>
        </select>
        
        <select 
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Aksi</option>
          <option value="create">Create (Tambah)</option>
          <option value="update">Update (Ubah)</option>
          <option value="delete">Delete (Hapus)</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat log sistem...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Pengguna</th>
                  <th className="px-6 py-4">Aksi</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4 max-w-xs">Data Berubah (JSON)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {log.profiles?.full_name || "Sistem"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border
                        ${log.action === 'create' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          log.action === 'delete' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200'}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                      {log.resource_name}
                      <br/>
                      <span className="text-[9px] opacity-70">ID: {log.resource_id?.substring(0,8)}...</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs overflow-hidden">
                      {log.new_values && (
                         <div className="text-[10px] font-mono text-slate-500 truncate" title={JSON.stringify(log.new_values)}>
                           New: {JSON.stringify(log.new_values)}
                         </div>
                      )}
                      {log.old_values && (
                         <div className="text-[10px] font-mono text-slate-400 truncate mt-1" title={JSON.stringify(log.old_values)}>
                           Old: {JSON.stringify(log.old_values)}
                         </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr><td colSpan={5} className="text-center p-12 text-muted-foreground flex items-center justify-center gap-2">
                    <ShieldCheck className="w-5 h-5"/> Tidak ada catatan audit.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
