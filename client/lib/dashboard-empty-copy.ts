export function getNeedsAttentionEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "Nothing is due soon yet. Add a person or group and set a cadence to start the loop.";
  }

  return "Nothing needs attention right now. Your current people and groups are on track.";
}

export function getRecentHistoryEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "No touchpoints yet. Your first log will appear here immediately.";
  }

  return "No touchpoints yet. Log your first hangout, check-in, call, or message to turn this into a useful memory trail.";
}

export function getReminderQueueEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "Nothing is queued yet. Add a person or group first, then set a cadence so reminders have somewhere to go.";
  }

  return "Your reminder queue is clear right now because your current people and groups are on track.";
}

export function getUpcomingPlansEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "No saved plans yet. Add a person first, then you can create a plan from their page.";
  }

  return "No saved plans yet. Create one from a person or group detail page and it will stay visible here.";
}

export function getMemoryTrailCta(relationshipCount: number) {
  if (relationshipCount === 0) {
    return {
      href: "/connections?tab=create",
      label: "Add a person",
    };
  }

  return {
    href: "/dashboard?section=log",
    label: "Log a touchpoint",
  };
}
