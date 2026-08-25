export type ConnectionLinkState = "linked" | "pending" | "unlinked";

export type SharedTouchpointInput = {
  touchpointType: "check-in" | "message" | "call" | "hangout";
  occurredAt: string;
  activityLabel?: string | null;
  locationLabel?: string | null;
  photoAlbumLabel?: string | null;
  photoAlbumUrl?: string | null;
  note?: string | null;
};

const SHARED_ACTIVITY_FALLBACKS: Record<SharedTouchpointInput["touchpointType"], string> = {
  hangout: "Shared hangout",
  "check-in": "Shared check-in",
  call: "Shared call",
  message: "Shared message",
};

export function canShareTouchpointWithLinkedUser(linkState?: ConnectionLinkState | string | null) {
  return linkState === "linked";
}

export function shouldShareTouchpoint(input: {
  targetType?: string | null;
  shareWithLinkedUser?: boolean | string | null;
  linkedUserId?: string | null;
}) {
  const shareRequested = input.shareWithLinkedUser === true || input.shareWithLinkedUser === "true";
  return input.targetType === "connection" && shareRequested && Boolean(input.linkedUserId?.trim());
}

export function buildSharedTouchpointCopy(input: SharedTouchpointInput) {
  const activityLabel = input.activityLabel?.trim() || "";
  const locationLabel = input.locationLabel?.trim() || "";

  return {
    touchpointType: input.touchpointType,
    occurredAt: input.occurredAt,
    activityLabel: activityLabel || SHARED_ACTIVITY_FALLBACKS[input.touchpointType],
    locationLabel: locationLabel || null,
    photoAlbumLabel: input.photoAlbumLabel?.trim() || null,
    photoAlbumUrl: input.photoAlbumUrl?.trim() || null,
    note: null,
  };
}

export function getSharedTouchpointFeedbackKey(didShare: boolean) {
  return didShare ? "touchpoint-shared" : "touchpoint-saved";
}

export function buildSharedMemoryNotification(input: {
  sharerName: string;
  touchpointType: SharedTouchpointInput["touchpointType"];
  activityLabel?: string | null;
}) {
  const activity = input.activityLabel?.trim() || SHARED_ACTIVITY_FALLBACKS[input.touchpointType];
  return {
    title: "Shared memory",
    body: `${input.sharerName} shared a memory with you: ${activity}.`,
  };
}
