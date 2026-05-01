import { Resend } from "resend";
import { getAppUrl } from "@/lib/billing";
import { GENERIC_CONNECTION_INVITE_LABEL } from "@/lib/connection-display";
import { buildConnectionInviteUrl, buildGroupInviteUrl } from "@/lib/invites";

export type InviteEmailDeliveryStatus = "pending" | "sent" | "failed" | "not_configured" | "suppressed";

export type InviteEmailResult = {
  provider: "resend" | null;
  status: InviteEmailDeliveryStatus;
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
  return process.env.INVITE_EMAIL_FROM || 'My Crew Connections <no-reply@auth.mycrewconnections.app>';
}

function buildInviteEmailHtml(inviterName: string, connectionName: string, inviteUrl: string) {
  const inviter = escapeHtml(inviterName);
  const connection = escapeHtml(connectionName);
  const url = escapeHtml(inviteUrl);
  const genericConnection = connectionName === GENERIC_CONNECTION_INVITE_LABEL;

  return `
    <div style="background:#f3efe4;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#201816;">
      <div style="max-width:560px;margin:0 auto;background:#fffdf7;border:1px solid #d9cfbb;border-radius:18px;padding:32px;box-shadow:0 12px 30px rgba(42,31,22,0.08);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8c684f;font-weight:700;">Connection invite</p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#201816;">${inviter} invited you to My Crew Connections.</h1>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#4a3b33;">
          ${genericConnection
            ? "They created a relationship entry and want to link it to your real account."
            : `They created a relationship entry for <strong>${connection}</strong> and want to link it to your real account.`}
        </p>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#4a3b33;">
          Open the invite, then sign in or create your account on the site. Once you finish, you can claim the connection directly in the app.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${url}" style="display:inline-block;background:#1d6b57;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:700;">Open invite</a>
        </p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6f6258;">If the button does not work, use this link:</p>
        <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;"><a href="${url}" style="color:#1d6b57;">${url}</a></p>
      </div>
    </div>
  `.trim();
}

function buildInviteEmailText(inviterName: string, connectionName: string, inviteUrl: string) {
  const genericConnection = connectionName === GENERIC_CONNECTION_INVITE_LABEL;

  return [
    `${inviterName} invited you to My Crew Connections.`,
    "",
    genericConnection ? "A connection is waiting to be linked to your real account." : `${connectionName} is waiting to be linked to your real account.`,
    "",
    "Open the invite below, then sign in or create your account to claim it:",
    inviteUrl,
  ].join("\n");
}

function buildGroupInviteEmailHtml(inviterName: string, groupName: string, connectionName: string, inviteUrl: string) {
  const inviter = escapeHtml(inviterName);
  const group = escapeHtml(groupName);
  const connection = escapeHtml(connectionName);
  const url = escapeHtml(inviteUrl);

  return `
    <div style="background:#f3efe4;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#201816;">
      <div style="max-width:560px;margin:0 auto;background:#fffdf7;border:1px solid #d9cfbb;border-radius:18px;padding:32px;box-shadow:0 12px 30px rgba(42,31,22,0.08);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8c684f;font-weight:700;">Group invite</p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#201816;">${inviter} invited you to join ${group}.</h1>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#4a3b33;">
          You were invited to join this crew in My Crew Connections as <strong>${connection}</strong>.
        </p>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#4a3b33;">
          Open the invite, then accept or decline it after you sign in. The group will stay pending until you respond.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${url}" style="display:inline-block;background:#1d6b57;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:700;">Review invite</a>
        </p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6f6258;">If the button does not work, use this link:</p>
        <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;"><a href="${url}" style="color:#1d6b57;">${url}</a></p>
      </div>
    </div>
  `.trim();
}

function buildGroupInviteEmailText(inviterName: string, groupName: string, connectionName: string, inviteUrl: string) {
  return [
    `${inviterName} invited you to join ${groupName} on My Crew Connections.`,
    "",
    `You will appear in the group as ${connectionName} once you accept.`,
    "",
    "Open the invite below, then accept or decline it after you sign in:",
    inviteUrl,
  ].join("\n");
}

export async function sendConnectionInviteEmail({
  to,
  token,
  connectionName,
  inviterName,
}: Readonly<{
  to: string;
  token: string;
  connectionName: string;
  inviterName?: string | null;
}>) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      provider: null,
      status: "not_configured",
      sent: false,
      errorMessage: "Missing RESEND_API_KEY.",
    } satisfies InviteEmailResult;
  }

  const resend = new Resend(apiKey);
  const inviteUrl = buildConnectionInviteUrl(getAppUrl(), token);
  const inviterLabel = getInviterLabel(inviterName);

  try {
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: `${inviterLabel} invited you to My Crew Connections`,
      html: buildInviteEmailHtml(inviterLabel, connectionName, inviteUrl),
      text: buildInviteEmailText(inviterLabel, connectionName, inviteUrl),
      headers: {
        "X-Entity-Ref-ID": token,
      },
    });

    return {
      provider: "resend",
      status: result.error ? "failed" : "sent",
      sent: !result.error,
      messageId: result.data?.id,
      errorMessage: result.error?.message,
    } satisfies InviteEmailResult;
  } catch (error) {
    return {
      provider: "resend",
      status: "failed",
      sent: false,
      errorMessage: error instanceof Error ? error.message : "Unknown invite email error.",
    } satisfies InviteEmailResult;
  }
}

export async function sendGroupInviteEmail({
  to,
  token,
  groupName,
  connectionName,
  inviterName,
}: Readonly<{
  to: string;
  token: string;
  groupName: string;
  connectionName: string;
  inviterName?: string | null;
}>) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      provider: null,
      status: "not_configured",
      sent: false,
      errorMessage: "Missing RESEND_API_KEY.",
    } satisfies InviteEmailResult;
  }

  const resend = new Resend(apiKey);
  const inviteUrl = buildGroupInviteUrl(getAppUrl(), token);
  const inviterLabel = getInviterLabel(inviterName);

  try {
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: `${inviterLabel} invited you to join ${groupName}`,
      html: buildGroupInviteEmailHtml(inviterLabel, groupName, connectionName, inviteUrl),
      text: buildGroupInviteEmailText(inviterLabel, groupName, connectionName, inviteUrl),
      headers: {
        "X-Entity-Ref-ID": token,
      },
    });

    return {
      provider: "resend",
      status: result.error ? "failed" : "sent",
      sent: !result.error,
      messageId: result.data?.id,
      errorMessage: result.error?.message,
    } satisfies InviteEmailResult;
  } catch (error) {
    return {
      provider: "resend",
      status: "failed",
      sent: false,
      errorMessage: error instanceof Error ? error.message : "Unknown group invite email error.",
    } satisfies InviteEmailResult;
  }
}
