import { render, screen } from "@testing-library/react";
import { HangoutProviderLinks } from "@/components/hangout-provider-links";

describe("HangoutProviderLinks", () => {
  it("renders generated map links from location-only data", () => {
    render(<HangoutProviderLinks hangout={{ location: "Cafe Luna" }} />);

    expect(screen.getByRole("link", { name: /open in apple maps/i })).toHaveAttribute(
      "href",
      "http://maps.apple.com/?q=Cafe+Luna",
    );
    expect(screen.getByRole("link", { name: /open in google maps/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Cafe+Luna",
    );
  });

  it("renders Yelp and OpenTable only when urls are saved", () => {
    render(
      <HangoutProviderLinks
        hangout={{
          location: "Cafe Luna",
          yelpUrl: "https://www.yelp.com/biz/cafe-luna",
          opentableUrl: "https://www.opentable.com/r/cafe-luna",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /view on yelp/i })).toHaveAttribute(
      "href",
      "https://www.yelp.com/biz/cafe-luna",
    );
    expect(screen.getByRole("link", { name: /reserve on opentable/i })).toHaveAttribute(
      "href",
      "https://www.opentable.com/r/cafe-luna",
    );
  });
});
