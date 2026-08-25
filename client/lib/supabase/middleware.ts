import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { shouldRefreshSession, tryGetSessionUser } from "@/lib/supabase/session-middleware";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!shouldRefreshSession(request.nextUrl.pathname)) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await tryGetSessionUser(() => supabase.auth.getUser());

  return response;
}
