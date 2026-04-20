import { env } from "@/lib/env";

export type LocalStackStatus = {
  available: boolean;
  message: string;
};

const SUCCESS_MESSAGE = "Local Supabase is reachable.";
const FAILURE_MESSAGE =
  "Local Supabase looks offline. Start Docker Desktop, run the local Supabase stack, and refresh before trying auth actions.";

export async function getLocalSupabaseStatus(): Promise<LocalStackStatus> {
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
