import {
  buildConnectionInvitePath,
  buildConnectionInviteUrl,
  getConnectionLinkState,
  normalizeInviteEmail,
} from "@/lib/invites";

describe("invite helpers", () => {
  it("normalizes invite emails", () => {
    expect(normalizeInviteEmail("  JordanKDog44@Yahoo.com ")).toBe("jordankdog44@yahoo.com");
  });

  it("builds a claim path", () => {
    expect(buildConnectionInvitePath("abc123")).toBe("/invite/abc123");
  });

  it("builds a full invite url", () => {
    expect(buildConnectionInviteUrl("http://127.0.0.1:3100", "abc123")).toBe("http://127.0.0.1:3100/invite/abc123");
  });

  it("reports linked state when a real user is already connected", () => {
    expect(getConnectionLinkState({ linkedUserLabel: "chloejwallach@gmail.com" })).toEqual({
      state: "linked",
      eyebrow: "Link status",
      title: "Linked to a real user",
      body: "This connection is already linked to chloejwallach@gmail.com. No extra invite step is needed now.",
    });
  });

  it("reports pending state when an invite is out", () => {
    expect(getConnectionLinkState({ pendingInviteEmail: "chloejwallach@gmail.com" })).toEqual({
      state: "pending",
      eyebrow: "Link status",
      title: "Invite pending",
      body: "Waiting on chloejwallach@gmail.com to sign in and claim this connection.",
    });
  });

  it("reports unlinked state when nothing has been started", () => {
    expect(getConnectionLinkState({})).toEqual({
      state: "unlinked",
      eyebrow: "Link status",
      title: "No real-user link started yet",
      body: "This person is still only a local connection record. Add an email below whenever you want to start the invite flow.",
    });
  });
});
