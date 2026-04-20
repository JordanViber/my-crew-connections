import { fireEvent, render, screen } from "@testing-library/react";
import { GroupMemberPicker } from "@/components/group-member-picker";
import type { RelationshipSummary } from "@/lib/mvp-data";

const connections: RelationshipSummary[] = [
  {
    id: "1",
    targetType: "connection",
    title: "Chloe",
    subtitle: "Close friend",
    notes: "Movie nights",
    cadenceLabel: "Every 3 days",
    lastTouchpointLabel: "No touchpoints yet",
    memberNames: [],
    memberConnectionIds: [],
    nextHangoutLabel: null,
    linkState: "linked",
    pendingInviteEmail: null,
    health: {
      state: "on-track",
      anchorAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-04-04T00:00:00.000Z"),
      daysUntilDue: 3,
      isFirstTouchpoint: true,
      label: "No touchpoint yet",
      summary: "Next target in 3 days",
    },
  },
  {
    id: "2",
    targetType: "connection",
    title: "Jordan",
    subtitle: "Dinner crew organizer",
    notes: "Monthly dinner",
    cadenceLabel: "Every 2 weeks",
    lastTouchpointLabel: "Apr 1, 2026",
    memberNames: [],
    memberConnectionIds: [],
    nextHangoutLabel: null,
    linkState: "pending",
    pendingInviteEmail: "jordankdog44@yahoo.com",
    health: {
      state: "due-soon",
      anchorAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-04-14T00:00:00.000Z"),
      daysUntilDue: 1,
      isFirstTouchpoint: false,
      label: "Due soon",
      summary: "Needs attention in 1 day",
    },
  },
];

describe("GroupMemberPicker", () => {
  it("filters the existing people list as the user types", () => {
    render(<GroupMemberPicker connections={connections} />);

    expect(screen.getByText("Chloe")).toBeVisible();
    expect(screen.getByText("Jordan")).toBeVisible();

    fireEvent.change(screen.getByRole("textbox", { name: /search existing people/i }), {
      target: { value: "movie" },
    });

    expect(screen.getByText("Chloe")).toBeVisible();
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
  });
});
