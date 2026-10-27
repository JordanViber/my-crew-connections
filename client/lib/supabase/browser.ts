import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { browserSupabaseClientOptions } from "@/lib/passkey-client";

export function createBrowserSupabaseClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, browserSupabaseClientOptions());
}
