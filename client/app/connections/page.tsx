import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConnectionCreateForm } from "@/components/connection-create-form";
import { ConnectionDirectory } from "@/components/connection-directory";
import { FeedbackBanner } from "@/components/feedback-banner";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { SectionCard } from "@/components/section-card";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const feedback = getFeedback(params.feedback);

  return (
    <AppShell
      title="People you want to keep close"
      subtitle="Manual entry only for now. The product docs were explicit: get to value fast, and leave contact import for later."
      email={user.email ?? "Signed in"}
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
              <SectionCard title="Current people" description="Open a detail page to update cadence, notes, plans, or log a touchpoint for a specific person.">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Link className="button-secondary" href="/connections?tab=create">
                    Add a person
                  </Link>
                </div>
                <ConnectionDirectory connections={data.connections} />
              </SectionCard>
            ),
          },
          {
            id: "create",
            label: "Create",
            content: (
              <SectionCard title="Add a person" description="A disciplined form: name, cadence, tags, and just enough context to make the next step easier.">
                <ConnectionCreateForm />
              </SectionCard>
            ),
          },
        ]}
      />

      <div className="hidden gap-6 xl:grid-cols-[0.92fr_1.08fr] md:grid">
        <SectionCard title="Add a person" description="A disciplined form: name, cadence, tags, and just enough context to make the next step easier.">
          <ConnectionCreateForm />
        </SectionCard>

        <SectionCard title="Current people" description="Open a detail page to update cadence, notes, plans, or log a touchpoint for a specific person.">
          <div className="mb-4 flex flex-wrap gap-2">
            <Link className="button-secondary" href="/connections?tab=create">
              Add a person
            </Link>
          </div>
          <ConnectionDirectory connections={data.connections} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
