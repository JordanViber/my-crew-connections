"use client";

function toDateTimeLocalValue(hoursFromNow = 72) {
  const now = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function HangoutPlanForm({
  action,
  subjectLabel,
  targetType,
  targetId,
  redirectTo,
}: Readonly<{
  action: (formData: FormData) => void | Promise<void>;
  subjectLabel: string;
  targetType: "connection" | "group";
  targetId: string;
  redirectTo: string;
}>) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="grid gap-2">
        <span className="field-label">Title</span>
        <input className="field-input" defaultValue={`${subjectLabel} hangout`} name="title" type="text" required />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Starts</span>
          <input className="field-input" defaultValue={toDateTimeLocalValue()} name="startsAt" type="datetime-local" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Ends</span>
          <input className="field-input" defaultValue={toDateTimeLocalValue(74)} name="endsAt" type="datetime-local" />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="field-label">Location</span>
        <input className="field-input" name="location" placeholder="Cafe patio, park loop, dinner spot" type="text" />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Planning note</span>
        <textarea
          className="field-input min-h-24"
          name="notes"
          placeholder="Why this plan matters, what to remember, or what to bring up."
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Photo album label</span>
          <input className="field-input" name="photoAlbumLabel" placeholder="Shared Google Photos album" type="text" />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Photo album link</span>
          <input className="field-input" name="photoAlbumUrl" placeholder="https://..." type="url" />
        </label>
      </div>
      <p className="text-sm leading-6 text-foreground/68">
        {targetType === "group"
          ? "Sending this proposal starts the RSVP flow for group members with app access, and accepted members can export it to calendar right away."
          : "Saving keeps this plan on the dashboard until it is completed, canceled, or exported to calendar."}
      </p>
      <button className="button-primary" type="submit">
        {targetType === "group" ? "Send proposal" : "Save plan"}
      </button>
    </form>
  );
}
