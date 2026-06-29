const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim();
});

const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const email = 'yahyanursidik@gmail.com';
  
  // Since listUsers crashed previously, maybe we can query the database directly using RPC?
  // I will just use the admin client's generateLink to generate a reset link, or maybe
  // we can use Postgres function if we have one. But wait, can we update user password via email?
  // There is no `updateUserByEmail` in Supabase admin JS.
  
  // Wait, I can just create a SQL RPC to update the password directly in auth.users!
  const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('exec_sql', {
     sql: `UPDATE auth.users SET encrypted_password = crypt('parent123', gen_salt('bf')) WHERE email = 'yahyanursidik@gmail.com';`
  });
  
  if (rpcErr) {
     console.log("RPC exec_sql error:", rpcErr);
     // If exec_sql doesn't exist, we can't do this easily unless we use psql
  } else {
     console.log("SQL execution result:", rpcResult);
  }
}

run().catch(console.error);
