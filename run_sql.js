import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// We need the service role key to execute raw SQL, or we can use the supabase cli
// Actually, supabase JS client does not support executing raw SQL queries directly over the REST API without an RPC.
