import { fireEvent, render, screen } from "@testing-library/react";
import { GroupRosterBuilder } from "@/components/group-roster-builder";
import type { RelationshipSummary } from "@/lib/mvp-data";

const connections: RelationshipSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    targetType: "connection",
    title: "Chloe",
    subtitle: "Movie nights",
    cadenceLabel: "Every 3 weeks",
    cadenceValue: 3,
    cadenceUnit: "weeks",
    reminderLeadDays: 5,
    health: {
      state: "on-track",
      anchorAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-04-22T00:00:00.000Z"),
      daysUntilDue: 15,
      isFirstTouchpoint: true,
      label: "No touchpoint yet",
      summary: "Next target in 15 days",
    },
    notes: "Dinner crew",
    tags: [],
    lastTouchpointLabel: "No touchpoints yet",
    touchpointCount: 0,
    memberNames: [],
    memberConnectionIds: [],
    pendingMembers: [],
    pendingMemberConnectionIds: [],
    pendingMemberCount: 0,
    nextHangoutLabel: undefined,
    linkState: "unlinked",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    targetType: "connection",
    title: "Jordan",
    subtitle: "Run club",
    cadenceLabel: "Every 2 weeks",
    cadenceValue: 2,
    cadenceUnit: "weeks",
    reminderLeadDays: 3,
    health: {
      state: "due-soon",
      anchorAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-04-14T00:00:00.000Z"),
      daysUntilDue: 1,
      isFirstTouchpoint: false,
      label: "Due soon",
      summary: "Needs attention in 1 day",
    },
    notes: "Saturday runs",
    tags: [],
    lastTouchpointLabel: "Apr 1, 2026",
    touchpointCount: 1,
    memberNames: [],
    memberConnectionIds: [],
    pendingMembers: [],
    pendingMemberConnectionIds: [],
    pendingMemberCount: 0,
    nextHangoutLabel: undefined,
    linkState: "pending",
    pendingInviteEmail: "jordan@example.com",
  },
];

describe("GroupRosterBuilder", () => {
  it("adds and removes existing people from the roster", () => {
    render(<GroupRosterBuilder connections={connections} minPeople={2} mode="create" />);

    fireEvent.change(screen.getByRole("textbox", { name: /search existing people/i }), {
      target: { value: "movie" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add chloe/i }));

    expect(screen.getByText("Chloe")).toBeVisible();
    expect(document.querySelector('input[type="hidden"][name="connectionIds"]')).toHaveAttribute("value", connections[0].id);

    fireEvent.click(screen.getByRole("button", { name: /remove chloe/i }));
    expect(document.querySelector('input[type="hidden"][name="connectionIds"]')).not.toBeInTheDocument();
  });

  it("serializes multiple new people with repeated field names", () => {
    render(<GroupRosterBuilder connections={[]} minPeople={2} mode="create" />);

    const nameInputs = screen.getAllByRole("textbox", { name: /new person name/i });
    const emailInputs = screen.getAllByRole("textbox", { name: /new person email/i });

    fireEvent.change(nameInputs[0], { target: { value: "Alex" } });
    fireEvent.change(emailInputs[0], { target: { value: "alex@example.com" } });
    fireEvent.change(nameInputs[1], { target: { value: "Jordan" } });

    const names = Array.from(document.querySelectorAll('input[name="quickConnectionNames"]')).map(
      (input) => (input as HTMLInputElement).value,
    );
    const emails = Array.from(document.querySelectorAll('input[name="quickConnectionEmails"]')).map(
      (input) => (input as HTMLInputElement).value,
    );

    expect(names).toEqual(["Alex", "Jordan"]);
    expect(emails).toEqual(["alex@example.com", ""]);
  });
});
