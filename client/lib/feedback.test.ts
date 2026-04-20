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
});
