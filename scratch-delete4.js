import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function forceDelete() {
  const UNIT_ID = '33333333-3333-3333-3333-333333333333';
  let success = false;
  let attempts = 0;
  
  while (!success && attempts < 20) {
    attempts++;
    console.log(`\n--- Attempt ${attempts} ---`);
    const { error } = await supabase.from('units').delete().eq('id', UNIT_ID);
    
    if (!error) {
      console.log("UNIT DELETED SUCCESSFULLY!");
      success = true;
      break;
    }
    
    console.log("Delete failed:", error.message);
    
    // Parse table name from error
    const match = error.message.match(/constraint ".*?" on table "([^"]+)"/);
    if (match && match[1]) {
      const table = match[1];
      console.log(`Cleaning up referencing table: ${table}`);
      const { error: delErr } = await supabase.from(table).delete().eq('unit_id', UNIT_ID);
      if (delErr) {
        console.error(`Failed to clean up ${table}:`, delErr.message);
        break;
      } else {
        console.log(`Deleted references in ${table}.`);
      }
    } else {
      console.error("Could not parse table from error message.");
      break;
    }
  }
}

forceDelete();
