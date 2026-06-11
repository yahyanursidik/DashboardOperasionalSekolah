import React from "react";
import { useLogList } from "@refinedev/core";
import { Clock, Edit, Plus, Trash2, ShieldAlert } from "lucide-react";

interface AuditHistoryProps {
  resource: string;
  resourceId: string;
}

const actionConfig: Record<string, { label: string, color: string, icon: any }> = {
  create: { label: "Dibuat", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: Plus },
  update: { label: "Diperbarui", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Edit },
  delete: { label: "Dihapus", color: "text-red-600 bg-red-50 border-red-200", icon: Trash2 },
};

export const AuditHistory: React.FC<AuditHistoryProps> = ({ resource, resourceId }) => {
  const { data, isLoading } = useLogList({
    resource,
    meta: { id: resourceId }
  });

  if (isLoading) return <div className="p-4 text-center animate-pulse text-muted-foreground text-sm">Memuat riwayat perubahan...</div>;

  const logs = data?.data || [];

  return (
    <div className="bg-card rounded-xl border shadow-sm mt-6">
      <div className="px-6 py-4 border-b flex items-center gap-2 bg-slate-50/50">
        <Clock className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Riwayat Perubahan (Audit Log)</h3>
      </div>
      
      {logs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
          <ShieldAlert className="w-6 h-6 opacity-50" />
          Belum ada riwayat perubahan yang tercatat.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {logs.map((log: any) => {
            const conf = actionConfig[log.action] || { label: log.action, color: "text-slate-600 bg-slate-100", icon: Clock };
            const Icon = conf.icon;
            
            return (
              <div key={log.id} className="p-4 px-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                <div className={`mt-0.5 p-1.5 rounded-md border ${conf.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-foreground">
                      <span className="capitalize">{log.profiles?.full_name || "Sistem"}</span> melakukan aksi <span className="lowercase font-bold">{conf.label}</span>
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded border">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Optional: Simple Diff Viewer */}
                  {log.action === 'update' && log.new_values && (
                    <div className="mt-2 text-[10px] font-mono bg-slate-50 border p-2 rounded-md overflow-x-auto max-h-32 text-slate-600">
                      Changed values stored. (Details available in central audit log)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
