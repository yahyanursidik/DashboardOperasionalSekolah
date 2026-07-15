import type { NavigationGroup, NavigationItem } from "./navigation";
import type { UserRoleScope } from "../lib/permissions";
import { canAccessResource, hasAnyRole } from "../lib/permissions";

export function canViewNavigationItem(item: NavigationItem, roles?: UserRoleScope[]) {
  const hasExplicitRole = item.roles?.length ? hasAnyRole(roles, item.roles) : false;
  if (hasExplicitRole) return true;
  if (item.resource) return canAccessResource(roles, item.resource);
  return !item.roles?.length;
}

export function getVisibleNavigationGroups(
  groups: NavigationGroup[],
  roles: UserRoleScope[] | undefined,
  options?: { activeUnitId?: string | null; isPaudUnit?: boolean },
) {
  return groups.flatMap((group) => {
    if (group.name === "Modul PAUD (KB/TK)" && options?.activeUnitId && !options.isPaudUnit) return [];
    const items = group.items.filter((item) => canViewNavigationItem(item, roles));
    return items.length ? [{ ...group, items }] : [];
  });
}

export function getActiveNavigationHref(pathname: string, groups: NavigationGroup[]) {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function filterNavigationGroups(groups: NavigationGroup[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return groups;
  return groups.flatMap((group) => {
    const groupMatches = group.name.toLowerCase().includes(query);
    const items = group.items.filter((item) => {
      const haystack = [item.title, item.href, ...(item.keywords || [])].join(" ").toLowerCase();
      return groupMatches || haystack.includes(query);
    });
    return items.length ? [{ ...group, items }] : [];
  });
}

export function getMobileNavigationItems(groups: NavigationGroup[], limit = 5) {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => item.mobilePriority)
    .sort((a, b) => Number(a.mobilePriority) - Number(b.mobilePriority))
    .slice(0, limit);
}
