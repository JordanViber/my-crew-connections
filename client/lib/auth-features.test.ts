describe("passkey sign-in flag", () => {
  const original = process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED = original;
    }
    vi.resetModules();
  });

  async function readFlag() {
    vi.resetModules();
    const { passkeySignInEnabled } = await import("@/lib/auth-features");
    return passkeySignInEnabled;
  }

  it("enables passkeys when the variable is unset or empty", async () => {
    delete process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED;
    expect(await readFlag()).toBe(true);

    process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED = "";
    expect(await readFlag()).toBe(true);
  });

  it("enables passkeys when the variable is true", async () => {
    process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED = "true";
    expect(await readFlag()).toBe(true);
  });

  it("disables passkeys when the variable is false", async () => {
    process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED = "false";
    expect(await readFlag()).toBe(false);
  });

  it("disables passkeys when false has different case and surrounding spaces", async () => {
    process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED = " FALSE ";
    expect(await readFlag()).toBe(false);
  });
});