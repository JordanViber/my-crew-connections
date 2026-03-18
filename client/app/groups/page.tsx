import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { createGroupAction } from "@/app/actions";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function GroupsPage() {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const data = await getDashboardData(supabase, user.id);

  return (
    <AppShell
      title="Groups and recurring crews"
      subtitle="Groups work even when only one organizer uses the app. That keeps the MVP solo-first while leaving room for collaboration later."
      email={user.email ?? "Signed in"}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Create a group" description="Pick a cadence and optionally add existing connections as the first members.">
          <form action={createGroupAction} className="grid gap-4">
            <label className="grid gap-2">
              <span className="field-label">Group name</span>
              <input className="field-input" name="name" type="text" placeholder="Monthly dinner crew" required />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Description</span>
              <textarea className="field-input min-h-24" name="description" placeholder="What makes this group meaningful or recurring?" />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
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

            <fieldset className="grid gap-3 rounded-[1.3rem] border border-border/85 bg-white/75 p-4">
              <legend className="field-label px-2">Add existing people</legend>
              {data.connections.length === 0 ? (
                <p className="text-sm leading-7 text-foreground/65">Add people first if you want to seed a group with members now.</p>
              ) : (
                data.connections.map((connection) => (
                  <label key={connection.id} className="flex items-center gap-3 text-sm text-foreground/75">
                    <input className="h-4 w-4" type="checkbox" name="connectionIds" value={connection.id} />
                    <span>{connection.title}</span>
                  </label>
                ))
              )}
            </fieldset>

            <button className="button-primary" type="submit">
              Create group
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Active groups" description="Use the detail page to update cadence, add more members, and log group-level touchpoints.">
          <div className="grid gap-4">
            {data.groups.length === 0 ? (
              <p className="text-sm leading-7 text-foreground/68">No groups yet. The docs recommend getting at least one recurring crew into the app early.</p>
            ) : (
              data.groups.map((group) => (
                <article key={group.id} className="rounded-[1.4rem] border border-border/90 bg-white/82 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">{group.memberNames.length} members</p>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">{group.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-foreground/72">{group.subtitle}</p>
                      <p className="mt-2 text-sm text-foreground/70">{group.cadenceLabel}</p>
                    </div>
                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <StatusPill health={group.health} />
                      <Link className="button-secondary" href={`/groups/${group.id}`}>
                        Open group
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