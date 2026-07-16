import { handleEmployeeAccess, type EmployeeAccessRequest } from "../server/employee-access";

interface ApiRequest {
  method?: string;
  body?: EmployeeAccessRequest;
  headers: { authorization?: string; "user-agent"?: string };
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: Record<string, unknown>): unknown;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const result = await handleEmployeeAccess({
    authorization: req.headers.authorization,
    body: req.body,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    userAgent: req.headers["user-agent"],
  });
  return res.status(result.status).json(result.body);
}
