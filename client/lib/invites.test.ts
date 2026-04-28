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
      title: "Connected to their account",
      body: "This connection is already tied to chloejwallach@gmail.com. No new invite is needed right now.",
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
      title: "Not linked yet",
      body: "This person is only in your private list right now. Add an email below whenever you want to invite them in.",
    });
  });
});
