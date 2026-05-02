import { z } from "zod";
import { DEFAULT_COUNTRY } from "@/lib/account-fields";

export const cadenceUnitSchema = z.enum(["days", "weeks", "months"]);
export const targetTypeSchema = z.enum(["connection", "group"]);
const uuidSchema = z.uuid();

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalPhotoAlbumUrlSchema = z.string().trim().max(500).optional().default("").refine(
  (value) => !value || isValidHttpUrl(value),
  { message: "Enter a valid http or https link." },
);
const optionalPhotoAlbumLabelSchema = z.string().trim().max(120).optional().default("");
export const hangoutResponseStatusSchema = z.enum(["pending", "accepted", "declined"]);

export const magicLinkSchema = z.object({
  email: z.email(),
});

export const inviteEmailSchema = z.object({
  email: z.email(),
});

const nameFieldSchema = z.string().trim().min(1).max(50);
const optionalProfileFieldSchema = z.string().trim().max(120).optional().default("");

const baseCadenceSchema = z.object({
  cadenceValue: z.coerce.number().int().min(1).max(90),
  cadenceUnit: cadenceUnitSchema,
  reminderLeadDays: z.coerce.number().int().min(0).max(30),
});

export const connectionSchema = baseCadenceSchema.extend({
  displayName: z.string().trim().max(80).optional().default(""),
  contactEmail: z.email().optional().or(z.literal("")).default(""),
  tags: z.string().trim().max(180).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  preferredActivities: z.string().trim().max(200).optional().default(""),
}).superRefine((value, context) => {
  if (!value.contactEmail && !value.displayName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a name when no contact email is saved.",
      path: ["displayName"],
    });
  }
});

export const updateConnectionSchema = connectionSchema.extend({
  connectionId: uuidSchema,
});

export const groupSchema = baseCadenceSchema.extend({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().default(""),
  connectionIds: z.array(uuidSchema).default([]),
  quickConnectionName: z.string().trim().max(80).optional().default(""),
  quickConnectionEmail: z.email().optional().or(z.literal("")).default(""),
});

export const updateGroupSchema = groupSchema.extend({
  groupId: uuidSchema,
});

export const groupMemberSchema = z.object({
  groupId: uuidSchema,
  connectionIds: z.array(uuidSchema).min(1),
});

export const hangoutSchema = z.object({
  targetType: targetTypeSchema,
  targetId: uuidSchema,
  title: z.string().trim().min(1).max(120),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().default(""),
  timezone: z.string().trim().min(1).max(100),
  location: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  photoAlbumLabel: optionalPhotoAlbumLabelSchema,
  photoAlbumUrl: optionalPhotoAlbumUrlSchema,
  shareWithLinkedUser: z.enum(["", "true"]).optional().default(""),
});

export const hangoutIdSchema = z.object({
  hangoutId: uuidSchema,
});

export const hangoutResponseSchema = hangoutIdSchema.extend({
  responseStatus: hangoutResponseStatusSchema,
  downloadCalendar: z.enum(["", "true"]).optional().default(""),
});

export const touchpointSchema = z.object({
  targetType: targetTypeSchema,
  targetId: uuidSchema,
  touchpointType: z.enum(["check-in", "message", "call", "hangout"]),
  occurredAt: z.string().min(1),
  note: z.string().trim().max(500).optional().default(""),
  activityLabel: z.string().trim().max(120).optional().default(""),
  locationLabel: z.string().trim().max(120).optional().default(""),
  photoAlbumLabel: optionalPhotoAlbumLabelSchema,
  photoAlbumUrl: optionalPhotoAlbumUrlSchema,
});

export const touchpointUpdateSchema = z.object({
  touchpointId: uuidSchema,
  touchpointType: z.enum(["check-in", "message", "call", "hangout"]),
  occurredAt: z.string().min(1),
  note: z.string().trim().max(500).optional().default(""),
  activityLabel: z.string().trim().max(120).optional().default(""),
  locationLabel: z.string().trim().max(120).optional().default(""),
  photoAlbumLabel: optionalPhotoAlbumLabelSchema,
  photoAlbumUrl: optionalPhotoAlbumUrlSchema,
});

export const accountProfileSchema = z.object({
  firstName: nameFieldSchema,
  lastName: nameFieldSchema,
  phoneNumber: z.string().trim().max(30).optional().default(""),
  addressLine1: optionalProfileFieldSchema,
  addressLine2: optionalProfileFieldSchema,
  city: z.string().trim().max(80).optional().default(""),
  region: z.string().trim().max(80).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  country: z.string().trim().max(80).optional().default(DEFAULT_COUNTRY),
});

export const accountRegistrationSchema = accountProfileSchema.extend({
  email: z.email(),
  password: z.string().min(8).max(120),
});

export const accountEmailSchema = z.object({
  email: z.email(),
});

export const accountPasswordSchema = z.object({
  password: z.string().min(8).max(120),
  confirmPassword: z.string().min(8).max(120),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords must match.",
  path: ["confirmPassword"],
});

export const billingIntervalSchema = z.enum(["monthly", "yearly"]);

export const appFeedbackSchema = z.object({
  category: z.enum(["general", "bug", "billing", "idea"]),
  message: z.string().trim().min(1).max(2000),
  pagePath: z.string().trim().max(300).optional().default(""),
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
