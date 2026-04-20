import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleKey() {
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for server-side data access.");
  }

  return serviceRoleKey;
}

export function createServerAdminSupabaseClient() {
  return createClient(env.supabaseUrl, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
