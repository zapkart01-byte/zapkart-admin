import { createClient } from '@supabase/supabase-js'

// Supabase URL from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Supabase anonymous key — subject to RLS policies
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validates that required Supabase environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

// Creates and exports the Supabase client instance for all database operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
