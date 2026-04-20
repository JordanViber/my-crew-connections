import { createConnectionAction } from "@/app/actions";

const cadenceOptions = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "days", label: "Days" },
] as const;

export function ConnectionCreateForm() {
  return (
    <form action={createConnectionAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="field-label">Name</span>
        <input className="field-input" name="displayName" type="text" placeholder="Jordan, Alexis, dinner crew organizer" required />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Link to real user now</span>
        <input className="field-input" name="inviteEmail" type="email" placeholder="Optional email to start the invite now" />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Tags</span>
        <input className="field-input" name="tags" type="text" placeholder="close friend, local, long-distance" />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="field-label">Cadence value</span>
          <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue="3" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Unit</span>
          <select className="field-input" name="cadenceUnit" defaultValue="weeks">
            {cadenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">Reminder lead</span>
          <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue="5" required />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="field-label">Preferred activities</span>
        <input className="field-input" name="preferredActivities" type="text" placeholder="Walks, coffee, dinner, game night" />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Private notes</span>
        <textarea className="field-input min-h-28" name="notes" placeholder="Anything useful to remember later." />
      </label>
      <p className="text-sm leading-6 text-foreground/68">
        Creating a person immediately adds them to the reminder loop. If you include an email, the invite starts right away so you do not have to come back and do it separately.
      </p>
      <button className="button-primary" type="submit">
        Create connection
      </button>
    </form>
  );
}
