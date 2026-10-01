import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { createNavigationPreferenceStore, parseNavigationPreferences, selectShortcutPaths, FAVORITE_LIMIT, RECENT_LIMIT } from "../src/config/navigation-preferences.ts";

// Transpile the existing production permission/navigation modules, not substitutes.
const require = createRequire(import.meta.url);
function load(relative, dependencies = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => dependencies[name] || require(name), module, module.exports);
  return module.exports;
}
const permissions = load("../src/lib/permissions/index.ts");
const { navigationConfig } = load("../src/config/navigation.ts");
const { getVisibleNavigationGroups, getActiveNavigationHref, filterNavigationGroups, getMobileNavigationItems, canViewNavigationItem } = load("../src/config/navigation-utils.ts", { "../lib/permissions": permissions });
const { getNavigationModuleMeta } = load("../src/config/navigation-module-meta.ts");
const paths = navigationConfig.flatMap((group) => group.items.map((item) => item.href));
const allowed = new Set(paths);
const scope = (role) => [{ role, unit_id: null }];
function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

test("all configured destinations are unique and every module has a usable fallback label", () => {
  assert.equal(allowed.size, paths.length);
  for (const group of navigationConfig) assert.ok(getNavigationModuleMeta(group).title);
  assert.equal(getNavigationModuleMeta({ name: "Modul tambahan", items: [] }).title, "Modul tambahan");
});
test("super admin can discover every configured menu; search does not truncate", () => {
  const groups = getVisibleNavigationGroups(navigationConfig, scope("super_admin"));
  assert.deepEqual(groups.flatMap((group) => group.items.map((item) => item.href)), paths);
  assert.equal(filterNavigationGroups(groups, "").flatMap((group) => group.items).length, paths.length);
});
for (const role of permissions.ROLE_NAMES) {
  test(`${role}: sidebar, search and shortcuts use the same allowed destinations`, () => {
    const groups = getVisibleNavigationGroups(navigationConfig, scope(role));
    const visiblePaths = new Set(groups.flatMap((group) => group.items.map((item) => item.href)));
    const favorites = selectShortcutPaths({ favorites: paths, recent: [] }, visiblePaths, []);
    for (const href of favorites) assert.ok(visiblePaths.has(href));
    for (const group of filterNavigationGroups(groups, "/")) for (const item of group.items) assert.ok(canViewNavigationItem(item, scope(role)));
    for (const item of getMobileNavigationItems(groups, 4)) assert.ok(visiblePaths.has(item.href));
  });
}
test("missing role never exposes privileged destinations through saved preferences", () => {
  const groups = getVisibleNavigationGroups(navigationConfig, undefined);
  const visible = new Set(groups.flatMap((group) => group.items.map((item) => item.href)));
  assert.ok(!visible.has("/employees"));
  assert.ok(!visible.has("/admissions/applicants"));
  assert.ok(!selectShortcutPaths({ favorites: ["/employees", "/admissions/applicants"], recent: [] }, visible, []).length);
});
test("PAUD visibility respects active unit, without losing menus in cross-unit context", () => {
  const role = scope("super_admin");
  assert.ok(getVisibleNavigationGroups(navigationConfig, role).some((group) => group.name === "Modul PAUD (KB/TK)"));
  assert.ok(!getVisibleNavigationGroups(navigationConfig, role, { activeUnitId: "elementary", isPaudUnit: false }).some((group) => group.name === "Modul PAUD (KB/TK)"));
  assert.ok(getVisibleNavigationGroups(navigationConfig, role, { activeUnitId: "preschool", isPaudUnit: true }).some((group) => group.name === "Modul PAUD (KB/TK)"));
});
test("nested routes select the closest menu, without a root-prefix false match", () => {
  assert.equal(getActiveNavigationHref("/admissions/applicants/SPMB-2026-00001", navigationConfig), "/admissions/applicants");
  assert.equal(getActiveNavigationHref("/", navigationConfig), "/");
  assert.equal(getActiveNavigationHref("/not-a-menu", navigationConfig), undefined);
});
test("search supports titles, group names and configured keywords", () => {
  for (const group of navigationConfig) {
    assert.equal(filterNavigationGroups([group], `  ${group.name.toUpperCase()}  `)[0]?.items.length, group.items.length);
    for (const item of group.items) assert.ok(filterNavigationGroups([group], item.title).some((match) => match.items.includes(item)));
  }
  assert.deepEqual(filterNavigationGroups(navigationConfig, "zzzz-no-menu"), []);
  assert.ok(filterNavigationGroups(navigationConfig, "pegawai rekap").flatMap((group) => group.items).some((item) => item.href === "/reports/employee-attendance"));
  assert.equal(filterNavigationGroups(navigationConfig, "penerimaan siswa", (group) => [getNavigationModuleMeta(group).title]).find((group) => group.name === "SPMB")?.items.length, 5);
});
test("corrupt/foreign preference data is ignored and paths are deduplicated", () => {
  for (const raw of ["broken", "null", "[]", '{"favorites":12,"recent":{}}']) assert.deepEqual(parseNavigationPreferences(raw, allowed), { favorites: [], recent: [] });
  assert.deepEqual(parseNavigationPreferences(JSON.stringify({ favorites: [paths[0], paths[0], "https://foreign.test", 5], recent: [paths[1]] }), allowed), { favorites: [paths[0]], recent: [paths[1]] });
});
test("favorites persist per account and never leak into another account or anonymous session", () => {
  const storage = memoryStorage();
  createNavigationPreferenceStore("account-a", allowed, storage).toggleFavorite(paths[1]);
  assert.deepEqual(createNavigationPreferenceStore("account-a", allowed, storage).getSnapshot().favorites, [paths[1]]);
  assert.deepEqual(createNavigationPreferenceStore("account-b", allowed, storage).getSnapshot().favorites, []);
  const anonymous = createNavigationPreferenceStore(undefined, allowed, storage);
  anonymous.toggleFavorite(paths[1]);
  assert.deepEqual(anonymous.getSnapshot().favorites, []);
});
test("favorites respect cap, remove without reordering, and ignore unknown routes", () => {
  const store = createNavigationPreferenceStore("cap", allowed, memoryStorage());
  for (const path of paths) store.toggleFavorite(path);
  assert.equal(store.getSnapshot().favorites.length, FAVORITE_LIMIT);
  store.toggleFavorite("/unknown");
  store.toggleFavorite(paths[1]);
  assert.equal(store.getSnapshot().favorites.length, FAVORITE_LIMIT - 1);
  assert.equal(store.getSnapshot().favorites[0], paths[0]);
});
test("recent menus are capped, unique and exclude home; repeated visit is a no-op", () => {
  const store = createNavigationPreferenceStore("recent", allowed, memoryStorage());
  for (const path of paths.slice(1, 20)) store.remember(path);
  assert.equal(store.getSnapshot().recent.length, RECENT_LIMIT);
  const snapshot = store.getSnapshot();
  store.remember(snapshot.recent[0]); store.remember("/"); store.remember("/unknown");
  assert.equal(snapshot, store.getSnapshot());
  store.remember(paths[2]);
  assert.equal(store.getSnapshot().recent[0], paths[2]);
  assert.equal(new Set(store.getSnapshot().recent).size, store.getSnapshot().recent.length);
});
test("denied reads/writes and absent storage keep navigation and preferences functional in memory", () => {
  for (const storage of [undefined, { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } }, { getItem() { return null; }, setItem() { throw new Error("quota"); } }]) {
    const store = createNavigationPreferenceStore("restricted", allowed, storage);
    let updates = 0;
    const unsubscribe = store.subscribe(() => updates++);
    store.toggleFavorite(paths[1]);
    assert.equal(store.isTemporary(), true);
    assert.deepEqual(store.getSnapshot().favorites, [paths[1]]);
    assert.equal(updates, 1);
    unsubscribe(); store.toggleFavorite(paths[1]);
    assert.equal(updates, 1);
  }
});
test("suggested shortcuts are limited and never bypass visibility", () => {
  const visible = new Set(paths.slice(0, 4));
  assert.deepEqual(selectShortcutPaths({ favorites: [], recent: [] }, visible, paths, 2), paths.slice(0, 2));
  assert.deepEqual(selectShortcutPaths({ favorites: [paths[20], paths[1]], recent: [] }, visible, paths), [paths[1]]);
});
