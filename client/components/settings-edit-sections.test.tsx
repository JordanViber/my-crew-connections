import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecuritySettingsEditor } from "@/components/settings-edit-sections";
import { passkeyDisabledMessage } from "@/lib/passkey-errors";

const passkeyState = vi.hoisted(() => ({ enabled: false }));
const { listPasskeys, registerPasskey, deletePasskey } = vi.hoisted(() => ({
  listPasskeys: vi.fn(),
  registerPasskey: vi.fn(),
  deletePasskey: vi.fn(),
}));

vi.mock("@/lib/auth-features", () => ({
  appleAuthEnabled: false,
  phoneAuthEnabled: false,
  get passkeySignInEnabled() {
    return passkeyState.enabled;
  },
}));

vi.mock("@/app/actions", () => ({
  updateAccountEmailAction: vi.fn(),
  updateAccountPasswordAction: vi.fn(),
  updateProfileAction: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      registerPasskey,
      passkey: {
        list: listPasskeys,
        delete: deletePasskey,
      },
    },
  }),
}));

describe("passkey settings", () => {
  beforeEach(() => {
    passkeyState.enabled = false;
    listPasskeys.mockReset();
    registerPasskey.mockReset();
    deletePasskey.mockReset();
    listPasskeys.mockResolvedValue({ data: [], error: null });
    vi.stubGlobal("PublicKeyCredential", function PublicKeyCredential() {
      return undefined;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderSettings() {
    render(
      <SecuritySettingsEditor
        authPhoneConfirmedAt={null}
        authPhoneNumber={null}
        email="person@example.com"
        profilePhoneNumber={null}
      />,
    );
  }

  it("hides passkey controls until the provider works end to end", () => {
    renderSettings();

    expect(screen.queryByRole("button", { name: "Manage passkeys" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable passkey" })).not.toBeInTheDocument();
    expect(listPasskeys).not.toHaveBeenCalled();
  });

  it("registers through the passkey provider and explains when that provider is disabled", async () => {
    passkeyState.enabled = true;
    registerPasskey.mockResolvedValue({
      data: null,
      error: { code: "passkey_disabled", message: "Passkey sign-in is disabled" },
    });

    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: "Manage passkeys" }));
    await userEvent.click(await screen.findByRole("button", { name: "Enable passkey" }));

    expect(await screen.findByText(passkeyDisabledMessage)).toBeVisible();
    expect(registerPasskey).toHaveBeenCalledWith();
    expect(listPasskeys).toHaveBeenCalled();
  });

  it("surfaces other passkey error codes", async () => {
    passkeyState.enabled = true;
    registerPasskey.mockResolvedValue({
      data: null,
      error: { code: "webauthn_credential_exists", message: "This authenticator has already been registered" },
    });

    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: "Manage passkeys" }));
    await userEvent.click(await screen.findByRole("button", { name: "Enable passkey" }));

    expect(await screen.findByText("webauthn_credential_exists: This authenticator has already been registered")).toBeVisible();
  });

  it("deletes saved passkeys by id", async () => {
    passkeyState.enabled = true;
    listPasskeys.mockResolvedValue({
      data: [{ id: "pk_1", friendly_name: "iCloud Keychain", created_at: "2026-10-27T00:00:00.000Z" }],
      error: null,
    });
    deletePasskey.mockResolvedValue({ data: null, error: null });

    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: "Manage passkeys" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove passkeys" }));

    expect(deletePasskey).toHaveBeenCalledWith({ passkeyId: "pk_1" });
  });
});
