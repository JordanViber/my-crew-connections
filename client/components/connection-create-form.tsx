import { createConnectionAction } from "@/app/actions";
import { ConnectionIdentityFields } from "@/components/connection-identity-fields";
import { PendingSubmitButton } from "@/components/pending-submit-button";

const cadenceOptions = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "days", label: "Days" },
] as const;

export function ConnectionCreateForm() {
  return (
    <form action={createConnectionAction} className="grid gap-3">
      <ConnectionIdentityFields />
      <div className="rounded-lg border border-border/80 bg-white/72 p-3">
        <p className="text-sm font-semibold text-foreground">How often should this feel active?</p>
        <p className="mt-1 text-sm leading-6 text-foreground/64">
          The first timer starts today. After you log a touchpoint, it resets from that touchpoint date.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_1.35fr]">
        <label className="grid gap-2">
          <span className="field-label">Check in every</span>
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
          <span className="field-label">Heads-up window</span>
          <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue="5" required />
        </label>
      </div>
      <p className="text-xs leading-5 text-foreground/56">Example: every 3 weeks, show them as needing attention during the final 5 days.</p>
      <label className="grid gap-2">
        <span className="field-label">Notes for you</span>
        <textarea className="field-input min-h-24" name="notes" placeholder="Anything useful to remember later, like favorite plans or context." />
      </label>
      <p className="text-sm leading-6 text-foreground/64">
        Email is optional. If you add one, you can send an invite by email later; otherwise this stays as your own reminder record.
      </p>
      <PendingSubmitButton className="button-primary" idleLabel="Create connection" pendingLabel="Creating connection..." />
    </form>
  );
}
