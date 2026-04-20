import { filterGroups } from "@/lib/group-directory";
import type { RelationshipSummary } from "@/lib/mvp-data";

const baseGroup: RelationshipSummary = {
  id: "1",
  targetType: "group",
  title: "Dinner Crew",
  subtitle: "Monthly dinner",
  cadenceLabel: "Every month",
  cadenceValue: 1,
  cadenceUnit: "months",
  reminderLeadDays: 7,
  health: {
    state: "on-track",
    label: "On track",
    summary: "Healthy rhythm",
    daysSinceTouchpoint: 2,
    daysUntilDue: 20,
    dueDateLabel: "Soon",
  },
  tags: [],
  notes: "Rotating hosts",
  lastTouchpointLabel: "Today",
  touchpointCount: 1,
  memberNames: ["Chloe", "Jordan"],
  memberConnectionIds: ["a", "b"],
};

describe("filterGroups", () => {
  const groups: RelationshipSummary[] = [
    baseGroup,
    {
      ...baseGroup,
      id: "2",
      title: "Run Club",
      health: { ...baseGroup.health, state: "overdue", label: "Overdue" },
    },
  ];

  it("filters by health grouping", () => {
    expect(filterGroups(groups, "", "attention").map((item) => item.title)).toEqual(["Run Club"]);
    expect(filterGroups(groups, "", "on-track").map((item) => item.title)).toEqual(["Dinner Crew"]);
  });

  it("filters by search across title, description, and members", () => {
    expect(filterGroups(groups, "rotating", "all").map((item) => item.title)).toEqual(["Dinner Crew", "Run Club"]);
    expect(filterGroups(groups, "chloe", "all").map((item) => item.title)).toEqual(["Dinner Crew", "Run Club"]);
    expect(filterGroups(groups, "run", "all").map((item) => item.title)).toEqual(["Run Club"]);
  });
});
