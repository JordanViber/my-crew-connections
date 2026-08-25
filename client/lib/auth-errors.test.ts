import {
  getPasswordSignInClientErrorMessage,
  isRetryableAuthServiceError,
  mapLocalPasswordSignInError,
  mapPasswordSignInServiceError,
  PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE,
  PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE,
} from "@/lib/auth-errors";

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

describe("password sign-in error mapping", () => {
  it("treats timeout, 504, and retryable fetch failures as unreachable", () => {
    expect(isRetryableAuthServiceError({ status: 504, message: "Gateway Timeout" })).toBe(true);
    expect(isRetryableAuthServiceError({ status: 503 })).toBe(true);
    expect(isRetryableAuthServiceError({ status: 500 })).toBe(true);
    expect(isRetryableAuthServiceError({ code: "request_timeout" })).toBe(true);
    expect(isRetryableAuthServiceError({ code: "unexpected_failure" })).toBe(true);
    expect(isRetryableAuthServiceError({ message: "context deadline exceeded" })).toBe(true);
    expect(isRetryableAuthServiceError({ message: "request timeout" })).toBe(true);
    expect(isRetryableAuthServiceError({ message: "Failed to fetch" })).toBe(true);
    expect(isRetryableAuthServiceError({ name: "AuthRetryableFetchError" })).toBe(true);

    expect(mapPasswordSignInServiceError({ status: 504, code: "request_timeout" })).toEqual({
      status: 503,
      error: PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE,
    });
  });

  it("keeps invalid credentials and missing users as 400", () => {
    expect(isRetryableAuthServiceError({ status: 400, code: "invalid_credentials" })).toBe(false);
    expect(isRetryableAuthServiceError({ code: "user_not_found" })).toBe(false);
    expect(isRetryableAuthServiceError({ message: "Invalid login credentials" })).toBe(false);
    expect(isRetryableAuthServiceError({ message: "Invalid email or password" })).toBe(false);

    expect(mapPasswordSignInServiceError({ code: "invalid_credentials" })).toEqual({
      status: 400,
      error: PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE,
    });
  });

  it("prefers the API error body, then distinguishes 503-class fallbacks in the form", () => {
    expect(getPasswordSignInClientErrorMessage(503, PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE)).toBe(
      PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE,
    );
    expect(getPasswordSignInClientErrorMessage(400, PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE)).toBe(
      PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE,
    );
    expect(getPasswordSignInClientErrorMessage(504)).toBe(PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE);
    expect(getPasswordSignInClientErrorMessage(400)).toBe(PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE);
  });
});
