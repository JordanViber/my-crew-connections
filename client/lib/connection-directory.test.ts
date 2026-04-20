import { filterConnections } from "@/lib/connection-directory";
import type { RelationshipSummary } from "@/lib/mvp-data";

const baseConnection: RelationshipSummary = {
  id: "1",
  targetType: "connection",
  title: "Chloe",
  subtitle: "close friend",
  cadenceLabel: "Every 2 weeks",
  cadenceValue: 2,
  cadenceUnit: "weeks",
  reminderLeadDays: 3,
  health: {
    state: "on-track",
    label: "On track",
    summary: "Healthy rhythm",
    daysSinceTouchpoint: 1,
    daysUntilDue: 10,
    dueDateLabel: "Soon",
  },
  tags: ["close friend"],
  notes: "Loves coffee",
  linkState: "unlinked",
  lastTouchpointLabel: "Today",
  touchpointCount: 1,
  memberNames: [],
  memberConnectionIds: [],
};

describe("filterConnections", () => {
  const connections: RelationshipSummary[] = [
    baseConnection,
    {
      ...baseConnection,
      id: "2",
      title: "Jordan",
      linkState: "linked",
      pendingInviteEmail: undefined,
      tags: ["linked"],
    },
    {
      ...baseConnection,
      id: "3",
      title: "Taylor",
      linkState: "pending",
      pendingInviteEmail: "taylor@example.com",
      tags: ["pending"],
    },
  ];

  it("filters by link state", () => {
    expect(filterConnections(connections, "", "linked").map((item) => item.title)).toEqual(["Jordan"]);
    expect(filterConnections(connections, "", "pending").map((item) => item.title)).toEqual(["Taylor"]);
    expect(filterConnections(connections, "", "local").map((item) => item.title)).toEqual(["Chloe"]);
  });

  it("filters by search across relationship context", () => {
    expect(filterConnections(connections, "coffee", "all").map((item) => item.title)).toEqual(["Chloe", "Jordan", "Taylor"]);
    expect(filterConnections(connections, "taylor@example.com", "all").map((item) => item.title)).toEqual(["Taylor"]);
  });
});
