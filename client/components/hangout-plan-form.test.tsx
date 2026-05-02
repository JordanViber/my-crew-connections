import { render, screen } from "@testing-library/react";
import { HangoutPlanForm } from "@/components/hangout-plan-form";

describe("HangoutPlanForm", () => {
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
});
