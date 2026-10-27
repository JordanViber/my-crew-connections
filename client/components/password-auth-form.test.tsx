import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordAuthForm } from "@/components/password-auth-form";

const { replace, refresh } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("PasswordAuthForm", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
  });

  it("continues after a successful password sign-in without a passkey challenge", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    render(<PasswordAuthForm nextPath="/dashboard" stackAvailable />);
    await userEvent.type(screen.getByLabelText("Email or phone"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret-pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(fetch).toHaveBeenCalledWith("/auth/password", expect.objectContaining({ method: "POST" }));
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText(/passkey/i)).not.toBeInTheDocument();
  });
});
