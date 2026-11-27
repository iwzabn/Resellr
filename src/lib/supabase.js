import { createClient } from "@supabase/supabase-js";

// Public values (safe to ship to the browser); override with VITE_ variables if needed.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://suyykdvrdxyyestnspuz.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1eXlrZHZyZHh5eWVzdG5zcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MzA0NTIsImV4cCI6MjExMTMwNjQ1Mn0.LwualZ4uWmyu5QXMSpq89jqHvlcIeDOY-JLk468Ric0";
export const API_URL = `${SUPABASE_URL}/functions/v1/api`;

let client;
// Browser-only: the visitor's session lives in localStorage.
export const getSupabase = () => {
  if (typeof window === "undefined") return null;
  return (client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
};

export const getAccessToken = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};
