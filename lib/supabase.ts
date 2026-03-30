import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — safe to use in client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client — use in server components and API routes
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
