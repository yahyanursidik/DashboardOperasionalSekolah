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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const UNIT_ID = '33333333-3333-3333-3333-333333333333';

async function checkDependencies() {
  console.log(`Checking all possible tables for unit_id: ${UNIT_ID}`);
  
  const tables = [
    'students',
    'classes',
    'employees',
    'subjects',
    'extracurriculars',
    'paud_themes',
    'curriculum_documents',
    'vacancies',
    'cbt_exams',
    'admissions_settings',
    'admissions_fees',
    'student_invoices',
    'school_expenses',
    'mail_records',
    'rooms',
    'assets',
    'attendance_records',
    'employee_attendances',
    'schedules',
    'documents'
  ];

  let foundDeps = false;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').eq('unit_id', UNIT_ID).limit(1);
      if (error) {
        // ignore
      } else if (data && data.length > 0) {
        console.log(`[FOUND] Table '${table}' has records connected to this unit!`);
        foundDeps = true;
      }
    } catch (e) {}
  }

  if (!foundDeps) {
    console.log("No dependencies found in common tables. The error might be a bug in the UI validation code or another table.");
  }
}

checkDependencies();
