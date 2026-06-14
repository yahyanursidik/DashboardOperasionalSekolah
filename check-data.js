import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ebdkupeqmpqrdfketgab.supabase.co';
const supabaseKey = 'sb_publishable_AcgH3c3pH9EH2N7XT06YGQ_FRae_uUG';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'ustadz.ahmad@alfatih.demo',
    password: 'password123'
  });
  
  console.log('Login:', auth?.user ? 'Success' : 'Failed', authErr?.message || '');

  const { data: units, error: err1 } = await supabase.from('units').select('*');
  console.log('Units:', units?.length || 0, err1?.message || '');
  
  const { data: teachers, error: err2 } = await supabase.from('teachers').select('*');
  console.log('Teachers:', teachers?.length || 0, err2?.message || '');
  
  const { data: students, error: err3 } = await supabase.from('students').select('*');
  console.log('Students:', students?.length || 0, err3?.message || '');
}

check();
