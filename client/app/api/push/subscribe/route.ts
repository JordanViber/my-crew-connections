import { NextResponse } from "next/server";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushStatusRow = {
  id: string;
  enabled: boolean;
  device_family: string | null;
  browser_name: string | null;
  install_state: string | null;
  permission_state: string | null;
  last_seen_at: string;
  last_subscribed_at: string | null;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  last_delivery_error: string | null;
};

export async function GET() {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, enabled, device_family, browser_name, install_state, permission_state, last_seen_at, last_subscribed_at, last_delivery_at, last_delivery_status, last_delivery_error")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: "Push subscription status is unavailable" }, { status: 503 });
  }

  return NextResponse.json({ subscription: (data?.[0] ?? null) as PushStatusRow | null });
}

export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json() as {
    subscription?: PushSubscriptionPayload;
    platform?: string;
    permissionState?: string;
    deviceFamily?: string;
    browserName?: string;
    installState?: string;
  };
  const subscription = payload.subscription;

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = createServerAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: request.headers.get("user-agent"),
      platform: payload.platform ?? null,
      device_family: payload.deviceFamily ?? null,
      browser_name: payload.browserName ?? null,
      install_state: payload.installState ?? null,
      permission_state: payload.permissionState ?? null,
      enabled: true,
      last_seen_at: now,
      last_subscription_status: "subscribed",
      last_subscription_error: null,
      last_subscribed_at: now,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: "Push subscriptions are not ready yet" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
