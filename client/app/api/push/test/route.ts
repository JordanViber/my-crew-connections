import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/push";
import {
  describePushServiceFailure,
  noAccountSubscriptionMessage,
  pushSignInAgainMessage,
  pushSubscriptionsUnavailableMessage,
} from "@/lib/push-messages";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST() {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: pushSignInAgainMessage, statusCode: 401 }, { status: 401 });
  }

  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({
      ok: false,
      message: pushSubscriptionsUnavailableMessage,
      statusCode: 503,
    }, { status: 503 });
  }

  const row = (data?.[0] ?? null) as PushSubscriptionRow | null;

  if (!row) {
    return NextResponse.json({
      ok: false,
      message: noAccountSubscriptionMessage,
      statusCode: 404,
    }, { status: 404 });
  }

  const result = await sendPushNotification(
    {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    },
    {
      title: "Notifications are on",
      body: "You will get reminders when relationships or plans need attention.",
      url: "/dashboard",
      tag: "mcc-test",
    },
  );

  const now = new Date().toISOString();
  const update = {
    last_delivery_at: now,
    last_delivery_source: "test",
    last_delivery_status: result.ok ? "sent" : `failed:${result.statusCode}`,
    last_delivery_error: result.errorMessage ?? null,
  };

  await supabase.from("push_subscriptions").update(update).eq("id", row.id);

  const subscriptionExpired = !result.ok && (result.statusCode === 404 || result.statusCode === 410);

  if (subscriptionExpired) {
    await supabase.from("push_subscriptions").update({ enabled: false }).eq("id", row.id);
  }

  const message = result.ok
    ? "Test notification sent."
    : describePushServiceFailure(result.statusCode, result.errorMessage);

  return NextResponse.json(
    {
      ok: result.ok,
      message,
      statusCode: result.statusCode,
    },
    { status: result.ok ? 200 : subscriptionExpired ? 410 : 502 },
  );
}
