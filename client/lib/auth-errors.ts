export function mapLocalPasswordSignInError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Invalid credentials for the current local stack. If the local database was reset, use 'Create or reset local account' again before signing in.";
  }

  return message;
}

export const PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE = "Invalid email, phone, or password.";
export const PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE =
  "We couldn't reach the sign-in service. Try again in a moment.";

const RETRYABLE_AUTH_STATUSES = new Set([500, 503, 504]);
const RETRYABLE_AUTH_CODES = new Set(["request_timeout", "unexpected_failure"]);
const RETRYABLE_AUTH_MESSAGE = /deadline|timeout|fetch/i;

type AuthErrorLike = {
  code?: string | null;
  message?: string | null;
  name?: string | null;
  status?: number | null;
};

function asAuthErrorLike(error: unknown): AuthErrorLike | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  return error as AuthErrorLike;
}

export function isRetryableAuthServiceError(error: unknown) {
  if (typeof error === "string") {
    return RETRYABLE_AUTH_MESSAGE.test(error);
  }

  const candidate = asAuthErrorLike(error);

  if (!candidate) {
    return false;
  }

  if (typeof candidate.status === "number" && RETRYABLE_AUTH_STATUSES.has(candidate.status)) {
    return true;
  }

  const code = candidate.code?.trim().toLowerCase();
  if (code && RETRYABLE_AUTH_CODES.has(code)) {
    return true;
  }

  if (candidate.name === "AuthRetryableFetchError") {
    return true;
  }

  return typeof candidate.message === "string" && RETRYABLE_AUTH_MESSAGE.test(candidate.message);
}

export function mapPasswordSignInServiceError(error: unknown) {
  if (isRetryableAuthServiceError(error)) {
    return {
      status: 503 as const,
      error: PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE,
    };
  }

  return {
    status: 400 as const,
    error: PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE,
  };
}

export function getPasswordSignInClientErrorMessage(status: number, bodyError?: string | null) {
  const trimmed = bodyError?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (RETRYABLE_AUTH_STATUSES.has(status)) {
    return PASSWORD_SIGN_IN_UNREACHABLE_MESSAGE;
  }

  return PASSWORD_SIGN_IN_INVALID_CREDENTIALS_MESSAGE;
}
