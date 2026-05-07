import {
  canAccessSharedGroup,
  canManageGroupPlans,
  getGroupRoleCapabilities,
} from "@/lib/group-collaboration";

describe("group collaboration capability helpers", () => {
  it("keeps owner controls broad and destructive settings owner-only", () => {
    expect(getGroupRoleCapabilities("owner")).toEqual({
      canArchive: true,
      canCreatePlans: true,
      canLogTouchpoints: true,
      canManageMembers: true,
      canManagePlans: true,
      canManageSettings: true,
      canViewSharedHistory: true,
    });
  });

  it("lets organizers manage shared plans without settings or member controls", () => {
    expect(getGroupRoleCapabilities("organizer")).toMatchObject({
      canArchive: false,
      canCreatePlans: true,
      canLogTouchpoints: true,
      canManageMembers: false,
      canManagePlans: true,
      canManageSettings: false,
      canViewSharedHistory: true,
    });
  });

  it("lets accepted members participate but not manage plans or settings", () => {
    expect(getGroupRoleCapabilities("member")).toMatchObject({
      canCreatePlans: true,
      canLogTouchpoints: true,
      canManagePlans: false,
      canManageSettings: false,
      canViewSharedHistory: true,
    });
  });

  it("does not grant pending or missing roles shared access", () => {
    expect(getGroupRoleCapabilities(null)).toMatchObject({
      canCreatePlans: false,
      canLogTouchpoints: false,
      canManagePlans: false,
      canManageSettings: false,
      canViewSharedHistory: false,
    });
    expect(canAccessSharedGroup(undefined)).toBe(false);
  });

  it("limits plan management to owners and organizers", () => {
    expect(canManageGroupPlans("owner")).toBe(true);
    expect(canManageGroupPlans("organizer")).toBe(true);
    expect(canManageGroupPlans("member")).toBe(false);
    expect(canManageGroupPlans(null)).toBe(false);
  });
});
