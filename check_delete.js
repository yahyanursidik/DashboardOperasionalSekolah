import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const empId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04'; // Ustadz Furqon

  // 1. Try to delete it as anon (or service role if we use it)
  // Let's just check related records to understand why it might fail due to FK constraints.
  
  const tablesToCheck = [
    'employee_attendance',
    'leave_requests',
    'employee_schedules',
    'teacher_assignments',
    'homeroom_assignments',
    'recruitment_interviews',
    'paud_stppa_assessments',
    'quran_assessments'
  ];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', empId);
      
      if (error) {
        console.log(`Error checking ${table}:`, error.message);
      } else if (count > 0) {
        console.log(`Found ${count} records in ${table}`);
      }
    } catch (e) {}
  }
}

main();
