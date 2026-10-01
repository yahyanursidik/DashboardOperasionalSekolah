// Read-only diagnosis. Requires server credentials in the environment; never
// prints keys, account names, identifiers, email addresses, or session tokens.
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server configuration is missing");
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const db = createClient(url, key, options);
const anonymous = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, options);
const describe = (error) => error ? { code: error.code || error.status || "request_failed" } : null;

const [employees, joined, staffResolver, teacherResolver] = await Promise.all([
  db.from("employees").select("id,user_id,status,position,email").limit(1000),
  db.from("employees").select("id,units(name)").limit(1),
  anonymous.rpc("get_staff_login_email_by_identifier", { p_identifier: "__portal_diagnostic_no_account__" }),
  anonymous.rpc("get_teacher_login_email_by_identifier", { p_identifier: "__portal_diagnostic_no_account__" }),
]);
const summary = { profileReadError: describe(employees.error), embeddedUnitReadError: describe(joined.error),
  embeddedUnitRelationships: joined.error?.code === "PGRST201" ? joined.error.details : null,
  staffResolverError: describe(staffResolver.error), teacherResolverError: describe(teacherResolver.error) };
const relationChecks = await Promise.all([
  ["employees", "id,units!employees_unit_id_fkey(name)"],
  ["employee_attendance", "id,employees(id,units!employees_unit_id_fkey(name))"],
  ["leave_requests", "id,employees(id,units!employees_unit_id_fkey(name))"],
  ["attendance_correction_requests", "id,employees(id,units!employees_unit_id_fkey(name))"],
  ["employee_overtime", "id,employees(id,units!employees_unit_id_fkey(name)),units(name)"],
  ["attendance_shift_assignments", "id,employees(id,units!employees_unit_id_fkey(name))"],
  ["attendance_events", "id,attendance_event_participants(id,employees(id,units!employees_unit_id_fkey(name)))"],
].map(async ([table, select]) => {
  const result = await db.from(table).select(select, { head: true }).limit(1);
  return { table, error: describe(result.error) };
}));
summary.correctedRelationChecks = relationChecks;
if (employees.error) { console.log(JSON.stringify(summary)); process.exitCode = 1; }
else {
  const active = (employees.data || []).filter((row) => row.status === "active");
  const grouped = new Map();
  for (const row of active) if (row.user_id) grouped.set(row.user_id, (grouped.get(row.user_id) || 0) + 1);
  let users = []; let authReadError = null;
  for (let page = 1; page <= 10; page++) {
    const result = await db.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) { authReadError = describe(result.error); break; }
    users = users.concat(result.data.users);
    if (result.data.users.length < 100) break;
  }
  const authById = new Map(users.map((user) => [user.id, user]));
  const normalize = (value) => String(value || "").trim().toLowerCase();
  console.log(JSON.stringify({ ...summary, authReadError,
    sampledEmployeeCount: employees.data.length,
    activeEmployeeCount: active.length,
    activeWithoutAuthLink: active.filter((row) => !row.user_id).length,
    duplicateActiveAccountLinks: [...grouped.values()].filter((count) => count > 1).length,
    linkedAccountsMissingFromAuth: authReadError ? null : active.filter((row) => row.user_id && !authById.has(row.user_id)).length,
    linkedEmailMismatches: authReadError ? null : active.filter((row) => authById.has(row.user_id) && normalize(row.email) !== normalize(authById.get(row.user_id).email)).length,
    note: "Read-only administrative diagnostics do not verify RLS as an authenticated employee."
  }, null, 2));
}
