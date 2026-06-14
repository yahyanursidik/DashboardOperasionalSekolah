const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: units, error: err1 } = await supabase.from('units').select('*');
  console.log('Units:', units?.length || 0, err1?.message || '');
  
  const { data: teachers, error: err2 } = await supabase.from('teachers').select('*');
  console.log('Teachers:', teachers?.length || 0, err2?.message || '');
  
  const { data: students, error: err3 } = await supabase.from('students').select('*');
  console.log('Students:', students?.length || 0, err3?.message || '');
}

check();
