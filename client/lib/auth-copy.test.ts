import { getAccountCreatedBannerBody, getCreateAccountPhoneHelperCopy } from "@/lib/auth-copy";

describe("auth copy", () => {
  it("tells new users to confirm from their inbox without environment hedging", () => {
    const body = getAccountCreatedBannerBody();

    expect(body).toContain("Check your inbox to confirm");
    expect(body).toContain("sign in");
    expect(body).not.toMatch(/if email confirmation is enabled/i);
    expect(body).not.toMatch(/this environment/i);
  });

  it("treats the create-account phone field as optional profile info when SMS auth is off", () => {
    const copy = getCreateAccountPhoneHelperCopy(false);

    expect(copy).toMatch(/optional profile info/i);
    expect(copy).not.toMatch(/SMS sign-in is hidden/i);
    expect(copy).not.toMatch(/this environment/i);
  });

  it("mentions later SMS sign-in when phone auth is on", () => {
    const copy = getCreateAccountPhoneHelperCopy(true);

    expect(copy).toMatch(/SMS sign-in later/i);
    expect(copy).not.toMatch(/hidden in this environment/i);
  });
});
