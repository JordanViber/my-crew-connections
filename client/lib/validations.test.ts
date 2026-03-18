import { parseCommaSeparatedList } from "@/lib/validations";

describe("validations", () => {
  it("normalizes comma separated tags", () => {
    expect(parseCommaSeparatedList(" close friend, local, , dinner buddy ")).toEqual([
      "close friend",
      "local",
      "dinner buddy",
    ]);
  });
});