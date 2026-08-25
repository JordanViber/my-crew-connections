import {
  getMemoryTrailCta,
  getNeedsAttentionEmptyCopy,
  getRecentHistoryEmptyCopy,
  getReminderQueueEmptyCopy,
  getUpcomingPlansEmptyCopy,
} from "@/lib/dashboard-empty-copy";

describe("dashboard empty copy", () => {
  it("asks first-run users to add a person or group instead of assuming a rhythm", () => {
    expect(getReminderQueueEmptyCopy(0)).toContain("Add a person or group first");
    expect(getReminderQueueEmptyCopy(0)).not.toMatch(/keep logging/i);
    expect(getNeedsAttentionEmptyCopy(0)).toContain("Add a person or group");
    expect(getUpcomingPlansEmptyCopy(0)).toContain("Add a person first");
    expect(getUpcomingPlansEmptyCopy(0)).not.toMatch(/detail page/i);
  });

  it("keeps the existing empty-queue copy once relationships exist", () => {
    expect(getReminderQueueEmptyCopy(2)).toBe(
      "Your reminder queue is clear right now because your current people and groups are on track.",
    );
    expect(getNeedsAttentionEmptyCopy(2)).toBe(
      "Nothing needs attention right now. Your current people and groups are on track.",
    );
    expect(getRecentHistoryEmptyCopy(2)).toContain("Log your first hangout");
    expect(getUpcomingPlansEmptyCopy(3)).toContain("person or group detail page");
  });

  it("points the memory-trail CTA at adding a person, then logging once people exist", () => {
    expect(getMemoryTrailCta(0)).toEqual({
      href: "/connections?tab=create",
      label: "Add a person",
    });
    expect(getMemoryTrailCta(1)).toEqual({
      href: "/dashboard?section=log",
      label: "Log a touchpoint",
    });
  });
});
