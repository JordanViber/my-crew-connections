import { GroupRosterBuilder } from "@/components/group-roster-builder";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createGroupAction } from "@/app/actions";
import type { RelationshipSummary } from "@/lib/mvp-data";

export function GroupCreateForm({
  connections,
}: Readonly<{
  connections: RelationshipSummary[];
}>) {
  return (
    <form action={createGroupAction} className="grid gap-3">
      <label className="grid gap-2">
        <span className="field-label">Group name</span>
        <input className="field-input" name="name" type="text" placeholder="Monthly dinner crew" required />
      </label>
      <label className="grid gap-2">
        <span className="field-label">Description</span>
        <textarea className="field-input min-h-24" name="description" placeholder="What makes this group meaningful or recurring?" />
      </label>
      <div className="rounded-lg border border-border/80 bg-white/72 p-3">
        <p className="text-sm font-semibold text-foreground">How often should this group feel active?</p>
        <p className="mt-1 text-sm leading-6 text-foreground/64">
          The first timer starts today. After you log a group touchpoint, it resets from that touchpoint date.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_1.35fr]">
        <label className="grid gap-2">
          <span className="field-label">Gather every</span>
          <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue="1" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Cadence unit</span>
          <select className="field-input" name="cadenceUnit" defaultValue="months">
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="days">Days</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">Heads-up window</span>
          <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue="7" required />
        </label>
      </div>
      <p className="text-xs leading-5 text-foreground/56">Example: every 1 month, show the group as needing attention during the final 7 days.</p>

      <GroupRosterBuilder connections={connections} minPeople={2} mode="create" />

      <p className="text-sm leading-6 text-foreground/64">
        The group starts appearing in the dashboard reminder queue immediately. People with a saved email will show as pending until they accept.
      </p>
      <div className="flex flex-wrap gap-2">
        <PendingSubmitButton className="button-primary" idleLabel="Create group" pendingLabel="Creating group..." />
      </div>
    </form>
  );
}
