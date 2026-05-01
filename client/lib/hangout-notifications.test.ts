import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyHangoutProposalParticipant } from "@/lib/hangout-notifications";

const {
  getAuthUserByIdMock,
  sendHangoutProposalEmailMock,
  sendPushToUserMock,
} = vi.hoisted(() => ({
  getAuthUserByIdMock: vi.fn(),
  sendHangoutProposalEmailMock: vi.fn(),
  sendPushToUserMock: vi.fn(),
}));

vi.mock("@/lib/auth-users", () => ({
  getAuthUserById: getAuthUserByIdMock,
}));

vi.mock("@/lib/hangout-email", () => ({
  sendHangoutProposalEmail: sendHangoutProposalEmailMock,
}));

vi.mock("@/lib/push", () => ({
  sendPushToUser: sendPushToUserMock,
}));

function createSupabaseStub() {
  return { from: vi.fn() } as unknown as SupabaseClient;
}

describe("hangout proposal notifications", () => {
  beforeEach(() => {
    getAuthUserByIdMock.mockReset();
    sendHangoutProposalEmailMock.mockReset();
    sendPushToUserMock.mockReset();
  });

  it("suppresses email fallback after a successful push delivery", async () => {
    const supabase = createSupabaseStub();
    getAuthUserByIdMock.mockResolvedValue({ id: "user-1", email: "member@example.com" });
    sendPushToUserMock.mockResolvedValue({ sent: 1 });

    const result = await notifyHangoutProposalParticipant(
      supabase,
      "user-1",
      "group-1",
      "Friday Crew",
      "hangout-1",
      "Dinner with Friday Crew",
      "Friday at 7:00 PM",
      "Patio",
      "Jordan",
    );

    expect(sendPushToUserMock).toHaveBeenCalledWith(
      supabase,
      "user-1",
      expect.objectContaining({
        title: "New hangout proposal",
        url: "/groups/group-1",
        tag: "hangout-proposal-hangout-1",
      }),
    );
    expect(sendHangoutProposalEmailMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      delivery: "push",
      pushSent: true,
      emailSent: false,
      emailStatus: "suppressed",
    });
  });

  it("falls back to email when push does not land", async () => {
    const supabase = createSupabaseStub();
    getAuthUserByIdMock.mockResolvedValue({ id: "user-2", email: "member@example.com" });
    sendPushToUserMock.mockResolvedValue({ sent: 0 });
    sendHangoutProposalEmailMock.mockResolvedValue({
      provider: "resend",
      status: "sent",
      sent: true,
      messageId: "email-1",
    });

    const result = await notifyHangoutProposalParticipant(
      supabase,
      "user-2",
      "group-1",
      "Friday Crew",
      "hangout-1",
      "Dinner with Friday Crew",
      "Friday at 7:00 PM",
      "Patio",
      "Jordan",
    );

    expect(sendHangoutProposalEmailMock).toHaveBeenCalledWith({
      to: "member@example.com",
      groupId: "group-1",
      groupName: "Friday Crew",
      hangoutTitle: "Dinner with Friday Crew",
      whenLabel: "Friday at 7:00 PM",
      location: "Patio",
      inviterName: "Jordan",
    });
    expect(result).toMatchObject({
      delivery: "email",
      pushSent: false,
      emailSent: true,
      emailStatus: "sent",
      emailMessageId: "email-1",
    });
  });
});