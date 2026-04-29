import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConnectionCreateForm } from "@/components/connection-create-form";
import { ConnectionDirectory } from "@/components/connection-directory";
import { FeedbackBanner } from "@/components/feedback-banner";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { SectionCard } from "@/components/section-card";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { canCreateConnection, getFreeTierUsageLabel, hasPremiumAccess } from "@/lib/entitlements";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

export default async function ConnectionsPage({
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
  const canAddConnection = canCreateConnection(billingProfile, data.connections.length, user.email);
  const connectionUsageLabel = getFreeTierUsageLabel("connection", data.connections.length);
  const addPersonHref = canAddConnection ? "/connections?tab=create" : "/settings#billing";
  const addPersonLabel = canAddConnection ? "Add a person" : "Upgrade to add more";

  return (
    <AppShell
      title="People you want to keep close"
      subtitle="Keep the people you care about in one calm list, with just enough detail to make the next reach-out easier."
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
              <SectionCard title="Current people" description="Search, filter, and open a person to update cadence, notes, plans, or recent touchpoints.">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Link className={canAddConnection ? "button-secondary" : "button-primary"} href={addPersonHref}>
                    {addPersonLabel}
                  </Link>
                  {!hasPremium ? (
                    <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/64">
                      {connectionUsageLabel}
                    </span>
                  ) : null}
                </div>
                <ConnectionDirectory connections={data.connections} />
              </SectionCard>
            ),
          },
          {
            id: "create",
            label: "Create",
            content: canAddConnection ? (
              <SectionCard title="Add a person" description="Name, cadence, and a bit of context is enough to get started.">
                <ConnectionCreateForm />
              </SectionCard>
            ) : (
              <UpgradePrompt
                title="Your free person slot is full"
                body="Your first person stays right where they are. Premium opens the rest of your relationship map so every important person can have a cadence, notes, plans, and history."
                usageLabel={connectionUsageLabel}
              />
            ),
          },
        ]}
      />

      <div className="hidden gap-5 xl:grid-cols-[0.92fr_1.08fr] md:grid">
        {canAddConnection ? (
          <SectionCard title="Add a person" description="Name, cadence, and a bit of context is enough to get started.">
            <ConnectionCreateForm />
          </SectionCard>
        ) : (
          <UpgradePrompt
            title="Add unlimited people with Premium"
            body="Free keeps one relationship moving. Premium lets you build the full list, keep separate cadences, and make every next reach-out easier."
            usageLabel={connectionUsageLabel}
          />
        )}

        <SectionCard title="Current people" description="Search, filter, and open a person to update cadence, notes, plans, or recent touchpoints.">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link className={canAddConnection ? "button-secondary" : "button-primary"} href={addPersonHref}>
              {addPersonLabel}
            </Link>
            {!hasPremium ? (
              <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/64">
                {connectionUsageLabel}
              </span>
            ) : null}
          </div>
          <ConnectionDirectory connections={data.connections} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
