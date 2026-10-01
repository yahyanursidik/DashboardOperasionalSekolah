import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadEmployeePortalWorkspace, normalizeEmployeeIdentifier, PortalAccessError } from "../src/lib/supabase/employee-portal-access.ts";

const activeEmployee = { id: "employee-1", user_id: "user-1", status: "active", position: "tu", unit_id: "unit-1" };
function mockClient({ employee = activeEmployee, profileError = null, access = true, accessError = null, roles = [], rolesError = null, unitError = null, unitThrows = false } = {}) {
  const queries = [];
  const client = {
    from(table) {
      const query = { table, filters: [], selection: "" };
      queries.push(query);
      const result = () => {
        if (table === "employees") return { data: query.filters.some(([key, value]) => key === "status" && value === "active") && employee?.status !== "active" ? null : employee, error: profileError };
        if (table === "user_roles") return { data: roles, error: rolesError };
        if (unitThrows) throw new Error("offline");
        return { data: { name: "Elementary" }, error: unitError };
      };
      const builder = {
        select(value) { query.selection = value; return builder; },
        eq(key, value) { query.filters.push([key, value]); return builder; },
        maybeSingle: async () => result(),
        then: (resolve, reject) => Promise.resolve().then(result).then(resolve, reject),
      };
      return builder;
    },
    rpc: async (name) => { queries.push({ rpc: name }); return { data: access, error: accessError }; },
    auth: { signOut() { assert.fail("Verification must not sign out the session"); } },
  };
  return { client, queries };
}

test("staff: valid account uses own active profile and server authorization, without embedded units join", async () => {
  const { client, queries } = mockClient();
  const result = await loadEmployeePortalWorkspace(client, "user-1", "staff");
  assert.equal(result.employee.id, activeEmployee.id);
  assert.equal(result.employee.units.name, "Elementary");
  assert.deepEqual(queries[0], { table: "employees", selection: "*", filters: [["user_id", "user-1"], ["status", "active"]] });
  assert.equal(queries[1].rpc, "staff_has_portal_access");
});

for (const portal of ["staff", "teacher", "hrd", "bendahara"]) {
  test(`${portal}: RLS/network profile error is retryable, not logout or authorization`, async () => {
    const { client } = mockClient({ profileError: { code: "42501" } });
    await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", portal), (error) => error instanceof PortalAccessError && error.retryable);
  });
}
test("duplicate active employee links receive a specific error; never pick an arbitrary employee", async () => {
  const { client } = mockClient({ profileError: { code: "PGRST116" } });
  await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", "staff"), /lebih dari satu pegawai/);
});
for (const portal of ["staff", "teacher"]) {
  for (const access of [false, null, "true"]) {
    test(`${portal}: server value ${String(access)} does not authorize`, async () => {
      const { client } = mockClient({ access });
      await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", portal), (error) => error instanceof PortalAccessError && !error.retryable);
    });
  }
  test(`${portal}: missing/broken RPC fails closed, without legacy permission bypass`, async () => {
    const { client } = mockClient({ accessError: { code: "PGRST202" } });
    await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", portal), (error) => error.retryable);
  });
  test(`${portal}: inactive employee cannot enter`, async () => {
    const { client } = mockClient({ employee: { ...activeEmployee, status: "inactive" } });
    await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", portal), PortalAccessError);
  });
}
test("non-staff position cannot enter staff portal even with a stale true RPC", async () => {
  const { client } = mockClient({ employee: { ...activeEmployee, position: "guru" } });
  await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", "staff"), PortalAccessError);
});
test("teacher assignment authorization does not depend on staff position", async () => {
  const { client } = mockClient({ employee: { ...activeEmployee, position: "guru" } });
  assert.ok((await loadEmployeePortalWorkspace(client, "user-1", "teacher")).employee);
});
for (const options of [{ unitError: { code: "42501" } }, { unitThrows: true }]) {
  test(`optional unit failure ${JSON.stringify(options)} does not reject valid staff`, async () => {
    const { client } = mockClient(options);
    assert.equal((await loadEmployeePortalWorkspace(client, "user-1", "staff")).employee.id, activeEmployee.id);
  });
}
for (const portal of ["hrd", "bendahara"]) {
  test(`${portal}: role lookup failure is not treated as no roles`, async () => {
    const { client } = mockClient({ rolesError: { code: "42501" } });
    await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", portal), (error) => error.retryable);
  });
  test(`${portal}: unrelated role cannot enter`, async () => {
    const { client } = mockClient({ roles: [{ roles: { name: "wali_murid" } }] });
    await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", portal), PortalAccessError);
  });
}
test("HRD role relationship accepts object or array consistently", async () => {
  for (const roles of [[{ roles: { name: "hrd" } }], [{ roles: [{ name: "hrd" }] }]]) {
    const { client } = mockClient({ roles });
    assert.ok((await loadEmployeePortalWorkspace(client, "user-1", "hrd")).employee);
  }
});
test("finance permits role-only finance manager, but HRD still requires linked active employee", async () => {
  const { client } = mockClient({ employee: null, roles: [{ roles: { name: "super_admin" } }] });
  assert.equal((await loadEmployeePortalWorkspace(client, "user-1", "bendahara")).employee, null);
  await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", "hrd"), PortalAccessError);
});
test("finance active employee position authorizes without roles", async () => {
  const { client } = mockClient({ employee: { ...activeEmployee, position: "bendahara" } });
  assert.ok((await loadEmployeePortalWorkspace(client, "user-1", "bendahara")).employee);
});
for (const status of ["inactive", "resigned"]) {
  test(`finance ${status} employee cannot bypass suspension using a manager role`, async () => {
    const { client } = mockClient({ employee: { ...activeEmployee, position: "bendahara", status }, roles: [{ roles: { name: "admin_keuangan" } }] });
    await assert.rejects(loadEmployeePortalWorkspace(client, "user-1", "bendahara"), (error) => error instanceof PortalAccessError && !error.retryable);
  });
}
test("employee identifier normalization preserves leading zeroes", () => {
  assert.equal(normalizeEmployeeIdentifier(" 010 123\n456 "), "010123456");
  assert.equal(normalizeEmployeeIdentifier(" Staff@School.ID "), "staff@school.id");
});
test("all four employee portals share login and layout authorization; guards sign out only on explicit logout", async () => {
  for (const portal of ["staff", "teacher", "hrd", "bendahara"]) {
    const base = new URL(`../src/modules/${portal}-portal/`, import.meta.url);
    for (const suffix of ["login", "layout"]) {
      const source = await readFile(new URL(`${portal}-${suffix}.tsx`, base), "utf8");
      assert.match(source, /loadEmployeePortalWorkspace\(supabaseClient,/);
      assert.equal((source.match(/auth\.signOut\(/g) || []).length, suffix === "layout" ? 1 : 0);
      if (suffix === "layout") assert.match(source, /PortalAccessNotice message=\{loadError\}/);
    }
  }
});
test("admin SPMB login and layout use the same server permission check", async () => {
  for (const suffix of ["login", "layout"]) {
    const source = await readFile(new URL(`../src/modules/admin-spmb-portal/admin-spmb-${suffix}.tsx`, import.meta.url), "utf8");
    assert.match(source, /rpc\("admission_is_manager"/);
    if (suffix === "login") assert.doesNotMatch(source, /auth\.signOut\(/);
  }
});
test("parent workspace/link errors never sign out implicitly", async () => {
  const login = await readFile(new URL("../src/modules/portal/portal-login.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/modules/portal/portal-layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(login, /auth\.signOut\(/);
  assert.equal((layout.match(/auth\.signOut\(/g) || []).length, 1);
});
test("SPMB and extracurricular session-read failures offer retry rather than an unexplained login redirect", async () => {
  for (const file of ["admissions/portal/spmb-layout.tsx", "extracurricular/portal/layout.tsx"]) {
    const source = await readFile(new URL(`../src/modules/${file}`, import.meta.url), "utf8");
    assert.match(source, /PortalAccessNotice/);
    assert.match(source, /if \(error\) throw error/);
  }
});
test("employee-unit embeds explicitly use the home-unit FK rather than the reverse principal relation", async () => {
  const files = [
    "staff-portal/staff-profile.tsx", "teacher-portal/teacher-profile.tsx", "hrd-portal/hrd-dashboard.tsx",
    "employees/pages/list.tsx", "employees/pages/show.tsx", "teachers/pages/list.tsx", "teachers/pages/show.tsx", "pkg/pages/list.tsx",
    "dapodik/pages/dapodik.tsx", "payroll/pages/payroll.tsx", "leaves/pages/list.tsx", "leaves/pages/show.tsx",
    "attendance/components/attendance-shift-settings.tsx", "attendance/pages/attendance-overtime.tsx",
    "attendance/pages/attendance-reviews.tsx", "attendance/pages/employee-attendance.tsx",
    "attendance/pages/attendance-events.tsx", "reports/pages/employee-attendance.tsx",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../src/modules/${file}`, import.meta.url), "utf8");
    assert.match(source, /units!employees_unit_id_fkey\(name\)/, file);
    assert.doesNotMatch(source, /employees\([^)]*\bunits\(/, file);
    assert.doesNotMatch(source, /from\("employees"\)\.select\("[^"\n]*\bunits\(/, file);
  }
});
