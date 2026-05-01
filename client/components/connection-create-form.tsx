import { createConnectionAction } from "@/app/actions";
import { ConnectionIdentityFields } from "@/components/connection-identity-fields";

const cadenceOptions = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "days", label: "Days" },
] as const;

export function ConnectionCreateForm() {
  return (
    <form action={createConnectionAction} className="grid gap-3">
      <ConnectionIdentityFields />
      <label className="flex items-start gap-3 rounded-lg border border-border/80 bg-white/76 px-3 py-3 text-sm text-foreground/72">
        <input className="mt-1 h-4 w-4 shrink-0" name="sendInviteNow" type="checkbox" value="true" />
        <span>Send the invite right away if a contact email is present.</span>
      </label>
      <label className="grid gap-2">
        <span className="field-label">Tags</span>
        <input className="field-input" name="tags" type="text" placeholder="close friend, local, long-distance" />
      </label>
      <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_1.35fr]">
        <label className="grid gap-2">
          <span className="field-label">Every</span>
          <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue="3" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Cadence unit</span>
          <select className="field-input" name="cadenceUnit" defaultValue="weeks">
            {cadenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">Remind me days before</span>
          <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue="5" required />
        </label>
      </div>
      <p className="text-xs leading-5 text-foreground/56">Example: every 3 months, remind me 5 days before it is due.</p>
      <label className="grid gap-2">
        <span className="field-label">Preferred activities</span>
        <input className="field-input" name="preferredActivities" type="text" placeholder="Walks, coffee, dinner, game night" />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Private notes</span>
        <textarea className="field-input min-h-24" name="notes" placeholder="Anything useful to remember later." />
      </label>
      <p className="text-sm leading-6 text-foreground/64">Saving an email prevents duplicate people and keeps the invite address ready even if you do not send it yet.</p>
      <button className="button-primary" type="submit">
        Create connection
      </button>
    </form>
  );
}
