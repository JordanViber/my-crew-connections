import { getFeedback } from "@/lib/feedback";

describe("feedback helpers", () => {
  it("returns a configured feedback message for known keys", () => {
    expect(getFeedback("touchpoint-saved")).toEqual({
      tone: "success",
      title: "Touchpoint logged",
      body: "Your history is updated and reminder timing has been recalculated.",
    });
  });

  it("returns null for unknown keys", () => {
    expect(getFeedback("not-real")).toBeNull();
  });

  it("returns configured feedback for shared connection plan keys", () => {
    expect(getFeedback("hangout-share-pending")?.title).toBe("Shared plan sent");
    expect(getFeedback("hangout-share-accepted")?.title).toBe("Plan joined");
    expect(getFeedback("hangout-share-declined")?.title).toBe("Passed for now");
  });
});
