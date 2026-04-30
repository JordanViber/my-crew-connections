import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyConnectionInvite } from "@/lib/connection-invites";
import { notifyGroupInvite } from "@/lib/group-invites";

const {
  findAuthUserByEmailMock,
  sendConnectionInviteEmailMock,
  sendGroupInviteEmailMock,
  sendPushToUserMock,
} = vi.hoisted(() => ({
  findAuthUserByEmailMock: vi.fn(),
  sendConnectionInviteEmailMock: vi.fn(),
  sendGroupInviteEmailMock: vi.fn(),
  sendPushToUserMock: vi.fn(),
}));

vi.mock("@/lib/auth-users", () => ({
  findAuthUserByEmail: findAuthUserByEmailMock,
}));

vi.mock("@/lib/invite-email", () => ({
  sendConnectionInviteEmail: sendConnectionInviteEmailMock,
  sendGroupInviteEmail: sendGroupInviteEmailMock,
}));

vi.mock("@/lib/push", () => ({
  sendPushToUser: sendPushToUserMock,
}));

function createSupabaseStub() {
  const update = vi.fn((payload: Record<string, unknown>) => ({
    eq: vi.fn().mockResolvedValue({ error: null, payload }),
  }));
  const from = vi.fn(() => ({ update }));

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    update,
  };
}

describe("invite notification delivery", () => {
  beforeEach(() => {
    findAuthUserByEmailMock.mockReset();
    sendConnectionInviteEmailMock.mockReset();
    sendGroupInviteEmailMock.mockReset();
    sendPushToUserMock.mockReset();
  });

  it("suppresses connection invite email after a successful push delivery", async () => {
    const supabase = createSupabaseStub();
    findAuthUserByEmailMock.mockResolvedValue({ id: "user-1" });
    sendPushToUserMock.mockResolvedValue({ sent: 1 });

    const result = await notifyConnectionInvite(
      supabase.client,
      "person@example.com",
      "invite-token",
      "Chris",
      "Jordan",
    );

    expect(sendPushToUserMock).toHaveBeenCalledWith(
      supabase.client,
      "user-1",
      expect.objectContaining({
        title: "New connection invite",
        url: "/dashboard",
      }),
    );
    expect(sendConnectionInviteEmailMock).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("connection_invites");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_delivery_status: "suppressed",
        email_provider: null,
        email_sent_at: null,
      }),
    );
    expect(result).toMatchObject({
      delivery: "push",
      pushSent: true,
      emailSent: false,
      emailStatus: "suppressed",
    });
  });

  it("falls back to connection invite email when push does not land", async () => {
    const supabase = createSupabaseStub();
    findAuthUserByEmailMock.mockResolvedValue({ id: "user-1" });
    sendPushToUserMock.mockResolvedValue({ sent: 0 });
    sendConnectionInviteEmailMock.mockResolvedValue({
      provider: "resend",
      status: "sent",
      sent: true,
      messageId: "email-1",
    });

    const result = await notifyConnectionInvite(
      supabase.client,
      "person@example.com",
      "invite-token",
      "Chris",
      "Jordan",
    );

    expect(sendConnectionInviteEmailMock).toHaveBeenCalledWith({
      to: "person@example.com",
      token: "invite-token",
      connectionName: "Chris",
      inviterName: "Jordan",
    });
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_delivery_status: "sent",
        email_provider: "resend",
        email_message_id: "email-1",
      }),
    );
    expect(result).toMatchObject({
      delivery: "email",
      pushSent: false,
      emailSent: true,
      emailStatus: "sent",
      emailMessageId: "email-1",
    });
  });

  it("suppresses group invite email after a successful push delivery", async () => {
    const supabase = createSupabaseStub();
    findAuthUserByEmailMock.mockResolvedValue({ id: "user-2" });
    sendPushToUserMock.mockResolvedValue({ sent: 2 });

    const result = await notifyGroupInvite(
      supabase.client,
      "crew@example.com",
      "group-token",
      "Friday Crew",
      "Alex",
      "Jordan",
    );

    expect(sendPushToUserMock).toHaveBeenCalledWith(
      supabase.client,
      "user-2",
      expect.objectContaining({
        title: "New group invite",
        url: "/dashboard",
      }),
    );
    expect(sendGroupInviteEmailMock).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("group_invites");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_delivery_status: "suppressed",
        email_provider: null,
      }),
    );
    expect(result).toMatchObject({
      delivery: "push",
      pushSent: true,
      emailSent: false,
      emailStatus: "suppressed",
    });
  });
});