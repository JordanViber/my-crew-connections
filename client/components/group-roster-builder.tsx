"use client";

import { useMemo, useState } from "react";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import {
  countGroupMemberStatuses,
  sortConnectionsForGroupMembers,
  summarizeGroupMemberStatuses,
} from "@/lib/group-members";
import type { RelationshipSummary } from "@/lib/mvp-data";

type QuickRosterRow = {
  id: string;
  name: string;
  email: string;
};

type GroupRosterBuilderProps = Readonly<{
  connections: RelationshipSummary[];
  excludedConnectionIds?: string[];
  initialSelectedConnectionIds?: string[];
  minPeople?: number;
  mode: "create" | "manage";
}>;

function createQuickRow(): QuickRosterRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
  };
}

function getInitialQuickRows(mode: "create" | "manage") {
  const rowCount = mode === "create" ? 2 : 1;
  return Array.from({ length: rowCount }, () => createQuickRow());
}

function getJoinModeLabel(connection: RelationshipSummary) {
  if (connection.linkedUserId) {
    return "App account connected; group invite will wait for acceptance.";
  }

  if (connection.pendingInviteEmail) {
    return "Person invite pending; group invite waits for acceptance.";
  }

  if (connection.contactEmail) {
    return "Email on file; group invite can be sent.";
  }

  return "Local person; joins immediately.";
}

export function GroupRosterBuilder({
  connections,
  excludedConnectionIds = [],
  initialSelectedConnectionIds = [],
  minPeople = 0,
  mode,
}: GroupRosterBuilderProps) {
  const [search, setSearch] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState(() => new Set(initialSelectedConnectionIds));
  const [quickRows, setQuickRows] = useState(() => getInitialQuickRows(mode));

  const excludedIds = useMemo(() => new Set(excludedConnectionIds), [excludedConnectionIds]);
  const selectedConnections = useMemo(
    () => sortConnectionsForGroupMembers(connections.filter((connection) => selectedConnectionIds.has(connection.id))),
    [connections, selectedConnectionIds],
  );
  const availableConnections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortConnectionsForGroupMembers(connections.filter((connection) => {
      if (excludedIds.has(connection.id) || selectedConnectionIds.has(connection.id)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        connection.title,
        connection.subtitle,
        connection.notes ?? "",
        connection.pendingInviteEmail ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    }));
  }, [connections, excludedIds, search, selectedConnectionIds]);
  const filledQuickRows = useMemo(
    () => quickRows.filter((row) => row.name.trim() || row.email.trim()),
    [quickRows],
  );
  const rosterCount = selectedConnections.length + filledQuickRows.length;
  const remainingPeople = Math.max(0, minPeople - rosterCount);
  const statusSummary = summarizeGroupMemberStatuses(
    countGroupMemberStatuses(selectedConnections.map((connection) => connection.linkState)),
  );

  function selectConnection(connectionId: string) {
    setSelectedConnectionIds((current) => new Set([...current, connectionId]));
  }

  function removeConnection(connectionId: string) {
    setSelectedConnectionIds((current) => {
      const next = new Set(current);
      next.delete(connectionId);
      return next;
    });
  }

  function updateQuickRow(rowId: string, field: "name" | "email", value: string) {
    setQuickRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, [field]: value } : row
    )));
  }

  function removeQuickRow(rowId: string) {
    setQuickRows((current) => current.length > 1 ? current.filter((row) => row.id !== rowId) : [createQuickRow()]);
  }

  function addQuickRow() {
    setQuickRows((current) => [...current, createQuickRow()]);
  }

  return (
    <fieldset className="grid gap-3 rounded-lg border border-border/85 bg-white/75 p-3.5">
      <legend className="field-label px-2">{mode === "create" ? "Group roster" : "Add people to roster"}</legend>
      <p className="text-sm leading-6 text-foreground/68">
        Add existing people or type new people here. People with app accounts or saved emails are invited; local-only people join immediately.
      </p>
      <p className="text-sm font-semibold text-foreground/70">
        {remainingPeople > 0
          ? `${remainingPeople} more ${remainingPeople === 1 ? "person" : "people"} needed.`
          : `${rosterCount} ${rosterCount === 1 ? "person" : "people"} ready.`}
      </p>

      {selectedConnections.map((connection) => (
        <input key={connection.id} name="connectionIds" type="hidden" value={connection.id} />
      ))}
      {filledQuickRows.map((row) => (
        <div key={`${row.id}-hidden`} className="hidden">
          <input name="quickConnectionNames" readOnly value={row.name} />
          <input name="quickConnectionEmails" readOnly value={row.email} />
        </div>
      ))}

      <div className="grid gap-3">
        {selectedConnections.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs leading-5 text-foreground/56">{statusSummary}</p>
            {selectedConnections.map((connection) => (
              <div key={connection.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-white/78 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{connection.title}</p>
                    <ConnectionLinkBadge
                      linkState={connection.linkState}
                      pendingInviteEmail={connection.pendingInviteEmail}
                      linkedLabel="App account connected"
                      pendingLabel="Person invite pending"
                      unlinkedLabel="Local person"
                    />
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground/62">{getJoinModeLabel(connection)}</p>
                </div>
                <button className="button-secondary" onClick={() => removeConnection(connection.id)} type="button">
                  Remove {connection.title}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3">
          <p className="text-xs leading-5 text-foreground/56">Fill in a name (and optional email) for each new person. Leave a row blank and it will be ignored.</p>
          {quickRows.map((row, index) => (
            <div key={row.id} className="grid gap-3 rounded-lg border border-border/80 bg-white/78 p-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-2">
                <span className="field-label">New person name</span>
                <input
                  className="field-input"
                  onChange={(event) => updateQuickRow(row.id, "name", event.target.value)}
                  placeholder={index === 0 ? "Alex" : "Jordan"}
                  type="text"
                  value={row.name}
                />
              </label>
              <label className="grid gap-2">
                <span className="field-label">New person email</span>
                <input
                  className="field-input"
                  onChange={(event) => updateQuickRow(row.id, "email", event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={row.email}
                />
              </label>
              <button className="button-secondary self-end" onClick={() => removeQuickRow(row.id)} type="button">
                Remove
              </button>
            </div>
          ))}
          <button className="button-secondary w-full sm:w-auto" onClick={addQuickRow} type="button">
            Add another new person
          </button>
        </div>

        <label className="grid gap-2">
          <span className="field-label">Search existing people</span>
          <input
            className="field-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, tags, notes, or invite email"
            type="text"
            value={search}
          />
        </label>
        <div className="grid gap-2">
          {availableConnections.length === 0 ? (
            <p className="text-sm leading-6 text-foreground/65">
              {connections.length === 0 ? "No existing people yet. Add new people above." : "No available people match this search."}
            </p>
          ) : (
            availableConnections.map((connection) => (
              <button
                key={connection.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-white/76 p-3 text-left text-sm text-foreground/78"
                onClick={() => selectConnection(connection.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{connection.title}</span>
                  <span className="mt-1 block text-foreground/62">{getJoinModeLabel(connection)}</span>
                </span>
                <span className="text-sm font-semibold text-accent-strong">Add {connection.title}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </fieldset>
  );
}
