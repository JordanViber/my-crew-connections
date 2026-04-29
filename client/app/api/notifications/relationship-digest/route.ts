import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { getDashboardData } from "@/lib/mvp-data";
import { sendPushNotification, type PushPayload } from "@/lib/push";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function toSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

async function reserveDelivery(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  userId: string,
  key: string,
) {
  const { error } = await supabase.from("notification_deliveries").insert({
    user_id: userId,
    notification_key: key,
  });

  if (!error) {
    return true;
  }

  return error.code !== "23505";
}

async function sendToUserSubscriptions(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
) {
  await Promise.all(subscriptions.map(async (subscription) => {
    const result = await sendPushNotification(toSubscription(subscription), payload);

    if (!result.ok && (result.statusCode === 404 || result.statusCode === 410)) {
      await supabase.from("push_subscriptions").update({ enabled: false }).eq("id", subscription.id);
    }
  }));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("enabled", true);

  if (error) {
    return NextResponse.json({ error: "Push subscriptions are not ready yet" }, { status: 503 });
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[];
  const subscriptionsByUser = subscriptions.reduce<Map<string, PushSubscriptionRow[]>>((map, subscription) => {
    const current = map.get(subscription.user_id) ?? [];
    current.push(subscription);
    map.set(subscription.user_id, current);
    return map;
  }, new Map());
  const now = Date.now();
  const twentyFourHoursFromNow = now + 1000 * 60 * 60 * 24;
  const dateKey = todayKey();
  let sent = 0;

  for (const [userId, userSubscriptions] of subscriptionsByUser) {
    try {
      const dashboard = await getDashboardData(supabase, userId);
      const approachingHangout = dashboard.upcomingHangouts.find((hangout) => {
        const startsAt = new Date(hangout.startsAt).getTime();
        return startsAt >= now && startsAt <= twentyFourHoursFromNow;
      });

      if (approachingHangout) {
        const reserved = await reserveDelivery(supabase, userId, `hangout:${approachingHangout.id}:approaching:${dateKey}`);

        if (reserved) {
          await sendToUserSubscriptions(supabase, userSubscriptions, {
            title: "Hangout coming up",
            body: `${approachingHangout.title} with ${approachingHangout.targetLabel} is ${approachingHangout.windowLabel}.`,
            url: `/${approachingHangout.targetType === "connection" ? "connections" : "groups"}/${approachingHangout.targetId}`,
            tag: `hangout-${approachingHangout.id}`,
          });
          sent += userSubscriptions.length;
        }
      }

      const attentionCount = dashboard.overdue.length + dashboard.dueSoon.length;

      if (attentionCount > 0) {
        const reserved = await reserveDelivery(supabase, userId, `relationship-digest:${dateKey}`);

        if (reserved) {
          await sendToUserSubscriptions(supabase, userSubscriptions, {
            title: "A relationship needs attention",
            body: `${attentionCount} ${attentionCount === 1 ? "person or group is" : "people or groups are"} due for a check-in.`,
            url: "/dashboard",
            tag: `relationship-digest-${dateKey}`,
          });
          sent += userSubscriptions.length;
        }
      }
    } catch {
      // Skip one user's digest rather than failing the whole scheduled run.
    }
  }

  return NextResponse.json({ ok: true, users: subscriptionsByUser.size, sent });
}
