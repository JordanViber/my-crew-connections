import type { RelationshipSummary } from "@/lib/mvp-data";

export type GroupDirectoryFilter = "all" | "attention" | "on-track";

export function filterGroups(
  groups: RelationshipSummary[],
  search: string,
  filter: GroupDirectoryFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return groups.filter((group) => {
    let matchesFilter = true;

    if (filter === "attention") {
      matchesFilter = group.health.state !== "on-track";
    } else if (filter === "on-track") {
      matchesFilter = group.health.state === "on-track";
    }

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [group.title, group.subtitle, (group.memberNames ?? []).join(" "), group.notes ?? ""].join(" ").toLowerCase();
    const pendingHaystack = (group.pendingMembers ?? []).map((member) => `${member.name} ${member.invitedEmail}`).join(" ").toLowerCase();
    return `${haystack} ${pendingHaystack}`.includes(normalizedSearch);
  });
}
