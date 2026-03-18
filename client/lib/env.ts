const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env. Generate client/.env.local from the local stack before running the app.",
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
};