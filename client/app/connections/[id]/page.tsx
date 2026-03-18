import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { createTouchpointAction, updateConnectionAction } from "@/app/actions";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toInputDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default async function ConnectionDetailPage({
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
  const connection = data.connections.find((item) => item.id === id);

  if (!connection) {
    notFound();
  }

  const timeline = data.recentTouchpoints.filter((touchpoint) => touchpoint.targetLabel === connection.title);

  return (
    <AppShell
      title={connection.title}
      subtitle="Update cadence and notes here, then keep history moving with one-touch logging."
      email={user.email ?? "Signed in"}
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Connection profile" description={connection.subtitle}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <StatusPill health={connection.health} />
            <p className="text-sm text-foreground/65">{connection.health.summary}</p>
          </div>

          <form action={updateConnectionAction} className="grid gap-4">
            <input type="hidden" name="connectionId" value={connection.id} />
            <label className="grid gap-2">
              <span className="field-label">Name</span>
              <input className="field-input" name="displayName" type="text" defaultValue={connection.title} required />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Tags</span>
              <input className="field-input" name="tags" type="text" defaultValue={connection.tags.join(", ")} />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="field-label">Cadence value</span>
                <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue={connection.cadenceValue} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Unit</span>
                <select className="field-input" name="cadenceUnit" defaultValue={connection.cadenceUnit}>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="field-label">Reminder lead</span>
                <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue={connection.reminderLeadDays} required />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="field-label">Preferred activities</span>
              <input className="field-input" name="preferredActivities" type="text" defaultValue={connection.preferredActivities ?? ""} />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Private notes</span>
              <textarea className="field-input min-h-28" name="notes" defaultValue={connection.notes ?? ""} />
            </label>
            <button className="button-primary" type="submit">
              Save connection
            </button>
          </form>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard title="Log a touchpoint" description="Keep it quick. Even a two-minute update is enough to keep the dashboard honest.">
            <form action={createTouchpointAction} className="grid gap-4">
              <input type="hidden" name="targetType" value="connection" />
              <input type="hidden" name="targetId" value={connection.id} />
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
                <input className="field-input" name="activityLabel" type="text" placeholder="Walk, dinner, coffee, check-in" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Location</span>
                <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform location" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Note</span>
                <textarea className="field-input min-h-28" name="note" placeholder="What mattered? Anything to remember for the next invite?" />
              </label>
              <button className="button-primary" type="submit">
                Save touchpoint
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Recent timeline" description={`Last touchpoint: ${connection.lastTouchpointLabel}`}>
            <div className="grid gap-4">
              {timeline.length === 0 ? (
                <p className="text-sm leading-7 text-foreground/68">No timeline entries yet. Log a first touchpoint to make this view useful.</p>
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