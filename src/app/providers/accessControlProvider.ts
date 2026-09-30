import type { AccessControlProvider } from "@/lib/refine-compat";
import { canAccessResource } from "../../lib/permissions";
import type { UserRoleScope } from "../../lib/permissions";
import { supabaseClient } from "../../lib/supabase/client";

// Role scopes change rarely; cache them per user so each `can()` check does not hit the network.
// Row-level security in the database remains the actual enforcement.
const CACHE_TTL_MS = 60_000;
let cachedScopes: { userId: string; scopes: UserRoleScope[]; expiresAt: number } | null = null;

supabaseClient.auth.onAuthStateChange(() => {
  cachedScopes = null;
});

async function getScopes(userId: string): Promise<UserRoleScope[]> {
  if (cachedScopes && cachedScopes.userId === userId && cachedScopes.expiresAt > Date.now()) {
    return cachedScopes.scopes;
  }
  const { data: userRoles, error } = await supabaseClient
    .from("user_roles")
    .select("unit_id, roles(name)")
    .eq("user_id", userId);
  if (error) throw error;

  const rows = (userRoles || []) as unknown as Array<{ unit_id: string | null; roles: { name: UserRoleScope["role"] } | null }>;
  const scopes: UserRoleScope[] = rows.map((ur) => ({
    role: ur.roles?.name as UserRoleScope["role"],
    unit_id: ur.unit_id,
  }));
  cachedScopes = { userId, scopes, expiresAt: Date.now() + CACHE_TTL_MS };
  return scopes;
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource }) => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) {
        return { can: false, reason: "Unauthorized" };
      }

      // In Refine, resource name maps directly to our access rules
      const hasAccess = canAccessResource(await getScopes(session.user.id), resource || "");

      return {
        can: hasAccess,
        reason: hasAccess ? undefined : "You do not have permission to access this resource.",
      };
    } catch {
      return { can: false, reason: "Error resolving permissions." };
    }
  },
};
