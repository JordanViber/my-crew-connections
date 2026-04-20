import type { RelationshipSummary } from "@/lib/mvp-data";

export type ConnectionDirectoryFilter = "all" | "linked" | "pending" | "local";

export function filterConnections(
  connections: RelationshipSummary[],
  search: string,
  filter: ConnectionDirectoryFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return connections.filter((connection) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "linked"
          ? connection.linkState === "linked"
          : filter === "pending"
            ? connection.linkState === "pending"
            : connection.linkState === "unlinked";

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      connection.title,
      connection.subtitle,
      connection.tags.join(" "),
      connection.notes ?? "",
      connection.preferredActivities ?? "",
      connection.pendingInviteEmail ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}
