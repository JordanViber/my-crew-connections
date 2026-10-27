import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClaimConnectionForm } from "@/components/claim-connection-form";

const { submitClaimConnectionInvite } = vi.hoisted(() => ({
  submitClaimConnectionInvite: vi.fn(),
}));

vi.mock("@/app/actions", () => ({
  submitClaimConnectionInvite,
}));

describe("ClaimConnectionForm", () => {
  beforeEach(() => {
    submitClaimConnectionInvite.mockReset();
  });

  it("shows invite claimed immediately and keeps the button disabled while the claim is pending", async () => {
    let finish: (result: { ok: true; href: string }) => void = () => undefined;
    submitClaimConnectionInvite.mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));

    render(<ClaimConnectionForm description="Claim it." token="invite-token" />);
    const pendingClick = userEvent.click(screen.getByRole("button", { name: "Claim connection" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Claiming..." })).toBeDisabled();
    });
    await userEvent.click(screen.getByRole("button", { name: "Claiming..." }));
    expect(submitClaimConnectionInvite).toHaveBeenCalledTimes(1);

    finish({ ok: true, href: "/invite/invite-token?claimed=1" });
    await pendingClick;

    expect(await screen.findByRole("heading", { name: "Invite claimed" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Claim connection" })).not.toBeInTheDocument();
  });

  it("shows the claim error and leaves the button available", async () => {
    submitClaimConnectionInvite.mockResolvedValue({
      ok: false,
      message: "You've already used your free person slot.",
    });

    render(<ClaimConnectionForm description="Claim it." token="invite-token" />);
    await userEvent.click(screen.getByRole("button", { name: "Claim connection" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You've already used your free person slot.");
    expect(screen.getByRole("button", { name: "Claim connection" })).toBeEnabled();
  });
});
