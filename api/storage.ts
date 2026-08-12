import { handleObjectStorage, type ObjectStorageRequest } from "../server/object-storage";

interface ApiRequest {
  method?: string;
  body?: ObjectStorageRequest;
  headers: { authorization?: string };
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: Record<string, unknown>): unknown;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const result = await handleObjectStorage({
    authorization: req.headers.authorization,
    body: req.body,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    maxFileSizeBytes: process.env.S3_MAX_FILE_SIZE_BYTES,
  });
  return res.status(result.status).json(result.body);
}
