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

async function checkFKs() {
  const { data, error } = await supabase.rpc('get_foreign_keys_to_table', {
    target_table: 'units'
  });
  
  if (error) {
    console.error("RPC failed, falling back to raw sql query via REST is not possible. Will use another method.", error);
    // Let's just try fetching from common ones I might have missed
    const missedTables = [
      'settings',
      'user_roles',
      'user_units',
      'teacher_assignments',
      'pkg_assessments',
      'quran_records',
      'stppa_assessments'
    ];
    for (const t of missedTables) {
      try {
        const { data: d, error: e } = await supabase.from(t).select('id').eq('unit_id', '33333333-3333-3333-3333-333333333333').limit(1);
        if (d && d.length > 0) console.log(`[FOUND] in ${t}`);
      } catch (err) {}
    }
    console.log("Done checking missed tables.");
  } else {
    console.log(data);
  }
}

checkFKs();
