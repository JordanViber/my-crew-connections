import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ExternalLink } from "@/components/external-link";
import { SectionCard } from "@/components/section-card";
import { formatHangoutWindow, getHangoutStatusLabel } from "@/lib/hangouts";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

type HangoutDetailRow = {
  id: string;
  owner_user_id: string;
  target_type: "connection" | "group";
  target_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  notes: string | null;
  status: "planned" | "completed" | "canceled";
  proposal_state: "pending" | "confirmed" | "declined";
  photo_album_label: string | null;
  photo_album_url: string | null;
};

type HangoutParticipantRow = {
  participant_user_id: string;
  participant_connection_id: string | null;
  response_status: "pending" | "accepted" | "declined";
};

function getResponsePillClass(responseStatus: "pending" | "accepted" | "declined") {
  if (responseStatus === "accepted") {
    return "bg-mint/80 text-foreground/75";
  }

  if (responseStatus === "declined") {
    return "warning-surface warning-text";
  }

  return "bg-surface-muted text-foreground/62";
}

function getResponseLabel(responseStatus: "pending" | "accepted" | "declined") {
  if (responseStatus === "accepted") {
    return "Accepted";
  }

  if (responseStatus === "declined") {
    return "Declined";
  }

  return "Pending";
}

export default async function HangoutDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, notes, status, proposal_state, photo_album_label, photo_album_url")
    .eq("id", id)
    .maybeSingle();

  if (hangoutError) {
    throw new Error(`Failed to load plan details: ${hangoutError.message}`);
  }

  if (!hangout) {
    redirect("/notifications?feedback=hangout-unavailable");
  }

  const parsedHangout = hangout as HangoutDetailRow;
  const { data: viewerParticipant, error: viewerParticipantError } = await supabase
    .from("hangout_participants")
    .select("participant_connection_id, response_status")
    .eq("hangout_id", parsedHangout.id)
    .eq("participant_user_id", user.id)
    .maybeSingle();

  if (viewerParticipantError) {
    throw new Error(`Failed to load participant access: ${viewerParticipantError.message}`);
  }

  const canView = parsedHangout.owner_user_id === user.id || Boolean(viewerParticipant);

  if (!canView) {
    notFound();
  }

  const effectiveTargetId = parsedHangout.target_type === "connection"
    ? (parsedHangout.owner_user_id === user.id ? parsedHangout.target_id : viewerParticipant?.participant_connection_id ?? parsedHangout.target_id)
    : parsedHangout.target_id;
  const targetPath = parsedHangout.target_type === "connection"
    ? `/connections/${effectiveTargetId}`
    : `/groups/${parsedHangout.target_id}`;

  const targetTable = parsedHangout.target_type === "connection" ? "connections" : "groups";
  const targetLabelColumn = parsedHangout.target_type === "connection" ? "display_name" : "name";
  const { data: targetRecord, error: targetError } = await supabase
    .from(targetTable)
    .select(`id, ${targetLabelColumn}`)
    .eq("id", effectiveTargetId)
    .maybeSingle();

  if (targetError) {
    throw new Error(`Failed to load plan target: ${targetError.message}`);
  }

  const targetLabel = parsedHangout.target_type === "connection"
    ? (targetRecord as { display_name?: string } | null)?.display_name ?? "Connection"
    : (targetRecord as { name?: string } | null)?.name ?? "Group";

  let groupParticipantRows: Array<{ id: string; name: string; responseStatus: "pending" | "accepted" | "declined" }> = [];

  if (parsedHangout.target_type === "group") {
    const [{ data: memberships, error: membershipsError }, { data: participants, error: participantsError }] = await Promise.all([
      supabase
        .from("group_memberships")
        .select("connection_id")
        .eq("group_id", parsedHangout.target_id)
        .is("removed_at", null),
      supabase
        .from("hangout_participants")
        .select("participant_connection_id, response_status")
        .eq("hangout_id", parsedHangout.id),
    ]);

    if (membershipsError) {
      throw new Error(`Failed to load group membership list: ${membershipsError.message}`);
    }

    if (participantsError) {
      throw new Error(`Failed to load plan responses: ${participantsError.message}`);
    }

    const memberConnectionIds = (memberships ?? []).flatMap((membership) => membership.connection_id ? [membership.connection_id] : []);
    const responseByConnectionId = new Map(
      ((participants ?? []) as HangoutParticipantRow[])
        .filter((participant) => participant.participant_connection_id)
        .map((participant) => [participant.participant_connection_id as string, participant.response_status]),
    );

    if (memberConnectionIds.length > 0) {
      const { data: connections, error: connectionsError } = await supabase
        .from("connections")
        .select("id, display_name")
        .in("id", memberConnectionIds);

      if (connectionsError) {
        throw new Error(`Failed to load group member names: ${connectionsError.message}`);
      }

      groupParticipantRows = (connections ?? [])
        .map((connection) => ({
          id: connection.id,
          name: connection.display_name,
          responseStatus: responseByConnectionId.get(connection.id) ?? "pending",
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    }
  }

  return (
    <AppShell
      title={parsedHangout.title}
      subtitle="Saved plan details"
      email={user.email ?? "Signed in"}
      firstName={getUserFirstName(user)}
      displayName={getUserDisplayName(user)}
      backHref={targetPath}
      backLabel={`Back to ${targetLabel}`}
    >
      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Plan overview" description={`${targetLabel} • ${getHangoutStatusLabel(parsedHangout.status)}`}>
          <div className="grid gap-3 text-sm text-foreground/74">
            <p>
              <span className="font-semibold text-foreground">When:</span>{" "}
              {formatHangoutWindow({
                startsAt: parsedHangout.starts_at,
                endsAt: parsedHangout.ends_at ?? undefined,
                timezone: parsedHangout.timezone,
              })}
            </p>
            <p>
              <span className="font-semibold text-foreground">Proposal state:</span> {parsedHangout.proposal_state}
            </p>
            {parsedHangout.location ? (
              <p>
                <span className="font-semibold text-foreground">Location:</span> {parsedHangout.location}
              </p>
            ) : null}
            {parsedHangout.notes ? (
              <p className="leading-7">
                <span className="font-semibold text-foreground">Notes:</span> {parsedHangout.notes}
              </p>
            ) : null}
            {parsedHangout.photo_album_url ? (
              <p>
                <span className="font-semibold text-foreground">Photo album:</span>{" "}
                <ExternalLink href={parsedHangout.photo_album_url}>
                  {parsedHangout.photo_album_label || "Open album"}
                </ExternalLink>
              </p>
            ) : null}
          </div>
        </SectionCard>

        {parsedHangout.target_type === "group" ? (
          <SectionCard title="Group responses" description="Member-by-member response status for this plan.">
            {groupParticipantRows.length === 0 ? (
              <p className="text-sm leading-7 text-foreground/68">No group members are attached yet.</p>
            ) : (
              <div className="grid gap-2">
                {groupParticipantRows.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border/80 bg-white/76 px-3 py-2.5">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getResponsePillClass(member.responseStatus)}`}>
                      {getResponseLabel(member.responseStatus)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}
      </div>
    </AppShell>
  );
}
