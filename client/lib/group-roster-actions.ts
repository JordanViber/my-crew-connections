import { z } from "zod";
import { groupMemberSchema, type QuickGroupConnectionInput } from "@/lib/validations";

type GroupMemberActionInput = Readonly<{
  groupId: string;
  connectionIds: string[];
  quickConnections: QuickGroupConnectionInput[];
}>;

const groupMemberActionGroupIdSchema = z.object({
  groupId: z.uuid(),
});

export function parseGroupMemberActionPayload(input: GroupMemberActionInput) {
  if (input.connectionIds.length === 0 && input.quickConnections.length === 0) {
    return {
      status: "empty" as const,
      groupId: groupMemberActionGroupIdSchema.parse({ groupId: input.groupId }).groupId,
    };
  }

  return {
    status: "valid" as const,
    payload: groupMemberSchema.parse(input),
  };
}

export function findMissingSelectedConnectionIds(
  selectedConnectionIds: string[],
  loadedConnections: ReadonlyArray<{ id: string }>,
) {
  const loadedIds = new Set(loadedConnections.map((connection) => connection.id));

  return [...new Set(selectedConnectionIds)].filter((connectionId) => !loadedIds.has(connectionId));
}
