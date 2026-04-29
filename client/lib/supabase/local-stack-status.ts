import { env } from "@/lib/env";

export type LocalStackStatus = {
  available: boolean;
  message: string;
};

const SUCCESS_MESSAGE = "Local Supabase is reachable.";
const HOSTED_SUCCESS_MESSAGE = "Hosted Supabase is configured.";
const FAILURE_MESSAGE =
  "Local Supabase looks offline. Start Docker Desktop, run the local Supabase stack, and refresh before trying auth actions.";

export function isLocalSupabaseUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

export async function getLocalSupabaseStatus(): Promise<LocalStackStatus> {
  if (!isLocalSupabaseUrl(env.supabaseUrl)) {
    return {
      available: true,
      message: HOSTED_SUCCESS_MESSAGE,
    };
  }

  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        available: false,
        message: FAILURE_MESSAGE,
      };
    }

    return {
      available: true,
      message: SUCCESS_MESSAGE,
    };
  } catch {
    return {
      available: false,
      message: FAILURE_MESSAGE,
    };
  }
}
