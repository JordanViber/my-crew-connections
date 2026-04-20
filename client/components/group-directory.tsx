"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
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
    <div className="rounded-[1.2rem] border border-border/80 bg-white/72 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent-strong">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">{value}</p>
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
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-foreground/68">{description}</p>
      </div>
      {items.map((group) => (
        <article key={group.id} className="rounded-[1.4rem] border border-border/90 bg-white/82 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">{group.memberNames.length} members</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">{group.title}</h2>
              <p className="mt-2 text-sm leading-7 text-foreground/72">{group.subtitle}</p>
              <p className="mt-2 text-sm text-foreground/70">{group.cadenceLabel}</p>
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
  { id: "attention", label: "Needs attention" },
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

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
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

      {groups.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-white/60 p-5">
          <p className="text-sm leading-7 text-foreground/68">
            No groups yet. The docs recommend getting at least one recurring crew into the app early.
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground/62">
            Good starting candidates are a monthly dinner crew, a walking group, or any tradition that depends on one organizer remembering to make it happen.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-white/60 p-5">
          <p className="text-sm leading-7 text-foreground/68">Nothing matches that group search and filter combination yet.</p>
          <p className="mt-2 text-sm leading-6 text-foreground/62">Try a broader search or switch between all, attention, and on-track views.</p>
        </div>
      ) : (
        <>
          <GroupSection
            title="Needs attention"
            description="These groups are the most likely to slip without an organizer taking the next step."
            items={groupsNeedingAttention}
          />
          <GroupSection
            title="On track"
            description="These crews are in a healthy rhythm right now."
            items={onTrackGroups}
          />
        </>
      )}
    </div>
  );
}
