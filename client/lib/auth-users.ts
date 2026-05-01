import type { SupabaseClient } from "@supabase/supabase-js";

export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(`Failed to search auth users: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  return null;
}

export async function getAuthUserById(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(`Failed to load auth user: ${error.message}`);
  }

  return data.user ?? null;
}
