import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Fallback placeholder URL prevents top-level module throw if env vars are unconfigured
const envUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL);
const envKey = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY));

const supabaseUrl = envUrl || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-anon-key';

if (!envUrl || !envKey) {
  console.warn(
    '[Supabase] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY is not defined in environment.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type TypedSupabaseClient = typeof supabase;
