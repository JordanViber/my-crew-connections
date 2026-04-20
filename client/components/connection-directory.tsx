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
    <div className="rounded-[1.2rem] border border-border/80 bg-white/72 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent-strong">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">{value}</p>
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
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-foreground/68">{description}</p>
      </div>
      {items.map((connection) => (
        <article key={connection.id} className="rounded-[1.4rem] border border-border/90 bg-white/82 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">{connection.subtitle}</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">{connection.title}</h2>
              <p className="mt-2 text-sm text-foreground/70">{connection.cadenceLabel}</p>
              <p className="mt-1 text-sm text-foreground/65">Last touchpoint: {connection.lastTouchpointLabel}</p>
              <div className="mt-3">
                <ConnectionLinkBadge linkState={connection.linkState} pendingInviteEmail={connection.pendingInviteEmail} />
              </div>
              {connection.linkState === "pending" ? (
                <p className="mt-2 text-sm text-foreground/65">Waiting on {connection.pendingInviteEmail} to claim.</p>
              ) : connection.linkState === "linked" ? (
                <p className="mt-2 text-sm text-foreground/65">This person is already tied to a real app user.</p>
              ) : (
                <p className="mt-2 text-sm text-foreground/65">No real-user link has been started yet.</p>
              )}
              {connection.nextHangoutLabel ? (
                <p className="mt-1 text-sm text-foreground/65">Next plan: {connection.nextHangoutLabel}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <StatusPill health={connection.health} />
              <Link className="button-secondary" href={`/connections/${connection.id}`}>
                Edit details
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

const filterLabels: { id: ConnectionDirectoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "linked", label: "Linked" },
  { id: "pending", label: "Pending" },
  { id: "local", label: "Local" },
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

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="flex flex-wrap gap-2">
          {filterLabels.map((option) => (
            <button
              key={option.id}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
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

      {connections.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-white/60 p-5">
          <p className="text-sm leading-7 text-foreground/68">
            No people added yet. Start with three people or one group to mirror the planned onboarding flow.
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground/62">
            A good first set is one close friend, one recurring activity buddy, and one person you tend to accidentally lose track of.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-white/60 p-5">
          <p className="text-sm leading-7 text-foreground/68">Nothing matches that search and filter combination yet.</p>
          <p className="mt-2 text-sm leading-6 text-foreground/62">
            Try a broader search or switch between linked, pending, and local-only views.
          </p>
        </div>
      ) : (
        <>
          <ConnectionSection
            title="Needs attention"
            description="These people are due soon or overdue and should be the next ones you act on."
            items={connectionsNeedingAttention}
          />
          <ConnectionSection
            title="On track"
            description="These connections are healthy right now, so you can focus elsewhere without losing confidence."
            items={onTrackConnections}
          />
        </>
      )}
    </div>
  );
}
