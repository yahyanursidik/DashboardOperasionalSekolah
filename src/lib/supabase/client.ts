import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
});
