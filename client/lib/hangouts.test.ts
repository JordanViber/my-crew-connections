import {
  buildAppleMapsSearchUrl,
  buildGoogleMapsSearchUrl,
  buildOpenTableSearchUrl,
  buildYelpSearchUrl,
  formatHangoutWindow,
  getHangoutProviderLinks,
  getHangoutStatusLabel,
  getHangoutWindowBucket,
} from "@/lib/hangouts";

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

  it("builds encoded Google and Apple Maps search urls", () => {
    const place = {
      placeName: "Cafe Luna",
      placeAddress: "123 Main St, Austin, TX",
      location: "Downtown patio",
    };

    expect(buildGoogleMapsSearchUrl(place)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Cafe+Luna+123+Main+St%2C+Austin%2C+TX",
    );
    expect(buildAppleMapsSearchUrl(place)).toBe(
      "http://maps.apple.com/?q=Cafe+Luna+123+Main+St%2C+Austin%2C+TX",
    );
  });

  it("builds encoded Yelp and OpenTable search urls", () => {
    const place = {
      placeName: "Cafe Luna",
      placeAddress: "123 Main St, Austin, TX",
      location: "Downtown patio",
    };

    expect(buildYelpSearchUrl(place)).toBe(
      "https://www.yelp.com/search?find_desc=Cafe+Luna&find_loc=123+Main+St%2C+Austin%2C+TX",
    );
    expect(buildOpenTableSearchUrl(place)).toBe("https://www.opentable.com/s?term=Cafe+Luna");
  });

  it("prefers saved Google Maps urls and conditionally includes provider links", () => {
    expect(getHangoutProviderLinks({
      location: "Cafe Luna",
      googleMapsUrl: "https://maps.google.com/?cid=123",
      yelpUrl: "https://www.yelp.com/biz/cafe-luna",
    })).toEqual([
      { label: "Open in Apple Maps", href: "http://maps.apple.com/?q=Cafe+Luna", provider: "apple-maps" },
      { label: "Open in Google Maps", href: "https://maps.google.com/?cid=123", provider: "google-maps" },
      { label: "View on Yelp", href: "https://www.yelp.com/biz/cafe-luna", provider: "yelp" },
    ]);
  });
});
