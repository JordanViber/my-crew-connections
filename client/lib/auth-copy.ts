export function getAccountCreatedBannerBody() {
  return "Check your inbox to confirm your account, then sign in below.";
}

export function getCreateAccountPhoneHelperCopy(phoneAuthEnabled: boolean) {
  if (phoneAuthEnabled) {
    return "A phone number is optional. Add one now if you want it on your profile — you can use it for SMS sign-in later.";
  }

  return "A phone number is optional profile info. Add one now if you want it saved to your account.";
}
