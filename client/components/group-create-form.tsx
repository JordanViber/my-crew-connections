import { PrefetchLink } from "@/components/prefetch-link";
import { GroupMemberPicker } from "@/components/group-member-picker";
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
      <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_1.35fr]">
        <label className="grid gap-2">
          <span className="field-label">Every</span>
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
          <span className="field-label">Remind me days before</span>
          <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue="7" required />
        </label>
      </div>
      <p className="text-xs leading-5 text-foreground/56">Example: every 1 month, remind me 7 days before the group is due.</p>

      <GroupMemberPicker connections={connections} />

      <fieldset className="grid gap-3 rounded-lg border border-border/85 bg-white/75 p-3.5">
        <legend className="field-label px-2">Quick add someone new</legend>
        <p className="text-sm leading-6 text-foreground/68">
          If someone is not in your connections yet, add them here and we will create the connection first, then include them in this group.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="field-label">Name</span>
            <input className="field-input" name="quickConnectionName" type="text" placeholder="Jordan, Alex, dinner organizer" />
          </label>
          <label className="grid gap-2">
            <span className="field-label">Email (optional)</span>
            <input className="field-input" name="quickConnectionEmail" type="email" placeholder="name@example.com" />
          </label>
        </div>
      </fieldset>

      <p className="text-sm leading-6 text-foreground/64">
        The group starts appearing in the dashboard reminder queue immediately. People with a saved email will show as pending until they accept.
      </p>
      <div className="flex flex-wrap gap-2">
        <PendingSubmitButton className="button-primary" idleLabel="Create group" pendingLabel="Creating group..." />
        {connections.length === 0 ? (
          <PrefetchLink className="button-secondary" href="/connections?tab=create">
            Add people first
          </PrefetchLink>
        ) : null}
      </div>
    </form>
  );
}
