"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import { StatusPill } from "@/components/status-pill";
import { filterConnections, type ConnectionDirectoryFilter } from "@/lib/connection-directory";
import type { RelationshipSummary } from "@/lib/mvp-data";

function SummaryChip({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <div className="rounded-lg border border-border/80 bg-white/72 px-3 py-2.5">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-accent-strong">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function ConnectionSection({
  title,
  description,
  items,
}: Readonly<{
  title: string;
  description: string;
  items: RelationshipSummary[];
}>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-[1.1rem] font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-foreground/68">{description}</p>
      </div>
      {items.map((connection) => (
        <article key={connection.id} className="rounded-lg border border-border/90 bg-white/82 p-3.5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-accent-strong">{connection.subtitle}</p>
              <h2 className="mt-1.5 text-[1.15rem] font-semibold text-foreground">{connection.title}</h2>
              <p className="mt-2 text-sm text-foreground/70">{connection.cadenceLabel}</p>
              <p className="mt-1 text-sm text-foreground/65">Last touchpoint: {connection.lastTouchpointLabel}</p>
              <div className="mt-3">
                <ConnectionLinkBadge linkState={connection.linkState} pendingInviteEmail={connection.pendingInviteEmail} />
              </div>
              <p className="mt-2 text-sm text-foreground/65">{getConnectionLinkMessage(connection)}</p>
              {connection.nextHangoutLabel ? (
                <p className="mt-1 text-sm text-foreground/65">Next plan: {connection.nextHangoutLabel}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <StatusPill health={connection.health} />
              <Link className="button-secondary" href={`/connections/${connection.id}`}>
                Open person
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function getConnectionLinkMessage(connection: RelationshipSummary) {
  if (connection.linkState === "pending") {
    return `Waiting on ${connection.pendingInviteEmail} to accept the invite.`;
  }

  if (connection.linkState === "linked") {
    return "This person is already connected to their own account.";
  }

  return "Invite them any time you want to connect this record to their account.";
}

const filterLabels: { id: ConnectionDirectoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "linked", label: "Connected" },
  { id: "pending", label: "Invited" },
  { id: "local", label: "Not linked" },
];

export function ConnectionDirectory({
  connections,
}: Readonly<{
  connections: RelationshipSummary[];
}>) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConnectionDirectoryFilter>("all");

  const filtered = useMemo(() => filterConnections(connections, search, filter), [connections, search, filter]);
  const needsAttentionCount = filtered.filter((connection) => connection.health.state !== "on-track").length;
  const connectionsNeedingAttention = filtered.filter((connection) => connection.health.state !== "on-track");
  const onTrackConnections = filtered.filter((connection) => connection.health.state === "on-track");
  let content: React.ReactNode;

  if (connections.length === 0) {
    content = (
      <div className="rounded-lg border border-dashed border-border bg-white/60 p-4">
        <p className="text-sm leading-7 text-foreground/68">
          No people yet. Add someone you care about and the app can start shaping your rhythm around them.
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground/62">
          A great starting set is a close friend, a recurring activity buddy, and someone you never want to accidentally lose track of.
        </p>
      </div>
    );
  } else if (filtered.length === 0) {
    content = (
      <div className="rounded-lg border border-dashed border-border bg-white/60 p-4">
        <p className="text-sm leading-7 text-foreground/68">Nothing matches that search and filter combination yet.</p>
        <p className="mt-2 text-sm leading-6 text-foreground/62">
          Try a broader search or switch between connected, invited, and not-linked views.
        </p>
      </div>
    );
  } else {
    content = (
      <>
        <ConnectionSection
          title="Needs attention"
          description="These people are due soon or overdue and are the next best ones to reach out to."
          items={connectionsNeedingAttention}
        />
        <ConnectionSection
          title="On track"
          description="These relationships are in a comfortable rhythm right now."
          items={onTrackConnections}
        />
      </>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <SummaryChip label="Visible people" value={filtered.length} />
          <SummaryChip label="Need attention" value={needsAttentionCount} />
          <SummaryChip label="On track" value={filtered.length - needsAttentionCount} />
        </div>
        <label className="grid gap-2">
          <span className="field-label">Search people</span>
          <input
            className="field-input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, notes, activities, tags, or invite email"
          />
        </label>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {filterLabels.map((option) => (
            <button
              key={option.id}
              className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[0.82rem] font-semibold ${
                filter === option.id
                  ? "bg-[rgba(209,96,61,0.14)] text-accent-strong shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                  : "bg-white/72 text-foreground/68"
              }`}
              onClick={() => setFilter(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {content}
    </div>
  );
}
