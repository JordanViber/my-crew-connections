import { claimInviteResultFromRedirect, readActionRedirect } from "@/lib/claim-invite-result";

describe("claim invite result", () => {
  it("reads a Next redirect digest", () => {
    expect(readActionRedirect({
      digest: "NEXT_REDIRECT;replace;/invite/token?claimed=1;307;",
    })).toBe("/invite/token?claimed=1");
    expect(readActionRedirect(new Error("Failed to claim invite"))).toBeNull();
  });

  it("turns an error redirect into a visible failure and a claim redirect into success", () => {
    expect(claimInviteResultFromRedirect("/invite/token?error=This%20invite%20is%20no%20longer%20active.")).toEqual({
      ok: false,
      message: "This invite is no longer active.",
    });
    expect(claimInviteResultFromRedirect("/invite/token?claimed=1")).toEqual({
      ok: true,
      href: "/invite/token?claimed=1",
    });
  });
});
