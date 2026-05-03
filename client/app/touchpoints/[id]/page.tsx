import { PrefetchLink } from "@/components/prefetch-link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ExternalLink } from "@/components/external-link";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SectionCard } from "@/components/section-card";
import { TouchpointDetailEditor } from "@/components/touchpoint-detail-editor";
import { updateTouchpointAction } from "@/app/actions";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

function formatTargetPath(targetType: "connection" | "group", targetId: string) {
  return targetType === "connection" ? `/connections/${targetId}` : `/groups/${targetId}`;
}

export default async function TouchpointDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feedback?: string }>;
}>) {
  const { id } = await params;
  const query = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const [dashboardData, touchpointResult] = await Promise.all([
    getDashboardData(supabase, user.id),
    supabase
      .from("touchpoints")
      .select("id, owner_user_id, target_type, target_id, touchpoint_type, occurred_at, note, activity_label, location_label, photo_album_label, photo_album_url")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (touchpointResult.error) {
    throw new Error(`Failed to load touchpoint details: ${touchpointResult.error.message}`);
  }

  const touchpoint = touchpointResult.data;

  if (!touchpoint) {
    notFound();
  }

  const historyItem = dashboardData.recentTouchpoints.find((item) => item.id === touchpoint.id);

  if (!historyItem) {
    notFound();
  }

  const canEdit = touchpoint.owner_user_id === user.id;
  const targetPath = formatTargetPath(touchpoint.target_type, touchpoint.target_id);
  const feedback = getFeedback(query.feedback);

  return (
    <AppShell
      title="Touchpoint details"
      subtitle="Review context and keep this memory up to date."
      email={user.email ?? "Signed in"}
      firstName={getUserFirstName(user)}
      displayName={getUserDisplayName(user)}
      backHref={targetPath}
      backLabel={`Back to ${historyItem.targetLabel}`}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title={historyItem.targetLabel} description={`${historyItem.touchpointType} • ${historyItem.occurredAtLabel}`}>
          <div className="grid gap-3">
            {historyItem.activityLabel || historyItem.locationLabel ? (
              <p className="text-sm font-medium text-foreground/72">
                {[historyItem.activityLabel, historyItem.locationLabel].filter(Boolean).join(" at ")}
              </p>
            ) : null}
            <p className="text-sm leading-7 text-foreground/74">{historyItem.note}</p>
            {touchpoint.photo_album_url ? (
              <p className="text-sm text-foreground/68">
                Shared photo album:{" "}
                <ExternalLink href={touchpoint.photo_album_url}>
                  {touchpoint.photo_album_label || "Open album"}
                </ExternalLink>
              </p>
            ) : (
              <p className="text-sm text-foreground/62">No photo album link has been added yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={canEdit ? "Edit touchpoint" : "Touchpoint record"}
          description={canEdit
            ? "Start from labels, then use the edit icon to update details when needed."
            : "Only the person who logged this touchpoint can edit it."}
        >
          {canEdit ? (
            <TouchpointDetailEditor
              action={updateTouchpointAction}
              touchpointId={touchpoint.id}
              redirectTo={`/touchpoints/${touchpoint.id}`}
              touchpointType={touchpoint.touchpoint_type}
              occurredAt={touchpoint.occurred_at}
              note={touchpoint.note ?? undefined}
              activityLabel={touchpoint.activity_label ?? undefined}
              locationLabel={touchpoint.location_label ?? undefined}
              photoAlbumLabel={touchpoint.photo_album_label ?? undefined}
              photoAlbumUrl={touchpoint.photo_album_url ?? undefined}
            />
          ) : (
            <p className="text-sm leading-7 text-foreground/68">
              You can still open <PrefetchLink className="font-medium text-accent-strong underline underline-offset-2" href={targetPath}>the related record</PrefetchLink> to see full context.
            </p>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
