import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/push";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Push subscriptions are not ready yet" }, { status: 503 });
  }

  const row = (data?.[0] ?? null) as PushSubscriptionRow | null;

  if (!row) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
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

  if (!result.ok && (result.statusCode === 404 || result.statusCode === 410)) {
    await supabase.from("push_subscriptions").update({ enabled: false }).eq("id", row.id);
  }

  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 500 });
}
