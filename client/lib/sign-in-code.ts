export const SIGN_IN_CODE_MIN_LENGTH = 6;
export const SIGN_IN_CODE_MAX_LENGTH = 10;

const signInCodePattern = new RegExp(`^\\d{${SIGN_IN_CODE_MIN_LENGTH},${SIGN_IN_CODE_MAX_LENGTH}}$`);

export function normalizeSignInCode(value: string) {
  return value.replace(/\D/g, "").slice(0, SIGN_IN_CODE_MAX_LENGTH);
}

export function isSignInCode(value: string) {
  return signInCodePattern.test(value);
}
