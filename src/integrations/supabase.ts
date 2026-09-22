import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"];
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
if (!url || !key) throw new Error("Saknar VITE_SUPABASE_URL eller VITE_SUPABASE_PUBLISHABLE_KEY.");

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
