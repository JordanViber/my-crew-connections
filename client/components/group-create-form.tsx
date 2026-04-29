import Link from "next/link";
import { GroupMemberPicker } from "@/components/group-member-picker";
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
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="field-label">Cadence value</span>
          <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue="1" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Unit</span>
          <select className="field-input" name="cadenceUnit" defaultValue="months">
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="days">Days</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">Reminder lead</span>
          <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue="7" required />
        </label>
      </div>

      <GroupMemberPicker connections={connections} />

      <p className="text-sm leading-6 text-foreground/64">
        Creating the group sets the cadence immediately, so it can show up in the dashboard reminder queue as soon as you start using it.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="button-primary" type="submit">
          Create group
        </button>
        {connections.length === 0 ? (
          <Link className="button-secondary" href="/connections?tab=create">
            Add people first
          </Link>
        ) : null}
      </div>
    </form>
  );
}
