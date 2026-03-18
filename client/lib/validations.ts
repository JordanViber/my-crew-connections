import { z } from "zod";

export const cadenceUnitSchema = z.enum(["days", "weeks", "months"]);
export const targetTypeSchema = z.enum(["connection", "group"]);
const uuidSchema = z.uuid();

export const magicLinkSchema = z.object({
  email: z.email(),
});

const baseCadenceSchema = z.object({
  cadenceValue: z.coerce.number().int().min(1).max(90),
  cadenceUnit: cadenceUnitSchema,
  reminderLeadDays: z.coerce.number().int().min(0).max(30),
});

export const connectionSchema = baseCadenceSchema.extend({
  displayName: z.string().trim().min(1).max(80),
  tags: z.string().trim().max(180).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  preferredActivities: z.string().trim().max(200).optional().default(""),
});

export const updateConnectionSchema = connectionSchema.extend({
  connectionId: uuidSchema,
});

export const groupSchema = baseCadenceSchema.extend({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().default(""),
  connectionIds: z.array(uuidSchema).default([]),
});

export const updateGroupSchema = groupSchema.extend({
  groupId: uuidSchema,
});

export const groupMemberSchema = z.object({
  groupId: uuidSchema,
  connectionIds: z.array(uuidSchema).min(1),
});

export const touchpointSchema = z.object({
  targetType: targetTypeSchema,
  targetId: uuidSchema,
  touchpointType: z.enum(["check-in", "message", "call", "hangout"]),
  occurredAt: z.string().min(1),
  note: z.string().trim().max(500).optional().default(""),
  activityLabel: z.string().trim().max(120).optional().default(""),
  locationLabel: z.string().trim().max(120).optional().default(""),
});

export function parseCommaSeparatedList(input: string) {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

export function parseTargetReference(targetReference: string) {
  const [targetType, targetId] = targetReference.split(":");

  return touchpointSchema.pick({ targetType: true, targetId: true }).parse({
    targetType,
    targetId,
  });
}