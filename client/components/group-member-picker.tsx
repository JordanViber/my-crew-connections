"use client";

import { useMemo, useState } from "react";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import {
  countGroupMemberStatuses,
  sortConnectionsForGroupMembers,
  summarizeGroupMemberStatuses,
} from "@/lib/group-members";
import type { RelationshipSummary } from "@/lib/mvp-data";

export function GroupMemberPicker({
  connections,
}: Readonly<{
  connections: RelationshipSummary[];
}>) {
  const [search, setSearch] = useState("");

  const filteredConnections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return connections;
    }

    return connections.filter((connection) => {
      const haystacks = [
        connection.title,
        connection.subtitle,
        connection.notes ?? "",
        connection.pendingInviteEmail ?? "",
      ];

      return haystacks.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [connections, search]);
  const orderedConnections = useMemo(() => sortConnectionsForGroupMembers(filteredConnections), [filteredConnections]);
  const statusSummary = useMemo(
    () => summarizeGroupMemberStatuses(countGroupMemberStatuses(orderedConnections.map((connection) => connection.linkState))),
    [orderedConnections],
  );

  return (
    <fieldset className="grid gap-3 rounded-lg border border-border/85 bg-white/75 p-3.5">
      <legend className="field-label px-2">Add existing people</legend>
      {connections.length === 0 ? (
        <p className="text-sm leading-7 text-foreground/65">Add people first if you want to seed a group with members now.</p>
      ) : (
        <>
          <p className="text-sm leading-6 text-foreground/68">
            Search your current people, then check the ones that belong in this crew. This only uses people you already created.
          </p>
          <label className="grid gap-2">
            <span className="field-label">Search existing people</span>
            <input
              className="field-input"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, tags, notes, or invite email"
            />
          </label>
          {orderedConnections.length > 0 ? <p className="text-xs leading-5 text-foreground/56">{statusSummary}</p> : null}
          {orderedConnections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/85 bg-white/58 p-3.5 text-sm leading-6 text-foreground/65">
              No people match that search yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {orderedConnections.map((connection) => (
                <label
                  key={connection.id}
                  className="flex items-start gap-3 rounded-lg border border-border/80 bg-white/76 p-3 text-sm text-foreground/78"
                >
                  <input className="mt-1 h-4 w-4 shrink-0" type="checkbox" name="connectionIds" value={connection.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{connection.title}</span>
                      <ConnectionLinkBadge linkState={connection.linkState} pendingInviteEmail={connection.pendingInviteEmail} />
                    </div>
                    <p className="mt-1 text-sm text-foreground/65">{connection.cadenceLabel}</p>
                    {connection.subtitle ? <p className="mt-1 text-sm text-foreground/62">{connection.subtitle}</p> : null}
                  </div>
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
