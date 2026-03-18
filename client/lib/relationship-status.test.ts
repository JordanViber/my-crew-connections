import { addCadence, getRelationshipHealth } from "@/lib/relationship-status";

describe("relationship-status", () => {
  it("adds weekly cadence windows correctly", () => {
    const dueAt = addCadence(new Date("2026-03-01T00:00:00.000Z"), 2, "weeks");

    expect(dueAt.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("marks relationships as due soon when they enter the lead window", () => {
    const health = getRelationshipHealth({
      createdAt: "2026-03-01T10:00:00.000Z",
      lastTouchpointAt: "2026-03-01T10:00:00.000Z",
      cadenceValue: 2,
      cadenceUnit: "weeks",
      reminderLeadDays: 3,
      referenceAt: new Date("2026-03-12T12:00:00.000Z"),
    });

    expect(health.state).toBe("due-soon");
    expect(health.daysUntilDue).toBe(3);
  });

  it("marks first touchpoints as overdue after the cadence window passes", () => {
    const health = getRelationshipHealth({
      createdAt: "2026-03-01T10:00:00.000Z",
      cadenceValue: 1,
      cadenceUnit: "weeks",
      reminderLeadDays: 2,
      referenceAt: new Date("2026-03-11T12:00:00.000Z"),
    });

    expect(health.state).toBe("overdue");
    expect(health.isFirstTouchpoint).toBe(true);
    expect(health.label).toBe("First plan overdue");
  });
});