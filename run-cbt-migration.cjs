require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'supabase', 'create_cbt_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split statements. Simple split by ';' and handle empty
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
    console.log(`Found ${statements.length} statements to execute.`);

    // Wait, unfortunately Supabase JS client doesn't have a direct raw SQL execution method
    // unless using rpc. So we can't easily run arbitrary SQL strings directly from the client.
    // Wait, the easier way is to use Postgres direct connection. Does the user have a direct connection string?
    // Let me check .env
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();
