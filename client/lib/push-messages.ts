export const noAccountSubscriptionMessage = "No subscription for this account on this device.";
export const expiredSubscriptionMessage = "This subscription expired. Turn notifications off and on again on this device.";
export const pushNotConfiguredMessage = "Push isn't configured for this app.";
export const pushPermissionRejectedMessage = "Push permission was rejected. Turn notifications off and on again on this device.";
export const pushServiceBusyMessage = "The push service is busy. Try again in a moment.";
export const pushPayloadTooLargeMessage = "The test notification was too large to send.";
export const pushDeliveryRejectedMessage = "The push service could not deliver the test notification.";
export const pushSignInAgainMessage = "Sign in again to send a test notification.";
export const pushSubscriptionsUnavailableMessage = "Push subscriptions are not ready yet.";
export const relinkedDeviceMessage = "This device is linked to another account — relinked to this account.";

export function shouldResaveBrowserSubscription(input: {
  browserEndpoint?: string | null;
  savedEndpoint?: string | null;
  savedEnabled?: boolean | null;
}) {
  if (!input.browserEndpoint) {
    return false;
  }

  if (!input.savedEndpoint || input.savedEnabled === false) {
    return true;
  }

  return input.browserEndpoint !== input.savedEndpoint;
}

export function describePushServiceFailure(statusCode: number, errorMessage?: string | null) {
  if (statusCode === 404 || statusCode === 410) {
    return expiredSubscriptionMessage;
  }

  if (statusCode === 401 || statusCode === 403) {
    return pushPermissionRejectedMessage;
  }

  if (statusCode === 429) {
    return pushServiceBusyMessage;
  }

  if (statusCode === 413) {
    return pushPayloadTooLargeMessage;
  }

  if (errorMessage && /missing vapid/i.test(errorMessage)) {
    return pushNotConfiguredMessage;
  }

  return pushDeliveryRejectedMessage;
}
