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
