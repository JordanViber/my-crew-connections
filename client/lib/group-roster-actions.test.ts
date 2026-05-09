import {
  findMissingSelectedConnectionIds,
  parseGroupMemberActionPayload,
} from "@/lib/group-roster-actions";

const GROUP_ID = "11111111-1111-4111-8111-111111111111";
const CONNECTION_ONE_ID = "22222222-2222-4222-8222-222222222222";
const CONNECTION_TWO_ID = "33333333-3333-4333-8333-333333333333";

describe("group roster action helpers", () => {
  it("returns an empty result for blank member-management submissions", () => {
    expect(parseGroupMemberActionPayload({
      groupId: GROUP_ID,
      connectionIds: [],
      quickConnections: [],
    })).toEqual({ status: "empty", groupId: GROUP_ID });
  });

  it("parses valid member-management submissions", () => {
    expect(parseGroupMemberActionPayload({
      groupId: GROUP_ID,
      connectionIds: [CONNECTION_ONE_ID],
      quickConnections: [],
    })).toEqual({
      status: "valid",
      payload: {
        groupId: GROUP_ID,
        connectionIds: [CONNECTION_ONE_ID],
        quickConnections: [],
      },
    });
  });

  it("detects selected connection ids that were not loaded as active owner connections", () => {
    expect(findMissingSelectedConnectionIds(
      [CONNECTION_ONE_ID, CONNECTION_TWO_ID],
      [{ id: CONNECTION_ONE_ID }],
    )).toEqual([CONNECTION_TWO_ID]);
  });
});
