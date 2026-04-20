import type { RelationshipSummary } from "@/lib/mvp-data";

export type GroupDirectoryFilter = "all" | "attention" | "on-track";

export function filterGroups(
  groups: RelationshipSummary[],
  search: string,
  filter: GroupDirectoryFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return groups.filter((group) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "attention"
          ? group.health.state !== "on-track"
          : group.health.state === "on-track";

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [group.title, group.subtitle, group.memberNames.join(" "), group.notes ?? ""].join(" ").toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}
