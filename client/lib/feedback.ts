const feedbackMessages = {
  "connection-created": {
    tone: "success",
    title: "Person added",
    body: "Cadence is set and this connection is now part of your reminder loop.",
  },
  "connection-saved": {
    tone: "success",
    title: "Connection updated",
    body: "Your cadence and profile changes are saved.",
  },
  "group-created": {
    tone: "success",
    title: "Group created",
    body: "This crew is now tracked on the dashboard with its own cadence.",
  },
  "group-saved": {
    tone: "success",
    title: "Group updated",
    body: "Group settings and cadence changes are saved.",
  },
  "members-added": {
    tone: "success",
    title: "Members added",
    body: "The group now includes the selected people.",
  },
  "connection-archived": {
    tone: "success",
    title: "Person archived",
    body: "This connection is hidden from active lists and reminder surfaces.",
  },
  "group-archived": {
    tone: "success",
    title: "Group archived",
    body: "This group is hidden from active lists and reminder surfaces.",
  },
  "touchpoint-saved": {
    tone: "success",
    title: "Touchpoint logged",
    body: "Your history is updated and reminder timing has been recalculated.",
  },
  "hangout-saved": {
    tone: "success",
    title: "Plan saved",
    body: "This hangout now stays visible on the dashboard until you complete or cancel it.",
  },
  "hangout-completed": {
    tone: "success",
    title: "Plan completed",
    body: "The plan was logged as a hangout touchpoint and removed from the upcoming queue.",
  },
  "hangout-canceled": {
    tone: "success",
    title: "Plan canceled",
    body: "This saved hangout was removed from the upcoming queue.",
  },
  "invite-created": {
    tone: "success",
    title: "Invite ready",
    body: "Share the invite link with that person so they can sign in or create an account and claim the connection.",
  },
  "connection-linked": {
    tone: "success",
    title: "Connection linked",
    body: "This relationship is now linked to a real app user account.",
  },
} as const;

export type FeedbackKey = keyof typeof feedbackMessages;
export type FeedbackTone = "success" | "error";

export function getFeedback(key?: string) {
  if (!key) {
    return null;
  }

  return feedbackMessages[key as FeedbackKey] ?? null;
}

export function getFeedbackClasses(tone: FeedbackTone) {
  if (tone === "error") {
    return "bg-[#f8d2ca] text-[#7c291d]";
  }

  return "bg-mint text-[#214c35]";
}
