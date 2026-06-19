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
  console.log("Fetching super_admin role...");
  const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'super_admin').single();
  
  if (!roleData) {
    console.error("Role super_admin not found!");
    return;
  }

  const roleId = roleData.id;
  console.log("Super admin role ID:", roleId);

  console.log("Fetching profiles...");
  const { data: profiles, error: err } = await supabase.from('profiles').select('id, full_name');
  
  if (err) {
    console.error("Error fetching profiles:", err);
    return;
  }

  console.log(`Found ${profiles.length} profiles. Assigning super_admin...`);
  
  for (const profile of profiles) {
    // Check if role already exists
    const { data: existingRole } = await supabase.from('user_roles')
      .select('id')
      .eq('user_id', profile.id)
      .eq('role_id', roleId)
      .maybeSingle();

    if (!existingRole) {
       await supabase.from('user_roles').insert({
         user_id: profile.id,
         role_id: roleId,
         unit_id: null
       });
       console.log(`Assigned super_admin to ${profile.email || profile.full_name}`);
    } else {
       console.log(`User ${profile.email || profile.full_name} is already super_admin.`);
    }
  }
  
  console.log("Done!");
}

run();
