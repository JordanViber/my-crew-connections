import { getNotificationsEmptyBody, getNotificationsInboxStatus } from "@/lib/notification-copy";

describe("notification empty copy", () => {
  it("does not imply a caught-up inbox when there are zero notifications", () => {
    expect(getNotificationsInboxStatus(0, 0)).toBe("Nothing here yet");
    expect(getNotificationsInboxStatus(0, 0)).not.toMatch(/all caught up/i);
    expect(getNotificationsEmptyBody()).toMatch(/invites/i);
    expect(getNotificationsEmptyBody()).toMatch(/reminders/i);
    expect(getNotificationsEmptyBody()).toMatch(/settings/i);
  });

  it("keeps All caught up only after the user has a real inbox that is fully read", () => {
    expect(getNotificationsInboxStatus(3, 0)).toBe("All caught up");
    expect(getNotificationsInboxStatus(3, 1)).toBe("1 unread notification");
    expect(getNotificationsInboxStatus(4, 2)).toBe("2 unread notifications");
  });
});
