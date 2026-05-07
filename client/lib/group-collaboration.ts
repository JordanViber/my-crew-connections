export type GroupRole = "owner" | "organizer" | "member";

export type GroupRoleCapabilities = {
  canArchive: boolean;
  canCreatePlans: boolean;
  canLogTouchpoints: boolean;
  canManageMembers: boolean;
  canManagePlans: boolean;
  canManageSettings: boolean;
  canViewSharedHistory: boolean;
};

function hasAcceptedGroupRole(role?: GroupRole | string | null): role is GroupRole {
  return role === "owner" || role === "organizer" || role === "member";
}

export function canAccessSharedGroup(role?: GroupRole | string | null) {
  return hasAcceptedGroupRole(role);
}

export function canManageGroupPlans(role?: GroupRole | string | null) {
  return role === "owner" || role === "organizer";
}

export function getGroupRoleCapabilities(role?: GroupRole | string | null): GroupRoleCapabilities {
  const canAccess = canAccessSharedGroup(role);
  const canManagePlans = canManageGroupPlans(role);
  const isOwner = role === "owner";

  return {
    canArchive: isOwner,
    canCreatePlans: canAccess,
    canLogTouchpoints: canAccess,
    canManageMembers: isOwner,
    canManagePlans,
    canManageSettings: isOwner,
    canViewSharedHistory: canAccess,
  };
}
