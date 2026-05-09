import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import { HangoutPlanForm } from "@/components/hangout-plan-form";

describe("HangoutPlanForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the share toggle for linked connection plans when enabled", () => {
    render(
      <HangoutPlanForm
        action={async () => {}}
        subjectLabel="Jordan"
        targetType="connection"
        targetId="conn-1"
        redirectTo="/connections/conn-1"
        allowShareWithLinkedUser
        shareWithLinkedUserLabel="Jordan"
      />,
    );

    expect(screen.getByRole("checkbox", { name: /share this plan with jordan now/i })).toBeVisible();
    expect(screen.getByText(/join plan or pass for now/i)).toBeVisible();
  });

  it("does not show the share toggle for group plans", () => {
    render(
      <HangoutPlanForm
        action={async () => {}}
        subjectLabel="Dinner Crew"
        targetType="group"
        targetId="group-1"
        redirectTo="/groups/group-1"
        allowShareWithLinkedUser
      />,
    );

    expect(screen.queryByRole("checkbox", { name: /share this plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send proposal/i })).toBeVisible();
  });

  it("serializes place provider fields", () => {
    render(
      <HangoutPlanForm
        action={async () => {}}
        subjectLabel="Dinner Crew"
        targetType="group"
        targetId="group-1"
        redirectTo="/groups/group-1"
      />,
    );

    expect(screen.getByRole("textbox", { name: /place name/i })).toHaveAttribute("name", "placeName");
    expect(screen.getByRole("textbox", { name: /place address/i })).toHaveAttribute("name", "placeAddress");
    expect(screen.getByRole("textbox", { name: /google maps link/i })).toHaveAttribute("name", "googleMapsUrl");
    expect(screen.getByRole("textbox", { name: /yelp link/i })).toHaveAttribute("name", "yelpUrl");
    expect(screen.getByRole("textbox", { name: /opentable link/i })).toHaveAttribute("name", "opentableUrl");
  });

  it("shows quick app links from the entered place details", async () => {
    const user = userEvent.setup();

    render(
      <HangoutPlanForm
        action={async () => {}}
        subjectLabel="Dinner Crew"
        targetType="group"
        targetId="group-1"
        redirectTo="/groups/group-1"
      />,
    );

    await user.type(screen.getByRole("textbox", { name: /place name/i }), "Cafe Luna");
    await user.type(screen.getByRole("textbox", { name: /place address/i }), "123 Main St, Austin, TX");

    expect(screen.getByRole("link", { name: /open apple maps/i })).toHaveAttribute(
      "href",
      "http://maps.apple.com/?q=Cafe+Luna+123+Main+St%2C+Austin%2C+TX",
    );
    expect(screen.getByRole("link", { name: /open google maps/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Cafe+Luna+123+Main+St%2C+Austin%2C+TX",
    );
    expect(screen.getByRole("link", { name: /find on yelp/i })).toHaveAttribute(
      "href",
      "https://www.yelp.com/search?find_desc=Cafe+Luna&find_loc=123+Main+St%2C+Austin%2C+TX",
    );
    expect(screen.getByRole("link", { name: /find on opentable/i })).toHaveAttribute(
      "href",
      "https://www.opentable.com/s?term=Cafe+Luna",
    );
  });

  it("keeps the photo app action out of the input label", () => {
    render(
      <HangoutPlanForm
        action={async () => {}}
        subjectLabel="Dinner Crew"
        targetType="group"
        targetId="group-1"
        redirectTo="/groups/group-1"
      />,
    );

    expect(screen.getByRole("textbox", { name: /^photo album link$/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /open google photos/i })).toHaveAttribute(
      "href",
      "https://photos.google.com/albums",
    );
  });

  it("uses address suggestions for the place address field", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            label: "123 Main St, Austin, TX 78701, United States",
            addressLine1: "123 Main St",
            city: "Austin",
            region: "Texas",
            postalCode: "78701",
            country: "United States",
          },
        ],
      }),
    } as Response);

    render(
      <HangoutPlanForm
        action={async () => {}}
        subjectLabel="Dinner Crew"
        targetType="group"
        targetId="group-1"
        redirectTo="/groups/group-1"
      />,
    );

    await user.type(screen.getByRole("textbox", { name: /place address/i }), "123 Main");
    const suggestion = await screen.findByRole("button", { name: /123 main st/i });
    await user.click(suggestion);

    expect(screen.getByRole("textbox", { name: /place address/i })).toHaveValue(
      "123 Main St, Austin, TX 78701, United States",
    );
  });
});
