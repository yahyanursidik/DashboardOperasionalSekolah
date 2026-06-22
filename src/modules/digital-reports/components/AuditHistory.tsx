import React from "react";
import { useList } from "@refinedev/core";
import { History, FileText, Edit, Activity } from "lucide-react";

interface AuditHistoryProps {
  resourceId: string;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({ resourceId }) => {
  const { data: auditLogs, isLoading } = useList({
    resource: "audit_logs",
    pagination: { mode: "off" },
    filters: [
      { field: "resource_id", operator: "eq", value: resourceId }
    ],
    meta: { select: "*, profiles(full_name)" },
    sorters: [{ field: "created_at", order: "desc" }]
  });

  if (isLoading) {
    return (
      <div className="p-5 text-center text-muted-foreground">
        <Activity className="w-5 h-5 animate-spin mx-auto mb-2" />
        <span className="text-sm">Memuat log aktivitas...</span>
      </div>
    );
  }

  const logs = auditLogs?.data || [];

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20 font-bold flex items-center gap-2 text-sm text-muted-foreground">
        <History className="w-4 h-4" /> Sistem Audit Log Terperinci
      </div>
      <div className="p-0 divide-y text-sm max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-5 text-muted-foreground italic text-center">Belum ada riwayat aktivitas tercatat di sistem audit.</div>
        ) : (
          logs.map((log: any) => {
            let actionText = log.action;
            let icon = <Activity className="w-4 h-4 text-muted-foreground" />;
            
            if (log.action === 'create') {
              actionText = "Dibuat";
              icon = <FileText className="w-4 h-4 text-blue-500" />;
            } else if (log.action === 'update') {
              actionText = "Diperbarui";
              icon = <Edit className="w-4 h-4 text-amber-500" />;
            } else if (log.action === 'status-change') {
              actionText = "Ubah Status";
              icon = <Activity className="w-4 h-4 text-emerald-500" />;
            }

            const newValue = log.new_values;

            return (
              <div key={log.id} className="p-4 space-y-1 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{log.profiles?.full_name || 'System'}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-[10px] mr-1 uppercase">{actionText}</span>
                      {log.resource_name.replace(/_/g, ' ')}
                    </div>
                    
                    {newValue && newValue.message && (
                      <div className="mt-2 text-xs italic text-muted-foreground">
                        {newValue.message}
                      </div>
                    )}

                    {log.action === 'status-change' && log.old_values?.status && log.new_values?.status && (
                       <div className="mt-2 text-xs">
                         <span className="line-through text-muted-foreground mr-1">{log.old_values.status}</span> &rarr; <strong className="ml-1 text-foreground">{log.new_values.status}</strong>
                         {log.new_values.comments && <div className="mt-1 text-muted-foreground italic border-l-2 border-primary pl-2">"{log.new_values.comments}"</div>}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
