import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneNumberForStorage } from "@/lib/account-fields";
import { env } from "@/lib/env";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";

function isEmailIdentifier(value: string) {
  return value.includes("@");
}

async function resolveEmailFromIdentifier(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return identifier.trim().toLowerCase();
  }

  const normalizedPhone = normalizePhoneNumberForStorage(identifier);

  if (!normalizedPhone) {
    return null;
  }

  const supabase = createServerAdminSupabaseClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", normalizedPhone)
    .limit(2);

  if (error || !profiles || profiles.length !== 1) {
    return null;
  }

  const userResult = await supabase.auth.admin.getUserById(profiles[0].id);

  if (userResult.error) {
    return null;
  }

  return userResult.data.user?.email ?? null;
}

function invalidResponse() {
  return NextResponse.json({ error: "Invalid email, phone, or password." }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    identifier?: string;
    password?: string;
  } | null;
  const identifier = payload?.identifier?.trim() ?? "";
  const password = payload?.password ?? "";

  if (!identifier || !password) {
    return invalidResponse();
  }

  const email = await resolveEmailFromIdentifier(identifier);

  if (!email) {
    return invalidResponse();
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return invalidResponse();
  }

  return response;
}
