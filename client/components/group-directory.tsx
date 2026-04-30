"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { summarizeGroupMemberStatuses } from "@/lib/group-members";
import { filterGroups, type GroupDirectoryFilter } from "@/lib/group-directory";
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

function GroupSection({
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
      {items.map((group) => (
        <article key={group.id} className="rounded-lg border border-border/90 bg-white/82 p-3.5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-accent-strong">{group.memberNames.length} members</p>
              <h2 className="mt-1.5 text-[1.15rem] font-semibold text-foreground">{group.title}</h2>
              <p className="mt-2 text-sm leading-7 text-foreground/72">{group.subtitle}</p>
              <p className="mt-2 text-sm text-foreground/70">{group.cadenceLabel}</p>
              {group.memberStatusCounts ? (
                <p className="mt-2 text-sm text-foreground/65">{summarizeGroupMemberStatuses(group.memberStatusCounts)}</p>
              ) : null}
              <p className="mt-2 text-sm text-foreground/65">{group.memberNames.length > 0 ? group.memberNames.join(", ") : "No members added yet"}</p>
              {group.nextHangoutLabel ? (
                <p className="mt-1 text-sm text-foreground/65">Next plan: {group.nextHangoutLabel}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <StatusPill health={group.health} />
              <Link className="button-secondary" href={`/groups/${group.id}`}>
                Open group
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

const filterLabels: { id: GroupDirectoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Attention" },
  { id: "on-track", label: "On track" },
];

export function GroupDirectory({
  groups,
}: Readonly<{
  groups: RelationshipSummary[];
}>) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GroupDirectoryFilter>("all");

  const filtered = useMemo(() => filterGroups(groups, search, filter), [groups, search, filter]);
  const needsAttentionCount = filtered.filter((group) => group.health.state !== "on-track").length;
  const groupsNeedingAttention = filtered.filter((group) => group.health.state !== "on-track");
  const onTrackGroups = filtered.filter((group) => group.health.state === "on-track");
  let content: React.ReactNode;

  if (groups.length === 0) {
    content = (
      <div className="rounded-lg border border-dashed border-border bg-white/60 p-4">
        <p className="text-sm leading-7 text-foreground/68">
          No groups yet. Add a recurring crew and the app can help keep the rhythm visible.
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground/62">
          Good starting candidates are a monthly dinner crew, a walking group, or any tradition that depends on one organizer remembering to make it happen.
        </p>
      </div>
    );
  } else if (filtered.length === 0) {
    content = (
      <div className="rounded-lg border border-dashed border-border bg-white/60 p-4">
        <p className="text-sm leading-7 text-foreground/68">Nothing matches that group search and filter combination yet.</p>
        <p className="mt-2 text-sm leading-6 text-foreground/62">Try a broader search or switch between all, attention, and on-track views.</p>
      </div>
    );
  } else {
    content = (
      <>
        <GroupSection
          title="Needs attention"
          description="These groups are the most likely to drift if nobody nudges the next plan forward."
          items={groupsNeedingAttention}
        />
        <GroupSection
          title="On track"
          description="These crews are in a healthy rhythm right now."
          items={onTrackGroups}
        />
      </>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <SummaryChip label="Visible groups" value={filtered.length} />
          <SummaryChip label="Need attention" value={needsAttentionCount} />
          <SummaryChip label="On track" value={filtered.length - needsAttentionCount} />
        </div>
        <label className="grid gap-2">
          <span className="field-label">Search groups</span>
          <input
            className="field-input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, description, or member names"
          />
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {filterLabels.map((option) => (
            <button
              key={option.id}
              className={`min-w-0 truncate rounded-lg px-1.5 py-1.5 text-[0.78rem] font-semibold ${
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
