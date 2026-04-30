export type GroupMemberStatusCounts = {
  linked: number;
  pending: number;
  local: number;
};

type ConnectionLinkState = "linked" | "pending" | "unlinked" | null | undefined;

function createEmptyGroupMemberStatusCounts(): GroupMemberStatusCounts {
  return {
    linked: 0,
    pending: 0,
    local: 0,
  };
}

function getGroupMemberStatusKey(linkState: ConnectionLinkState) {
  if (linkState === "linked") {
    return "linked" as const;
  }

  if (linkState === "pending") {
    return "pending" as const;
  }

  return "local" as const;
}

export function countGroupMemberStatuses(linkStates: ConnectionLinkState[]) {
  return linkStates.reduce((counts, linkState) => {
    counts[getGroupMemberStatusKey(linkState)] += 1;
    return counts;
  }, createEmptyGroupMemberStatusCounts());
}

export function summarizeGroupMemberStatuses(counts: GroupMemberStatusCounts) {
  const summaryParts: string[] = [];

  if (counts.linked > 0) {
    summaryParts.push(`${counts.linked} connected in app`);
  }

  if (counts.pending > 0) {
    summaryParts.push(`${counts.pending} invite pending`);
  }

  if (counts.local > 0) {
    summaryParts.push(`${counts.local} local-only`);
  }

  return summaryParts.join(" • ") || "No members added yet";
}

export function sortConnectionsForGroupMembers<T extends { title: string; linkState?: ConnectionLinkState }>(connections: T[]) {
  const statusOrder = {
    linked: 0,
    pending: 1,
    local: 2,
  } as const;

  return [...connections].sort((left, right) => {
    const stateDifference = statusOrder[getGroupMemberStatusKey(left.linkState)] - statusOrder[getGroupMemberStatusKey(right.linkState)];

    if (stateDifference !== 0) {
      return stateDifference;
    }

    return left.title.localeCompare(right.title);
  });
}