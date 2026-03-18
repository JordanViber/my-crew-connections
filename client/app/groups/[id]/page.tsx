import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { addGroupMembersAction, createTouchpointAction, updateGroupAction } from "@/app/actions";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toInputDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default async function GroupDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const data = await getDashboardData(supabase, user.id);
  const group = data.groups.find((item) => item.id === id);

  if (!group) {
    notFound();
  }

  const timeline = data.recentTouchpoints.filter((touchpoint) => touchpoint.targetLabel === group.title);
  const availableConnections = data.connections.filter((connection) => !group.memberNames.includes(connection.title));

  return (
    <AppShell
      title={group.title}
      subtitle="Group surfaces stay lightweight for now: cadence, membership, and logged history without collaboration complexity."
      email={user.email ?? "Signed in"}
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-6">
          <SectionCard title="Group settings" description={group.subtitle}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <StatusPill health={group.health} />
              <p className="text-sm text-foreground/65">{group.health.summary}</p>
            </div>

            <form action={updateGroupAction} className="grid gap-4">
              <input type="hidden" name="groupId" value={group.id} />
              <label className="grid gap-2">
                <span className="field-label">Group name</span>
                <input className="field-input" name="name" type="text" defaultValue={group.title} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Description</span>
                <textarea className="field-input min-h-24" name="description" defaultValue={group.notes ?? ""} />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="field-label">Cadence value</span>
                    <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue={group.cadenceValue} required />
                </label>
                <label className="grid gap-2">
                  <span className="field-label">Unit</span>
                    <select className="field-input" name="cadenceUnit" defaultValue={group.cadenceUnit}>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="field-label">Reminder lead</span>
                  <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue={group.reminderLeadDays} required />
                </label>
              </div>
              <button className="button-primary" type="submit">
                Save group
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Members" description="Group records can include placeholder members before anyone else uses the app.">
            <div className="mb-5 flex flex-wrap gap-2">
              {group.memberNames.map((memberName) => (
                <span key={memberName} className="rounded-full bg-mint px-3 py-2 text-sm font-medium text-[#214c35]">
                  {memberName}
                </span>
              ))}
            </div>

            <form action={addGroupMembersAction} className="grid gap-4">
              <input type="hidden" name="groupId" value={group.id} />
              <fieldset className="grid gap-3 rounded-[1.3rem] border border-border/85 bg-white/75 p-4">
                <legend className="field-label px-2">Add existing connections</legend>
                {availableConnections.length === 0 ? (
                  <p className="text-sm leading-7 text-foreground/68">No additional connections are available to add right now.</p>
                ) : (
                  availableConnections.map((connection) => (
                    <label key={connection.id} className="flex items-center gap-3 text-sm text-foreground/75">
                      <input className="h-4 w-4" type="checkbox" name="connectionIds" value={connection.id} />
                      <span>{connection.title}</span>
                    </label>
                  ))
                )}
              </fieldset>
              <button className="button-secondary" type="submit" disabled={availableConnections.length === 0}>
                Add selected members
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Log a group touchpoint" description="Use this for dinners, hikes, game nights, or any shared check-in worth remembering.">
            <form action={createTouchpointAction} className="grid gap-4">
              <input type="hidden" name="targetType" value="group" />
              <input type="hidden" name="targetId" value={group.id} />
              <label className="grid gap-2">
                <span className="field-label">Type</span>
                <select className="field-input" name="touchpointType" defaultValue="hangout">
                  <option value="hangout">Hangout</option>
                  <option value="check-in">Check-in</option>
                  <option value="message">Message</option>
                  <option value="call">Call</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="field-label">When</span>
                <input className="field-input" name="occurredAt" type="datetime-local" defaultValue={toInputDateTime()} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Activity</span>
                <input className="field-input" name="activityLabel" type="text" placeholder="Dinner, run club, game night" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Location</span>
                <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform location" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Note</span>
                <textarea className="field-input min-h-28" name="note" placeholder="Why did this matter, and what should the next plan build on?" />
              </label>
              <button className="button-primary" type="submit">
                Save group touchpoint
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Recent timeline" description={`Last touchpoint: ${group.lastTouchpointLabel}`}>
            <div className="grid gap-4">
              {timeline.length === 0 ? (
                <p className="text-sm leading-7 text-foreground/68">No group touchpoints yet. Log one event and the timeline becomes the memory surface.</p>
              ) : (
                timeline.map((touchpoint) => (
                  <article key={touchpoint.id} className="rounded-[1.3rem] border border-border/85 bg-white/78 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                        <p className="mt-2 text-sm leading-7 text-foreground/72">{touchpoint.note}</p>
                      </div>
                      <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}