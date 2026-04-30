import type { SupabaseClient } from "@supabase/supabase-js";
import webpush, { type PushSubscription } from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;

function configureWebPush() {
  if (configured) {
    return true;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:jordankdog44@yahoo.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushNotification(subscription: PushSubscription, payload: PushPayload) {
  if (!configureWebPush()) {
    return { ok: false, statusCode: 500 };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, statusCode: 200 };
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : 500;

    return { ok: false, statusCode };
  }
}

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function toSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (error || !data?.length) {
    return { sent: 0 };
  }

  let sent = 0;

  await Promise.all(data.map(async (subscription) => {
    const result = await sendPushNotification(toSubscription(subscription), payload);

    if (result.ok) {
      sent += 1;
      return;
    }

    if (result.statusCode === 404 || result.statusCode === 410) {
      await supabase.from("push_subscriptions").update({ enabled: false }).eq("id", subscription.id);
    }
  }));

  return { sent };
}
