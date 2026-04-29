"use client";

import { useState } from "react";

export function InviteLinkPanel({
  inviteUrl,
}: Readonly<{
  inviteUrl: string;
}>) {
  const [copied, setCopied] = useState(false);

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border/85 bg-white/78 p-3.5">
      <label className="grid gap-2">
        <span className="field-label">Invite link</span>
        <input className="field-input" readOnly value={inviteUrl} />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="button-primary w-full sm:w-auto" onClick={copyInviteUrl} type="button">
          {copied ? "Copied" : "Copy invite link"}
        </button>
        <a className="button-secondary w-full sm:w-auto" href={inviteUrl}>
          Open invite preview
        </a>
      </div>
    </div>
  );
}
