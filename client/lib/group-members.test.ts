import {
  countGroupMemberStatuses,
  sortConnectionsForGroupMembers,
  summarizeGroupMemberStatuses,
} from "@/lib/group-members";

describe("group member status helpers", () => {
  it("counts linked, pending, and local members separately", () => {
    expect(countGroupMemberStatuses(["linked", "pending", "unlinked", undefined, "linked"])).toEqual({
      linked: 2,
      pending: 1,
      local: 2,
    });
  });

  it("summarizes member states for UI copy", () => {
    expect(
      summarizeGroupMemberStatuses({
        linked: 2,
        pending: 1,
        local: 3,
      }),
    ).toBe("2 connected in app • 1 invite pending • 3 local-only");
  });

  it("sorts connected people ahead of pending and local-only entries", () => {
    const sorted = sortConnectionsForGroupMembers([
      { title: "Taylor", linkState: "unlinked" as const },
      { title: "Alex", linkState: "pending" as const },
      { title: "Jordan", linkState: "linked" as const },
      { title: "Casey", linkState: "linked" as const },
    ]);

    expect(sorted.map((connection) => connection.title)).toEqual(["Casey", "Jordan", "Alex", "Taylor"]);
  });
});