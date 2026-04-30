import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { GroupCreateForm } from "@/components/group-create-form";
import { GroupDirectory } from "@/components/group-directory";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { SectionCard } from "@/components/section-card";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { canCreateGroup, getFreeTierUsageLabel, hasPremiumAccess } from "@/lib/entitlements";
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
  const { data: billingProfile } = await supabase
    .from("profiles")
    .select("stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  const feedback = getFeedback(params.feedback);
  const hasPremium = hasPremiumAccess(billingProfile, user.email);
  const canAddGroup = canCreateGroup(billingProfile, data.ownedGroupCount, user.email);
  const groupUsageLabel = getFreeTierUsageLabel("group", data.ownedGroupCount);
  const addGroupHref = canAddGroup ? "/groups?tab=create" : "/settings#billing";
  const addGroupLabel = canAddGroup ? "Create a group" : "Upgrade to add more";

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
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Link className={canAddGroup ? "button-secondary" : "button-primary"} href={addGroupHref}>
                    {addGroupLabel}
                  </Link>
                  {!hasPremium ? (
                    <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/64">
                      {groupUsageLabel}
                    </span>
                  ) : null}
                </div>
                <GroupDirectory groups={data.groups} />
              </SectionCard>
            ),
          },
          {
            id: "create",
            label: "Create",
            content: canAddGroup ? (
              <SectionCard title="Create a group" description="Start with a name, a cadence, and the first few people who make the group real.">
                <GroupCreateForm connections={data.connections} />
              </SectionCard>
            ) : (
              <UpgradePrompt
                title="Your free group slot is full"
                body="Keep your first crew on track for free. Premium unlocks every dinner crew, club, and recurring tradition with separate cadences, plans, and shared history."
                usageLabel={groupUsageLabel}
              />
            ),
          },
        ]}
      />

      <div className="hidden gap-5 xl:grid-cols-[0.9fr_1.1fr] md:grid">
        {canAddGroup ? (
          <SectionCard title="Create a group" description="Start with a name, a cadence, and the first few people who make the group real.">
            <GroupCreateForm connections={data.connections} />
          </SectionCard>
        ) : (
          <UpgradePrompt
            title="Create unlimited groups with Premium"
            body="Free gives you one crew to start. Premium lets every recurring group have its own rhythm, plans, members, and memory trail."
            usageLabel={groupUsageLabel}
          />
        )}

        <SectionCard title="Active groups" description="Open a group to adjust cadence, members, plans, and shared history.">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link className={canAddGroup ? "button-secondary" : "button-primary"} href={addGroupHref}>
              {addGroupLabel}
            </Link>
            {!hasPremium ? (
              <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/64">
                {groupUsageLabel}
              </span>
            ) : null}
          </div>
          <GroupDirectory groups={data.groups} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
