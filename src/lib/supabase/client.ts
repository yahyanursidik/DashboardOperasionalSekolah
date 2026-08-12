import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
});

// Public catalogue reads must not inherit a stale portal login token. Keeping a
// separate, non-persistent client makes public RPCs consistently use the anon
// role even while a parent is signed in with an older session.
export const supabasePublicClient = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
    storageKey: "tsls-public-anon",
  },
  db: {
    schema: "public",
  },
});
