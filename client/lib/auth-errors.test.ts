import { mapLocalPasswordSignInError } from "@/lib/auth-errors";

describe("mapLocalPasswordSignInError", () => {
  it("turns generic invalid-credentials errors into local-stack guidance", () => {
    expect(mapLocalPasswordSignInError("Invalid login credentials")).toBe(
      "Invalid credentials for the current local stack. If the local database was reset, use 'Create or reset local account' again before signing in.",
    );
  });

  it("leaves unrelated auth errors alone", () => {
    expect(mapLocalPasswordSignInError("Email not confirmed")).toBe("Email not confirmed");
  });
});
