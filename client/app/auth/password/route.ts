import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneNumberForAuth, normalizePhoneNumberForStorage } from "@/lib/account-fields";
import {
  mapPasswordSignInServiceError,
  PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE,
} from "@/lib/auth-errors";
import { env } from "@/lib/env";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";

function isEmailIdentifier(value: string) {
  return value.includes("@");
}

function getPhoneLookupCandidates(identifier: string) {
  const normalizedPhone = normalizePhoneNumberForStorage(identifier);

  if (!normalizedPhone) {
    return [];
  }

  const candidates = new Set([normalizedPhone]);

  if (/^\+1\d{10}$/.test(normalizedPhone)) {
    candidates.add(normalizedPhone.slice(2));
    candidates.add(normalizedPhone.slice(1));
  } else if (/^1\d{10}$/.test(normalizedPhone)) {
    candidates.add(normalizedPhone.slice(1));
    candidates.add(`+${normalizedPhone}`);
  } else if (/^\d{10}$/.test(normalizedPhone)) {
    candidates.add(`1${normalizedPhone}`);
    candidates.add(`+1${normalizedPhone}`);
  }

  return [...candidates];
}

async function resolveEmailFromIdentifier(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return identifier.trim().toLowerCase();
  }

  const phoneCandidates = getPhoneLookupCandidates(identifier);

  if (!phoneCandidates.length) {
    return null;
  }

  const supabase = createServerAdminSupabaseClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .in("phone_number", phoneCandidates)
    .limit(2);

  if (error || profiles?.length !== 1) {
    return null;
  }

  const userResult = await supabase.auth.admin.getUserById(profiles[0].id);

  if (userResult.error) {
    return null;
  }

  return userResult.data.user?.email ?? null;
}

function invalidResponse() {
  return NextResponse.json({ error: PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE }, { status: 400 });
}

function signInErrorResponse(error: unknown) {
  const mapped = mapPasswordSignInServiceError(error);
  return NextResponse.json({ error: mapped.error }, { status: mapped.status });
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

  const normalizedPhone = isEmailIdentifier(identifier)
    ? ""
    : normalizePhoneNumberForAuth(identifier);

  if (normalizedPhone) {
    try {
      const { error: phoneError } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      });

      if (!phoneError) {
        return response;
      }

      const phoneFailure = signInErrorResponse(phoneError);
      if (phoneFailure.status === 503) {
        return phoneFailure;
      }
    } catch (error) {
      return signInErrorResponse(error);
    }
  }

  const email = await resolveEmailFromIdentifier(identifier);

  if (!email) {
    return invalidResponse();
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return signInErrorResponse(error);
    }
  } catch (error) {
    return signInErrorResponse(error);
  }

  return response;
}
