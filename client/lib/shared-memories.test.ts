import {
  buildSharedMemoryNotification,
  buildSharedTouchpointCopy,
  canShareTouchpointWithLinkedUser,
  getSharedTouchpointFeedbackKey,
  shouldShareTouchpoint,
} from "@/lib/shared-memories";

describe("shared memory helpers", () => {
  it("only allows sharing for two-way-linked connections", () => {
    expect(canShareTouchpointWithLinkedUser("linked")).toBe(true);
    expect(canShareTouchpointWithLinkedUser("pending")).toBe(false);
    expect(canShareTouchpointWithLinkedUser("unlinked")).toBe(false);
    expect(canShareTouchpointWithLinkedUser(null)).toBe(false);
  });

  it("shares only when a linked connection checkbox is requested", () => {
    expect(shouldShareTouchpoint({
      targetType: "connection",
      shareWithLinkedUser: "true",
      linkedUserId: "user-2",
    })).toBe(true);

    expect(shouldShareTouchpoint({
      targetType: "connection",
      shareWithLinkedUser: true,
      linkedUserId: "user-2",
    })).toBe(true);
  });

  it("does not share unlinked, pending, or group targets", () => {
    expect(shouldShareTouchpoint({
      targetType: "connection",
      shareWithLinkedUser: "true",
      linkedUserId: null,
    })).toBe(false);

    expect(shouldShareTouchpoint({
      targetType: "connection",
      shareWithLinkedUser: "",
      linkedUserId: "user-2",
    })).toBe(false);

    expect(shouldShareTouchpoint({
      targetType: "group",
      shareWithLinkedUser: "true",
      linkedUserId: "user-2",
    })).toBe(false);
  });

  it("strips private notes and keeps public activity details", () => {
    expect(buildSharedTouchpointCopy({
      touchpointType: "hangout",
      occurredAt: "2026-08-24T18:00:00.000Z",
      activityLabel: "Dinner",
      locationLabel: "Cafe Luna",
      photoAlbumLabel: "Patio album",
      photoAlbumUrl: "https://photos.example/album",
      note: "Private reminder about their job interview",
    })).toEqual({
      touchpointType: "hangout",
      occurredAt: "2026-08-24T18:00:00.000Z",
      activityLabel: "Dinner",
      locationLabel: "Cafe Luna",
      photoAlbumLabel: "Patio album",
      photoAlbumUrl: "https://photos.example/album",
      note: null,
    });
  });

  it("uses a public fallback summary when activity and location are empty", () => {
    expect(buildSharedTouchpointCopy({
      touchpointType: "check-in",
      occurredAt: "2026-08-24T18:00:00.000Z",
      note: "Keep this private",
    })).toMatchObject({
      activityLabel: "Shared check-in",
      locationLabel: null,
      note: null,
    });
  });

  it("returns the shared feedback key only after a copy is created", () => {
    expect(getSharedTouchpointFeedbackKey(true)).toBe("touchpoint-shared");
    expect(getSharedTouchpointFeedbackKey(false)).toBe("touchpoint-saved");
  });

  it("builds linked-user notification copy", () => {
    expect(buildSharedMemoryNotification({
      sharerName: "Jordan",
      touchpointType: "hangout",
      activityLabel: "Dinner",
    })).toEqual({
      title: "Shared memory",
      body: "Jordan shared a memory with you: Dinner.",
    });
  });
});
