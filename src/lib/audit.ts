import { supabaseClient } from "./supabase/client";

export type AuditAction = 'create' | 'update' | 'delete' | 'status-change';

export const logAudit = async (
  userId: string | undefined,
  action: AuditAction,
  resourceName: string,
  resourceId: string,
  oldValues?: any,
  newValues?: any
) => {
  if (!userId) return;

  try {
    const { error } = await supabaseClient.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_name: resourceName,
      resource_id: resourceId,
      old_values: oldValues || null,
      new_values: newValues || null,
      user_agent: navigator.userAgent
    });

    if (error) {
      console.error("Failed to log audit:", error);
    }
  } catch (err) {
    console.error("Audit log error:", err);
  }
};
