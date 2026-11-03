import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== "undefined"
    ? process.env?.["VITE_SUPABASE_URL"] || process.env?.["SUPABASE_URL"]
    : undefined);

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== "undefined"
    ? process.env?.["VITE_SUPABASE_ANON_KEY"] || process.env?.["SUPABASE_ANON_KEY"]
    : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
