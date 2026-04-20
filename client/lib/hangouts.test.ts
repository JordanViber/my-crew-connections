import { formatHangoutWindow, getHangoutStatusLabel, getHangoutWindowBucket } from "@/lib/hangouts";

describe("hangout helpers", () => {
  it("formats a single-time hangout window", () => {
    expect(
      formatHangoutWindow({
        startsAt: "2026-04-19T18:30:00.000Z",
        timezone: "UTC",
      }),
    ).toBe("Sun, Apr 19 at 6:30 PM");
  });

  it("formats a ranged hangout window", () => {
    expect(
      formatHangoutWindow({
        startsAt: "2026-04-19T18:30:00.000Z",
        endsAt: "2026-04-19T20:00:00.000Z",
        timezone: "UTC",
      }),
    ).toBe("Sun, Apr 19 at 6:30 PM - 8:00 PM");
  });

  it("returns readable status labels", () => {
    expect(getHangoutStatusLabel("planned")).toBe("Planned");
    expect(getHangoutStatusLabel("completed")).toBe("Completed");
    expect(getHangoutStatusLabel("canceled")).toBe("Canceled");
  });

  it("groups upcoming windows into friendly buckets", () => {
    const now = new Date("2026-04-19T10:00:00.000Z");

    expect(getHangoutWindowBucket("2026-04-19T18:00:00.000Z", now)).toBe("Today");
    expect(getHangoutWindowBucket("2026-04-20T18:00:00.000Z", now)).toBe("Tomorrow");
    expect(getHangoutWindowBucket("2026-04-23T18:00:00.000Z", now)).toBe("This week");
    expect(getHangoutWindowBucket("2026-05-02T18:00:00.000Z", now)).toBe("Later");
  });
});
