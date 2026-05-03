import type { SupabaseClient } from "@supabase/supabase-js";

type InAppNotificationPayload = {
  title: string;
  body: string;
  href?: string;
  category?: string;
  metadata?: Record<string, unknown>;
};

export async function createInAppNotification(
  supabase: SupabaseClient,
  userId: string,
  payload: InAppNotificationPayload,
) {
  const { error } = await supabase.from("in_app_notifications").insert({
    user_id: userId,
    category: payload.category ?? "general",
    title: payload.title,
    body: payload.body,
    href: payload.href ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to create in-app notification: ${error.message}`);
  }
}
