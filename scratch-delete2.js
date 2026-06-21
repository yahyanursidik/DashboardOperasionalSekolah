import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const UNIT_ID = '33333333-3333-3333-3333-333333333333';
  const { data } = await supabase.from('admin_tasks').select('*').eq('unit_id', UNIT_ID);
  console.log("Found admin_tasks:", data);
  
  // Let's just delete it for them to fix the blockage
  if (data && data.length > 0) {
    const { error } = await supabase.from('admin_tasks').delete().eq('unit_id', UNIT_ID);
    if (!error) console.log("Deleted admin_tasks successfully");
  }
  
  // Try deleting unit again
  const { error: unitErr } = await supabase.from('units').delete().eq('id', UNIT_ID);
  if (!unitErr) console.log("UNIT DELETED SUCCESSFULLY!");
  else console.error("Unit delete still failed:", unitErr);
}

testDelete();
