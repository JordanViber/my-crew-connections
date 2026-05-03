import { type SupabaseClient } from "@supabase/supabase-js";
import { getAuthUserById } from "@/lib/auth-users";
import { sendHangoutProposalEmail, type HangoutEmailDeliveryStatus } from "@/lib/hangout-email";
import { createInAppNotification } from "@/lib/in-app-notifications";
import { sendPushToUser } from "@/lib/push";

export type HangoutNotificationResult = {
  delivery: "push" | "email" | "ready";
  pushSent: boolean;
  emailSent: boolean;
  emailStatus: HangoutEmailDeliveryStatus | "suppressed";
  emailMessageId?: string;
  errorMessage?: string;
};

export async function notifyHangoutProposalParticipant(
  supabase: SupabaseClient,
  participantUserId: string,
  groupId: string,
  groupName: string,
  hangoutId: string,
  hangoutTitle: string,
  whenLabel: string,
  location?: string | null,
  inviterName?: string | null,
): Promise<HangoutNotificationResult> {
  const recipient = await getAuthUserById(supabase, participantUserId);

  if (!recipient) {
    return {
      delivery: "ready",
      pushSent: false,
      emailSent: false,
      emailStatus: "failed",
      errorMessage: "Participant account could not be loaded for hangout notification.",
    };
  }

  await createInAppNotification(supabase, participantUserId, {
    category: "hangout-proposal",
    title: "New hangout proposal",
    body: `${inviterName?.trim() || "Someone"} proposed ${hangoutTitle} for ${whenLabel}. Open the app to RSVP.`,
    href: `/groups/${groupId}`,
    metadata: { hangoutId, groupId, groupName, location },
  }).catch(() => undefined);

  const pushResult = await sendPushToUser(supabase, participantUserId, {
    title: "New hangout proposal",
    body: `${inviterName?.trim() || "Someone"} proposed ${hangoutTitle} for ${whenLabel}. Open the app to RSVP.`,
    url: `/groups/${groupId}`,
    tag: `hangout-proposal-${hangoutId}`,
  }).catch(() => ({ sent: 0 }));

  if (pushResult.sent > 0) {
    return {
      delivery: "push",
      pushSent: true,
      emailSent: false,
      emailStatus: "suppressed",
    };
  }

  if (!recipient.email) {
    return {
      delivery: "ready",
      pushSent: false,
      emailSent: false,
      emailStatus: "failed",
      errorMessage: "Participant account does not have an email address for fallback delivery.",
    };
  }

  const emailResult = await sendHangoutProposalEmail({
    to: recipient.email,
    groupId,
    groupName,
    hangoutTitle,
    whenLabel,
    location,
    inviterName,
  });

  return {
    delivery: emailResult.sent ? "email" : "ready",
    pushSent: false,
    emailSent: emailResult.sent,
    emailStatus: emailResult.status,
    emailMessageId: emailResult.messageId,
    errorMessage: emailResult.errorMessage,
  };
}