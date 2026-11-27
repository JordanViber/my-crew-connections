import { isSignInCode, normalizeSignInCode, SIGN_IN_CODE_MAX_LENGTH } from "@/lib/sign-in-code";

describe("sign-in codes", () => {
  it("keeps 6-digit and 8-digit codes unchanged", () => {
    expect(normalizeSignInCode("123456")).toBe("123456");
    expect(normalizeSignInCode("12345678")).toBe("12345678");
    expect(isSignInCode("123456")).toBe(true);
    expect(isSignInCode("12345678")).toBe(true);
  });

  it("keeps digits only and caps the length at 10", () => {
    expect(normalizeSignInCode("12ab 3456-78")).toBe("12345678");
    expect(normalizeSignInCode("1234567890123")).toBe("1234567890");
    expect(normalizeSignInCode("1234567890123")).toHaveLength(SIGN_IN_CODE_MAX_LENGTH);
    expect(isSignInCode("12345")).toBe(false);
    expect(isSignInCode("12345a")).toBe(false);
    expect(isSignInCode("12345678901")).toBe(false);
    expect(isSignInCode("1234567890")).toBe(true);
  });
});
