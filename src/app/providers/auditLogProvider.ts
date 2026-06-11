import type { AuditLogProvider } from "@refinedev/core";
import { supabaseClient } from "../../lib/supabase/client";

export const auditLogProvider: AuditLogProvider = {
  create: async (params) => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      const auditRecord = {
        action: params.action,
        resource_name: params.resource,
        resource_id: params.data?.id?.toString() || params.meta?.id?.toString() || "unknown",
        new_values: params.action === "create" || params.action === "update" ? params.data : null,
        old_values: params.action === "update" || params.action === "delete" ? params.previousData : null,
        user_id: session?.user?.id || null,
        // We cannot easily get IP/User-Agent purely from client-side without extra API calls,
        // so we leave them null or handle them via Supabase edge functions in the future.
      };

      // Ignore logging for audit_logs themselves or internal tracking to avoid infinite loops
      if (params.resource === 'audit_logs') return;

      await supabaseClient.from("audit_logs").insert([auditRecord]);
    } catch (error) {
      console.error("Audit log failed:", error);
    }
  },
  get: async (params) => {
    const { resource, meta } = params;
    const { data } = await supabaseClient
      .from("audit_logs")
      .select("*, profiles!user_id(full_name)")
      .eq("resource_name", resource)
      .eq("resource_id", meta?.id)
      .order("created_at", { ascending: false });

    return data as any;
  },
  update: async () => {
    // Audit logs shouldn't be updated. Return void.
    return;
  },
};
