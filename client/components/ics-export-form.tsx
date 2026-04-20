"use client";

function toDateTimeLocalValue(hoursFromNow = 72) {
  const now = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function IcsExportForm({
  subjectType,
  subjectLabel,
}: Readonly<{
  subjectType: "connection" | "group";
  subjectLabel: string;
}>) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const startValue = toDateTimeLocalValue();
  const endValue = toDateTimeLocalValue(74);

  return (
    <form action="/plan.ics" className="grid gap-4" method="get">
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="targetType" value={subjectType} />
      <input type="hidden" name="targetLabel" value={subjectLabel} />
      <label className="grid gap-2">
        <span className="field-label">Title</span>
        <input className="field-input" defaultValue={`${subjectLabel} hangout`} name="title" type="text" required />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Starts</span>
          <input className="field-input" defaultValue={startValue} name="startsAt" type="datetime-local" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Ends</span>
          <input className="field-input" defaultValue={endValue} name="endsAt" type="datetime-local" />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="field-label">Location</span>
        <input className="field-input" name="location" placeholder="Optional freeform location" type="text" />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Planning note</span>
        <textarea
          className="field-input min-h-24"
          name="description"
          placeholder="What is the plan, and anything worth remembering before you send the invite?"
        />
      </label>
      <p className="text-sm leading-6 text-foreground/68">
        This downloads an ICS file you can drop into Apple Calendar, Google Calendar, or Outlook without needing a direct calendar integration.
      </p>
      <button className="button-primary" type="submit">
        Download calendar file
      </button>
    </form>
  );
}
