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
  console.log(`Attempting to delete unit ${UNIT_ID}...`);
  
  const { data, error } = await supabase.from('units').delete().eq('id', UNIT_ID);
  
  if (error) {
    console.error("DELETE FAILED with error:", JSON.stringify(error, null, 2));
  } else {
    console.log("DELETE SUCCEEDED!", data);
  }
}

testDelete();
