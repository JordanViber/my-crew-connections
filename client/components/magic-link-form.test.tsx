import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MagicLinkForm } from "@/components/magic-link-form";

const {
  refreshMock,
  replaceMock,
  signInWithOtpMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  replaceMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    replace: replaceMock,
  }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
    },
  }),
}));

describe("MagicLinkForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    replaceMock.mockReset();
    signInWithOtpMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it("requests an email code and reveals the verification input", async () => {
    const user = userEvent.setup();
    signInWithOtpMock.mockResolvedValue({ error: null });

    render(<MagicLinkForm nextPath="/dashboard" stackAvailable />);

    await user.type(screen.getByLabelText("Email"), "you@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith({
        email: "you@example.com",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("/auth/confirm?next=%2Fdashboard"),
          shouldCreateUser: false,
        }),
      });
    });

    expect(screen.getByLabelText("Verification code")).toBeVisible();
    expect(screen.getByText(/A sign-in email is on the way/i)).toBeVisible();
  });

  it("falls back to the magiclink verification type when email verification does not succeed", async () => {
    const user = userEvent.setup();
    signInWithOtpMock.mockResolvedValue({ error: null });
    verifyOtpMock
      .mockResolvedValueOnce({ error: { message: "Invalid token" } })
      .mockResolvedValueOnce({ error: null });

    render(<MagicLinkForm nextPath="/dashboard" stackAvailable />);

    await user.type(screen.getByLabelText("Email"), "you@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    await user.type(await screen.findByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenNthCalledWith(1, {
        email: "you@example.com",
        token: "123456",
        type: "email",
      });
      expect(verifyOtpMock).toHaveBeenNthCalledWith(2, {
        email: "you@example.com",
        token: "123456",
        type: "magiclink",
      });
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("passes an 8-digit sign-in code to verifyOtp unchanged", async () => {
    const user = userEvent.setup();
    signInWithOtpMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });

    render(<MagicLinkForm nextPath="/dashboard" stackAvailable />);

    await user.type(screen.getByLabelText("Email"), "you@example.com");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));

    const codeInput = await screen.findByLabelText("Verification code");
    expect(codeInput).toHaveAttribute("placeholder", "Sign-in code");

    await user.click(codeInput);
    await user.paste("12 34 56 78");
    expect(codeInput).toHaveValue("12345678");

    await user.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledTimes(1);
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: "you@example.com",
        token: "12345678",
        type: "email",
      });
    });
  });
});
