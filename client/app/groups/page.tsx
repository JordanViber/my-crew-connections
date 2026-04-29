import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { GroupCreateForm } from "@/components/group-create-form";
import { GroupDirectory } from "@/components/group-directory";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { SectionCard } from "@/components/section-card";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

export default async function GroupsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ feedback?: string; tab?: string }>;
}>) {
  const params = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const data = await getDashboardData(supabase, user.id);
  const feedback = getFeedback(params.feedback);

  return (
    <AppShell
      title="Groups and recurring crews"
      subtitle="Keep dinner crews, clubs, and recurring traditions visible before they drift out of habit."
      email={user.email ?? "Signed in"}
      firstName={getUserFirstName(user)}
      displayName={getUserDisplayName(user)}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <MobileSectionTabs
        initialSectionId={params.tab === "create" ? "create" : "active"}
        sticky={false}
        sections={[
          {
            id: "active",
            label: "Active",
            content: (
              <SectionCard title="Active groups" description="Open a group to adjust cadence, members, plans, and shared history.">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Link className="button-secondary" href="/groups?tab=create">
                    Create a group
                  </Link>
                </div>
                <GroupDirectory groups={data.groups} />
              </SectionCard>
            ),
          },
          {
            id: "create",
            label: "Create",
            content: (
              <SectionCard title="Create a group" description="Start with a name, a cadence, and the first few people who make the group real.">
                <GroupCreateForm connections={data.connections} />
              </SectionCard>
            ),
          },
        ]}
      />

      <div className="hidden gap-5 xl:grid-cols-[0.9fr_1.1fr] md:grid">
        <SectionCard title="Create a group" description="Start with a name, a cadence, and the first few people who make the group real.">
          <GroupCreateForm connections={data.connections} />
        </SectionCard>

        <SectionCard title="Active groups" description="Open a group to adjust cadence, members, plans, and shared history.">
          <div className="mb-4 flex flex-wrap gap-2">
            <Link className="button-secondary" href="/groups?tab=create">
              Create a group
            </Link>
          </div>
          <GroupDirectory groups={data.groups} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
