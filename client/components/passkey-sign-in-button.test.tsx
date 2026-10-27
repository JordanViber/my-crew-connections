import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasskeySignInButton } from "@/components/passkey-sign-in-button";
import { passkeyDisabledMessage } from "@/lib/passkey-errors";

const passkeyState = vi.hoisted(() => ({ enabled: false }));
const { replace, refresh, signInWithPasskey } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInWithPasskey: vi.fn(),
}));

vi.mock("@/lib/auth-features", () => ({
  get passkeySignInEnabled() {
    return passkeyState.enabled;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithPasskey },
  }),
}));

describe("PasskeySignInButton", () => {
  beforeEach(() => {
    passkeyState.enabled = false;
    replace.mockReset();
    refresh.mockReset();
    signInWithPasskey.mockReset();
    vi.stubGlobal("PublicKeyCredential", function PublicKeyCredential() {
      return undefined;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays hidden until passkey sign-in is enabled", () => {
    render(<PasskeySignInButton nextPath="/dashboard" stackAvailable />);

    expect(screen.queryByRole("button", { name: "Sign in with a passkey" })).not.toBeInTheDocument();
  });

  it("signs in with the passkey provider and disables the button while pending", async () => {
    passkeyState.enabled = true;
    let finish: (result: { data: { session: object; user: object }; error: null }) => void = () => undefined;
    signInWithPasskey.mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));

    render(<PasskeySignInButton nextPath="/invite/token" stackAvailable />);
    const pendingClick = userEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Waiting for passkey..." })).toBeDisabled();
    });
    await userEvent.click(screen.getByRole("button", { name: "Waiting for passkey..." }));
    expect(signInWithPasskey).toHaveBeenCalledTimes(1);

    finish({ data: { session: {}, user: {} }, error: null });
    await pendingClick;

    expect(replace).toHaveBeenCalledWith("/invite/token");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a clear message when the passkey provider is disabled", async () => {
    passkeyState.enabled = true;
    signInWithPasskey.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: "passkey_disabled", message: "Passkey sign-in is disabled" },
    });

    render(<PasskeySignInButton nextPath="/dashboard" stackAvailable />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(passkeyDisabledMessage);
    expect(replace).not.toHaveBeenCalled();
  });
});
