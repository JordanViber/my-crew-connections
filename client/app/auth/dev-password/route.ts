import { NextRequest, NextResponse } from "next/server";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { accountRegistrationSchema } from "@/lib/validations";
import { getDefaultCountry, normalizePhoneNumberForStorage } from "@/lib/account-fields";

type Payload = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

function buildDisplayName(firstName: string, lastName: string, email: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return email.split("@")[0] || "New account";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload;
    const email = body.email?.trim() ?? "";
    const firstName = body.firstName?.trim() || email.split("@")[0] || "Local";
    const lastName = body.lastName?.trim() || "Account";
    const payload = accountRegistrationSchema.parse({
      email,
      password: body.password ?? "",
      firstName,
      lastName,
      phoneNumber: normalizePhoneNumberForStorage(body.phoneNumber ?? ""),
      addressLine1: body.addressLine1 ?? "",
      addressLine2: body.addressLine2 ?? "",
      city: body.city ?? "",
      region: body.region ?? "",
      postalCode: body.postalCode ?? "",
      country: getDefaultCountry(body.country ?? ""),
    });
    const displayName = buildDisplayName(payload.firstName, payload.lastName, payload.email);
    const userMetadata = {
      display_name: displayName,
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone_number: payload.phoneNumber || null,
      billing_address_line1: payload.addressLine1 || null,
      billing_address_line2: payload.addressLine2 || null,
      billing_city: payload.city || null,
      billing_region: payload.region || null,
      billing_postal_code: payload.postalCode || null,
      billing_country: payload.country || null,
    };

    const supabase = createServerAdminSupabaseClient();
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const existingUser = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    let userId = existingUser?.id;

    if (existingUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: payload.password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      userId = createdUser.user?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unable to determine the account id for this user." }, { status: 500 });
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        display_name: displayName,
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone_number: payload.phoneNumber || null,
        billing_address_line1: payload.addressLine1 || null,
        billing_address_line2: payload.addressLine2 || null,
        billing_city: payload.city || null,
        billing_region: payload.region || null,
        billing_postal_code: payload.postalCode || null,
        billing_country: payload.country || null,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not reach local Supabase. Start Docker Desktop and the local Supabase stack, then try again.",
      },
      { status: 500 },
    );
  }
}
