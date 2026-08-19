import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && anonKey ? { url, anonKey } : null;
}

export function createBrowserSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  return config ? createClient(config.url, config.anonKey) : null;
}
