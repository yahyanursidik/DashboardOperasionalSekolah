import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "tsls-chunk-reload-at";

/**
 * Lazily loads a named page export so each route ships in its own chunk.
 *
 * After a deploy, a browser holding the previous index.html may request chunk files that no
 * longer exist. In that case reload once (at most every 30s) to pick up the new build instead
 * of showing an error screen.
 */
export function lazyPage<TModule extends Record<string, unknown>>(loader: () => Promise<TModule>, exportName: keyof TModule & string) {
  return lazy(async () => {
    try {
      const module = await loader();
      return { default: module[exportName] as ComponentType<any> };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isStaleChunk = /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message);
      let lastReload = 0;
      try { lastReload = Number(window.sessionStorage.getItem(RELOAD_FLAG) || 0); } catch { /* storage unavailable */ }
      if (isStaleChunk && Date.now() - lastReload > 30_000) {
        try { window.sessionStorage.setItem(RELOAD_FLAG, String(Date.now())); } catch { /* storage unavailable */ }
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}
