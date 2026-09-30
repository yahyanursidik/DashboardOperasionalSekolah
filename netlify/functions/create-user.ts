import { handleCreateUser, type CreateUserRequest } from "../../server/create-user";

interface NetlifyEvent {
  httpMethod?: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body: CreateUserRequest;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Format permintaan tidak valid." }) };
  }

  const result = await handleCreateUser({
    authorization: event.headers?.authorization,
    body,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return { statusCode: result.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.body) };
};
