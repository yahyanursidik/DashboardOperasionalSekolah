import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { handleEmployeeAccess, type EmployeeAccessRequest } from './server/employee-access'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
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
                try {
                  const data = JSON.parse(body);
                  const { email, password, fullName, roleId, unitId } = data;
                  
                  const supabaseUrl = env.VITE_SUPABASE_URL;
                  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
                  
                  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'masukkan_service_role_key_anda_disini') {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: "Service Role Key belum diatur di file .env dengan benar." }));
                  }

                  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
                    auth: { autoRefreshToken: false, persistSession: false },
                  });

                  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name: fullName },
                  });

                  if (userError) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: userError.message }));
                  }

                  const userId = userData.user.id;
                  await supabaseAdmin.from("profiles").update({ full_name: fullName }).eq("id", userId);
                  await supabaseAdmin.from("user_roles").insert({
                    user_id: userId,
                    role_id: roleId,
                    unit_id: unitId || null,
                  });

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ message: "User created", user: { id: userId, email } }));
                } catch (err: unknown) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }));
                }
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
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
