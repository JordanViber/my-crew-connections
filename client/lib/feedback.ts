const feedbackMessages = {
  "connection-created": {
    tone: "success",
    title: "Person added",
    body: "Cadence is set and this connection is now part of your reminder loop.",
  },
  "connection-created-invite-sent": {
    tone: "success",
    title: "Person added and invite sent",
    body: "The invite email went out with a direct claim link, and the invite will also appear in-app if they already have an account.",
  },
  "connection-created-invite-pushed": {
    tone: "success",
    title: "Person added and invite delivered in app",
    body: "Push reached an existing account, and the invite is waiting in the app without sending a duplicate email first.",
  },
  "connection-created-invite-ready": {
    tone: "success",
    title: "Person added and invite ready",
    body: "The invite record is ready, but direct email delivery is not configured for this environment yet.",
  },
  "connection-saved": {
    tone: "success",
    title: "Connection updated",
    body: "Your cadence and profile changes are saved.",
  },
  "connection-email-already-linked": {
    tone: "error",
    title: "Email already linked",
    body: "That email is already linked to another person in your list. Open the existing person instead of creating a duplicate link.",
  },
  "connection-email-already-saved": {
    tone: "error",
    title: "Email already saved",
    body: "That email already belongs to another person in your list. Reuse the existing person instead of saving the same contact email twice.",
  },
  "connection-email-invite-pending": {
    tone: "error",
    title: "Invite already pending",
    body: "That email already has a pending invite on another person in your list. Reuse or refresh the existing invite instead of sending another one.",
  },
  "group-created": {
    tone: "success",
    title: "Group created",
    body: "This crew is now tracked on the dashboard with its own cadence.",
  },
  "group-created-with-invites": {
    tone: "success",
    title: "Group created and invites started",
    body: "Invite-backed members are pending now. They will show as accepted only after they respond.",
  },
  "group-created-with-members-and-invites": {
    tone: "success",
    title: "Group created with members and invites",
    body: "Local-only members were added immediately, and invite-backed members are waiting on a response.",
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
  "group-invites-created": {
    tone: "success",
    title: "Group invites started",
    body: "The selected people are pending until they accept or decline the group invite.",
  },
  "members-added-and-invited": {
    tone: "success",
    title: "Members added and invites started",
    body: "Local-only people were added now, while invite-backed people are waiting on a response.",
  },
  "group-invite-accepted": {
    tone: "success",
    title: "Group invite accepted",
    body: "Your response is recorded. The group owner now sees you as an accepted member.",
  },
  "group-invite-declined": {
    tone: "success",
    title: "Group invite declined",
    body: "Your decline is recorded, so the owner still sees that invite as declined instead of accepted.",
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
    body: "The invite record is ready. Share the link directly if email delivery is unavailable.",
  },
  "invite-sent": {
    tone: "success",
    title: "Invite sent",
    body: "The invite email went out with a direct claim link, and it will also appear in-app if they already have an account.",
  },
  "invite-pushed": {
    tone: "success",
    title: "Invite delivered in app",
    body: "Push reached an existing account, and the invite is waiting in the app without sending a duplicate email first.",
  },
  "connection-linked": {
    tone: "success",
    title: "Connection linked",
    body: "This relationship is now linked to a real app user account.",
  },
  "profile-saved": {
    tone: "success",
    title: "Profile saved",
    body: "Your account details are updated everywhere this app uses your identity.",
  },
  "email-update-sent": {
    tone: "success",
    title: "Email update started",
    body: "If your auth provider requires confirmation, finish the change from the message sent to your new address.",
  },
  "password-updated": {
    tone: "success",
    title: "Password updated",
    body: "Your new password is active for the next sign-in.",
  },
  "phone-auth-enabled": {
    tone: "success",
    title: "Phone sign-in verified",
    body: "Your phone number is now ready for text-message sign-in and direct phone plus password sign-in.",
  },
  "feedback-sent": {
    tone: "success",
    title: "Feedback sent",
    body: "Thanks. Your note is saved and ready to review.",
  },
  "feedback-unavailable": {
    tone: "error",
    title: "Feedback could not be saved",
    body: "Try again in a bit.",
  },
  "billing-started": {
    tone: "success",
    title: "Billing started",
    body: "Stripe is processing your subscription. The billing status will update after checkout completes.",
  },
  "billing-canceled": {
    tone: "success",
    title: "Checkout canceled",
    body: "No changes were made. You can choose monthly or yearly again anytime.",
  },
  "billing-unavailable": {
    tone: "error",
    title: "Billing unavailable",
    body: "Stripe billing is not configured for this environment yet.",
  },
  "billing-portal-unavailable": {
    tone: "error",
    title: "Billing portal unavailable",
    body: "The customer portal is not ready for this account yet.",
  },
  "connection-limit-reached": {
    tone: "error",
    title: "Free person slot used",
    body: "Upgrade to Premium to add unlimited people, groups, plans, and relationship history.",
  },
  "group-limit-reached": {
    tone: "error",
    title: "Free group slot used",
    body: "Upgrade to Premium to create unlimited groups and keep every recurring crew on track.",
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
