import { handleCreateUser, type CreateUserRequest } from "../server/create-user";

interface ApiRequest {
  method?: string;
  body?: CreateUserRequest;
  headers: { authorization?: string };
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: Record<string, unknown>): unknown;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const result = await handleCreateUser({
    authorization: req.headers.authorization,
    body: req.body,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return res.status(result.status).json(result.body);
}
