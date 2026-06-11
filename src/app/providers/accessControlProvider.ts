import type { AccessControlProvider } from "@refinedev/core";
import { canAccessResource } from "../../lib/permissions";
import type { UserRoleScope } from "../../lib/permissions";
import { supabaseClient } from "../../lib/supabase/client";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource }) => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData?.user) {
        return { can: false, reason: "Unauthorized" };
      }

      // Fetch scopes dynamically if we don't pass them in params
      const { data: userRoles } = await supabaseClient
        .from("user_roles")
        .select("unit_id, roles(name)")
        .eq("user_id", authData.user.id);
      
      const scopes: UserRoleScope[] = (userRoles || []).map((ur: any) => ({
        role: ur.roles?.name,
        unit_id: ur.unit_id,
      }));

      // In Refine, resource name maps directly to our access rules
      const hasAccess = canAccessResource(scopes, resource || "");

      return {
        can: hasAccess,
        reason: hasAccess ? undefined : "You do not have permission to access this resource.",
      };
    } catch {
      return { can: false, reason: "Error resolving permissions." };
    }
  },
};
