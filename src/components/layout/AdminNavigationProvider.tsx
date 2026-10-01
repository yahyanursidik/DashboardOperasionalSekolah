/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router";
import { useOne } from "@/lib/refine-compat";
import { navigationConfig, type NavigationGroup } from "../../config/navigation";
import { getActiveNavigationHref, getVisibleNavigationGroups } from "../../config/navigation-utils";
import { createNavigationPreferenceStore, type NavigationPreferences } from "../../config/navigation-preferences";
import { useCurrentRoles, useCurrentUser } from "../../hooks/useAuth";
import { useCurrentUnit } from "../../app/providers/UnitProvider";

export interface AdminNavigationState {
  groups: NavigationGroup[];
  activeHref?: string;
  unitName: string;
  roleName?: string;
  isLoading: boolean;
  preferences: NavigationPreferences;
  temporaryPreferences: boolean;
  canPersonalize: boolean;
  toggleFavorite: (href: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}
export const AdminNavigationContext = createContext<AdminNavigationState | null>(null);
export function useAdminNavigation() {
  const value = useContext(AdminNavigationContext);
  if (!value) throw new Error("Admin navigation must be inside its provider.");
  return value;
}

export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const { roles, isLoading: rolesLoading } = useCurrentRoles();
  const { user, isLoading: userLoading } = useCurrentUser();
  const { activeUnitId } = useCurrentUnit();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const unit = useOne({ resource: "units", id: activeUnitId || "", queryOptions: { enabled: Boolean(activeUnitId) } });
  const unitName = String(unit.data?.data?.name || "");
  const isPaudUnit = ["paud", "tk", "kb", "preschool"].some((term) => unitName.toLowerCase().includes(term));
  const groups = useMemo(() => getVisibleNavigationGroups(navigationConfig, roles, { activeUnitId, isPaudUnit }), [roles, activeUnitId, isPaudUnit]);
  const activeHref = getActiveNavigationHref(pathname, groups);
  const store = useMemo(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Private mode: keep preferences in memory. */ }
    return createNavigationPreferenceStore(user?.id, new Set(navigationConfig.flatMap((group) => group.items.map((item) => item.href))), storage);
  }, [user?.id]);
  const preferences = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { if (activeHref && !rolesLoading) store.remember(activeHref); }, [activeHref, rolesLoading, store]);
  return <AdminNavigationContext.Provider value={{ groups, activeHref, unitName, roleName: roles?.[0]?.role, isLoading: rolesLoading || userLoading, preferences, temporaryPreferences: store.isTemporary(), canPersonalize: Boolean(user?.id), toggleFavorite: store.toggleFavorite, searchOpen, setSearchOpen }}>{children}</AdminNavigationContext.Provider>;
}
