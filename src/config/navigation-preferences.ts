/** Personal UI preferences only; never an authorization source. */
export interface NavigationPreferences { favorites: string[]; recent: string[] }
export const FAVORITE_LIMIT = 12;
export const RECENT_LIMIT = 8;
const EMPTY: NavigationPreferences = { favorites: [], recent: [] };

function cleanPaths(value: unknown, allowed: Set<string>, limit: number) {
  return Array.isArray(value) ? [...new Set(value.filter((path): path is string => typeof path === "string" && allowed.has(path)))].slice(0, limit) : [];
}

export function parseNavigationPreferences(raw: string | null, allowed: Set<string>): NavigationPreferences {
  try {
    const value = JSON.parse(raw || "null");
    return { favorites: cleanPaths(value?.favorites, allowed, FAVORITE_LIMIT), recent: cleanPaths(value?.recent, allowed, RECENT_LIMIT) };
  } catch { return { ...EMPTY }; }
}

export function selectShortcutPaths(preferences: NavigationPreferences, visible: Set<string>, suggested: string[], limit = 6) {
  const favorites = preferences.favorites.filter((path) => visible.has(path));
  return favorites.length ? favorites : suggested.filter((path) => visible.has(path)).slice(0, limit);
}

export function createNavigationPreferenceStore(userId: string | undefined, allowed: Set<string>, storage?: Pick<Storage, "getItem" | "setItem">) {
  const key = userId ? `tsls:admin-navigation:v2:${userId}` : null;
  let snapshot: NavigationPreferences = { ...EMPTY };
  let storageUnavailable = false;
  const listeners = new Set<() => void>();
  try { if (key && storage) snapshot = parseNavigationPreferences(storage.getItem(key), allowed); }
  catch { storageUnavailable = true; }
  const update = (next: NavigationPreferences) => {
    if (!key) return;
    snapshot = next;
    try { storage?.setItem(key, JSON.stringify(next)); } catch { storageUnavailable = true; }
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    isTemporary: () => storageUnavailable || !storage,
    toggleFavorite: (path: string) => {
      if (!allowed.has(path)) return;
      const exists = snapshot.favorites.includes(path);
      if (!exists && snapshot.favorites.length >= FAVORITE_LIMIT) return;
      update({ ...snapshot, favorites: exists ? snapshot.favorites.filter((item) => item !== path) : [...snapshot.favorites, path] });
    },
    remember: (path: string) => {
      if (path === "/" || !allowed.has(path) || snapshot.recent[0] === path) return;
      update({ ...snapshot, recent: [path, ...snapshot.recent.filter((item) => item !== path)].slice(0, RECENT_LIMIT) });
    },
  };
}
