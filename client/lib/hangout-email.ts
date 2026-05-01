import { Resend } from "resend";
import { getAppUrl } from "@/lib/billing";

export type HangoutEmailDeliveryStatus = "sent" | "failed" | "not_configured";

export type HangoutEmailResult = {
  provider: "resend" | null;
  status: HangoutEmailDeliveryStatus;
  sent: boolean;
  messageId?: string;
  errorMessage?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getInviterLabel(inviterName?: string | null) {
  const normalized = inviterName?.trim();
  return normalized || "Someone";
}

function getFromAddress() {
  return process.env.INVITE_EMAIL_FROM || "My Crew Connections <no-reply@auth.mycrewconnections.app>";
}

function buildGroupHangoutUrl(groupId: string) {
  return `${getAppUrl()}/groups/${groupId}`;
}

function buildHangoutProposalEmailHtml(
  inviterName: string,
  groupName: string,
  hangoutTitle: string,
  whenLabel: string,
  reviewUrl: string,
  location?: string,
) {
  const inviter = escapeHtml(inviterName);
  const group = escapeHtml(groupName);
  const title = escapeHtml(hangoutTitle);
  const when = escapeHtml(whenLabel);
  const url = escapeHtml(reviewUrl);
  const place = location?.trim() ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#4a3b33;"><strong>Where:</strong> ${escapeHtml(location)}</p>` : "";

  return `
    <div style="background:#f3efe4;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#201816;">
      <div style="max-width:560px;margin:0 auto;background:#fffdf7;border:1px solid #d9cfbb;border-radius:18px;padding:32px;box-shadow:0 12px 30px rgba(42,31,22,0.08);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8c684f;font-weight:700;">Hangout proposal</p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#201816;">${inviter} proposed a hangout in ${group}.</h1>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#4a3b33;">
          <strong>${title}</strong> is currently waiting on responses from the group.
        </p>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#4a3b33;"><strong>When:</strong> ${when}</p>
        ${place}
        <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#4a3b33;">
          Open the app to accept or decline it. Accepting will immediately make the calendar export available for you.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${url}" style="display:inline-block;background:#1d6b57;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:700;">Review proposal</a>
        </p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6f6258;">If the button does not work, use this link:</p>
        <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;"><a href="${url}" style="color:#1d6b57;">${url}</a></p>
      </div>
    </div>
  `.trim();
}

function buildHangoutProposalEmailText(
  inviterName: string,
  groupName: string,
  hangoutTitle: string,
  whenLabel: string,
  reviewUrl: string,
  location?: string,
) {
  return [
    `${inviterName} proposed a hangout in ${groupName}.`,
    "",
    `Plan: ${hangoutTitle}`,
    `When: ${whenLabel}`,
    location ? `Where: ${location}` : "",
    "",
    "Open the app to accept or decline it. Accepting will make the calendar export available for you right away:",
    reviewUrl,
  ].filter(Boolean).join("\n");
}

export async function sendHangoutProposalEmail({
  to,
  groupId,
  groupName,
  hangoutTitle,
  whenLabel,
  location,
  inviterName,
}: Readonly<{
  to: string;
  groupId: string;
  groupName: string;
  hangoutTitle: string;
  whenLabel: string;
  location?: string | null;
  inviterName?: string | null;
}>) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      provider: null,
      status: "not_configured",
      sent: false,
      errorMessage: "Missing RESEND_API_KEY.",
    } satisfies HangoutEmailResult;
  }

  const resend = new Resend(apiKey);
  const reviewUrl = buildGroupHangoutUrl(groupId);
  const inviterLabel = getInviterLabel(inviterName);

  try {
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: `${inviterLabel} proposed ${hangoutTitle}`,
      html: buildHangoutProposalEmailHtml(inviterLabel, groupName, hangoutTitle, whenLabel, reviewUrl, location ?? undefined),
      text: buildHangoutProposalEmailText(inviterLabel, groupName, hangoutTitle, whenLabel, reviewUrl, location ?? undefined),
      headers: {
        "X-Entity-Ref-ID": `${groupId}:${hangoutTitle}`,
      },
    });

    return {
      provider: "resend",
      status: result.error ? "failed" : "sent",
      sent: !result.error,
      messageId: result.data?.id,
      errorMessage: result.error?.message,
    } satisfies HangoutEmailResult;
  } catch (error) {
    return {
      provider: "resend",
      status: "failed",
      sent: false,
      errorMessage: error instanceof Error ? error.message : "Unknown hangout email error.",
    } satisfies HangoutEmailResult;
  }
}