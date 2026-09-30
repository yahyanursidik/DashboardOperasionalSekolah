import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { handleCreateUser, type CreateUserRequest } from './server/create-user.ts'
import { handleEmployeeAccess, type EmployeeAccessRequest } from './server/employee-access.ts'
import { handleObjectStorage, type ObjectStorageRequest } from './server/object-storage.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/storage' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                let parsedBody: ObjectStorageRequest;
                try {
                  parsedBody = JSON.parse(body || '{}');
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Format permintaan tidak valid.' }));
                }
                const result = await handleObjectStorage({
                  authorization: req.headers.authorization,
                  body: parsedBody,
                  supabaseUrl: env.VITE_SUPABASE_URL,
                  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
                  endpoint: env.S3_ENDPOINT,
                  region: env.S3_REGION,
                  bucket: env.S3_BUCKET,
                  accessKeyId: env.S3_ACCESS_KEY_ID,
                  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
                  maxFileSizeBytes: env.S3_MAX_FILE_SIZE_BYTES,
                });
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.body));
              });
              return;
            }
            if (req.url === '/api/manage-employee-access' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                let parsedBody: EmployeeAccessRequest;
                try {
                  parsedBody = JSON.parse(body || '{}');
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Format permintaan tidak valid.' }));
                }

                const result = await handleEmployeeAccess({
                  authorization: req.headers.authorization,
                  body: parsedBody,
                  supabaseUrl: env.VITE_SUPABASE_URL,
                  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
                  userAgent: req.headers['user-agent'],
                });
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.body));
              });
              return;
            }
            if (req.url === '/api/create-user' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                let parsedBody: CreateUserRequest;
                try {
                  parsedBody = JSON.parse(body || '{}');
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Format permintaan tidak valid.' }));
                }

                const result = await handleCreateUser({
                  authorization: req.headers.authorization,
                  body: parsedBody,
                  supabaseUrl: env.VITE_SUPABASE_URL,
                  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
                });
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.body));
              });
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  }
})
