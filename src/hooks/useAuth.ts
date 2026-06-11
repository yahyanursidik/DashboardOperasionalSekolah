import { useGetIdentity, usePermissions } from "@refinedev/core";
import type { UserRoleScope } from "../lib/permissions";

export const useCurrentUser = () => {
  const { data: user, isLoading } = useGetIdentity<any>();
  return { user, isLoading };
};

export const useCurrentRoles = () => {
  const { data: roles, isLoading } = usePermissions<UserRoleScope[]>();
  return { roles, isLoading };
};
