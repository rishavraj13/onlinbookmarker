import { createClient } from '@supabase/supabase-js';

// We use import.meta.env for Astro
// These should be set in .env: 
// PUBLIC_SUPABASE_URL=...
// PUBLIC_SUPABASE_ANON_KEY=...

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

// Create a single supabase client for interacting with your database
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
