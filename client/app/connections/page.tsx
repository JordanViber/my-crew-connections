import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { createConnectionAction } from "@/app/actions";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const cadenceOptions = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "days", label: "Days" },
] as const;

export default async function ConnectionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const data = await getDashboardData(supabase, user.id);

  return (
    <AppShell
      title="People you want to keep close"
      subtitle="Manual entry only for now. The product docs were explicit: get to value fast, and leave contact import for later."
      email={user.email ?? "Signed in"}
    >
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard title="Add a person" description="A disciplined form: name, cadence, tags, and just enough context to make the next step easier.">
          <form action={createConnectionAction} className="grid gap-4">
            <label className="grid gap-2">
              <span className="field-label">Name</span>
              <input className="field-input" name="displayName" type="text" placeholder="Jordan, Alexis, dinner crew organizer" required />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Tags</span>
              <input className="field-input" name="tags" type="text" placeholder="close friend, local, long-distance" />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 md:col-span-1">
                <span className="field-label">Cadence value</span>
                <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue="3" required />
              </label>
              <label className="grid gap-2 md:col-span-1">
                <span className="field-label">Unit</span>
                <select className="field-input" name="cadenceUnit" defaultValue="weeks">
                  {cadenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 md:col-span-1">
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
            <button className="button-primary" type="submit">
              Create connection
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Current people" description="Open a detail page to update cadence, notes, or log a touchpoint for a specific person.">
          <div className="grid gap-4">
            {data.connections.length === 0 ? (
              <p className="text-sm leading-7 text-foreground/68">No people added yet. Start with three people or one group to mirror the planned onboarding flow.</p>
            ) : (
              data.connections.map((connection) => (
                <article key={connection.id} className="rounded-[1.4rem] border border-border/90 bg-white/82 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">{connection.subtitle}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">{connection.title}</h2>
                      <p className="mt-2 text-sm text-foreground/70">{connection.cadenceLabel}</p>
                      <p className="mt-1 text-sm text-foreground/65">Last touchpoint: {connection.lastTouchpointLabel}</p>
                    </div>
                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <StatusPill health={connection.health} />
                      <Link className="button-secondary" href={`/connections/${connection.id}`}>
                        Edit details
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}