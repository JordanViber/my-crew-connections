import { render, screen } from "@testing-library/react";
import { HangoutList } from "@/components/hangout-list";
import type { HangoutSummary } from "@/lib/mvp-data";

function buildHangout(overrides: Partial<HangoutSummary> = {}): HangoutSummary {
  return {
    id: "hangout-1",
    targetType: "connection",
    targetId: "conn-1",
    targetLabel: "Jordan",
    title: "Coffee catch-up",
    startsAt: "2026-05-10T17:00:00.000Z",
    timezone: "America/New_York",
    status: "planned",
    proposalState: "pending",
    responseCounts: {
      accepted: 0,
      declined: 0,
      pending: 1,
      total: 1,
    },
    viewerRole: "participant",
    viewerResponse: "pending",
    canRespond: true,
    canManage: false,
    canExportCalendar: false,
    windowLabel: "May 10",
    bucketLabel: "Soon",
    ...overrides,
  };
}

describe("HangoutList", () => {
  const noop = async () => {};

  it("shows join/pass actions for shared connection plans", () => {
    render(
      <HangoutList
        hangouts={[buildHangout()]}
        emptyCopy="None"
        confirmAction={noop}
        completeAction={noop}
        cancelAction={noop}
        respondAction={noop}
        redirectTo="/connections/conn-1"
      />,
    );

    expect(screen.getByRole("button", { name: "Join plan" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Pass for now" })).toBeVisible();
    expect(screen.getByText("Shared plan response: pending")).toBeVisible();
  });

  it("maps participant declined response copy to passed for now", () => {
    render(
      <HangoutList
        hangouts={[buildHangout({ viewerResponse: "declined", canRespond: false, proposalState: "declined", responseCounts: { accepted: 0, declined: 1, pending: 0, total: 1 } })]}
        emptyCopy="None"
        confirmAction={noop}
        completeAction={noop}
        cancelAction={noop}
        respondAction={noop}
        redirectTo="/connections/conn-1"
      />,
    );

    expect(screen.getByText("Your response: passed for now")).toBeVisible();
    expect(screen.getByText("Shared plan response: passed for now")).toBeVisible();
  });
});
