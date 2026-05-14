"use client";

import { useState } from "react";

type ConnectionIdentityFieldsProps = {
  initialContactEmail?: string;
  initialDisplayName?: string;
  initiallyUsesProfileName?: boolean;
};

export function ConnectionIdentityFields({
  initialContactEmail = "",
  initialDisplayName = "",
  initiallyUsesProfileName = false,
}: Readonly<ConnectionIdentityFieldsProps>) {
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const inviteable = contactEmail.trim().length > 0;
  const displayNameLabel = inviteable ? "Your label for them" : "Name";
  const displayNamePlaceholder = inviteable
    ? "Optional. Leave blank to use their account name after they join"
    : "Jordan, Alexis, dinner crew organizer";
  const helperText = inviteable
    ? "Optional. If you leave this blank, the app will switch to their real account name once they claim the invite."
    : "Use whatever name helps you recognize this person. You can add an email or invite them later.";

  return (
    <>
      <label className="grid gap-2">
        <span className="field-label">Contact email</span>
        <input
          autoComplete="email"
          className="field-input"
          defaultValue={initialContactEmail}
          name="contactEmail"
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="Optional email to save on this person"
          type="email"
        />
      </label>
      {inviteable ? (
        <label className="flex items-start gap-3 rounded-lg border border-border/80 bg-white/76 px-3 py-3 text-sm text-foreground/72">
          <input className="mt-1 h-4 w-4 shrink-0" name="sendInviteNow" type="checkbox" value="true" />
          <span>Invite them to view and manage this connection as well.</span>
        </label>
      ) : null}
      <label className="grid gap-2">
        <span className="field-label">{displayNameLabel}</span>
        <input
          className="field-input"
          defaultValue={initiallyUsesProfileName ? "" : initialDisplayName}
          name="displayName"
          placeholder={displayNamePlaceholder}
          required={!inviteable}
          type="text"
        />
      </label>
      <p className="text-sm leading-6 text-foreground/64">{helperText}</p>
    </>
  );
}
