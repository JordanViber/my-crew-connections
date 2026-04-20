export function mapLocalPasswordSignInError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Invalid credentials for the current local stack. If the local database was reset, use 'Create or reset local account' again before signing in.";
  }

  return message;
}
