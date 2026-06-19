const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const [key, ...val] = line.split('=');
    env[key.trim()] = val.join('=').trim();
  }
});

const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Fetching user_roles via service_role to verify data exists...");
  const { data: roles, error } = await supabase.from('user_roles').select('*, profiles(id, full_name, email), roles(id, name), units(id, name)');
  
  if (error) {
    console.error("Error fetching user_roles:", error);
    return;
  }
  
  console.log(`Found ${roles.length} user_roles.`);
  console.log(JSON.stringify(roles.slice(0, 2), null, 2));

  // Now test via an anon query if we can simulate the user
  // Let's get a user ID to simulate
  const uid = roles[0]?.user_id;
  if (!uid) {
    console.log("No user to simulate");
    return;
  }

  // To simulate RLS, we need the anon key and a session, or just know that RLS is the issue.
  // Actually, we can just execute a raw query with set_config via a postgres client, but we don't have direct DB connection string.
}

run();
