export function getNotificationsInboxStatus(notificationCount: number, unreadCount: number) {
  if (notificationCount === 0) {
    return "Nothing here yet";
  }

  if (unreadCount > 0) {
    return unreadCount === 1 ? "1 unread notification" : `${unreadCount} unread notifications`;
  }

  return "All caught up";
}

export function getNotificationsEmptyBody() {
  return "Invites, plan updates, and reminders will show up here. Enable push in Settings if you want those updates on this device.";
}
