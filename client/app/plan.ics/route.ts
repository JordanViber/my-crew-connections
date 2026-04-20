import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildIcsEvent, sanitizeFileName } from "@/lib/ics";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const savedHangoutSchema = z.object({
  hangoutId: z.uuid(),
});

const planningSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().default(""),
  timezone: z.string().trim().min(1).max(100),
  location: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  targetType: z.enum(["connection", "group"]).optional(),
  targetLabel: z.string().trim().max(120).optional().default(""),
});

function toLocalDateTimeValue(value: string, timezone: string) {
  return new Date(value)
    .toLocaleString("sv-SE", {
      timeZone: timezone,
      hour12: false,
    })
    .replace(" ", "T")
    .slice(0, 16);
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const savedHangout = savedHangoutSchema.safeParse(params);

  if (savedHangout.success) {
    const authSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized.", { status: 401 });
    }

    const supabase = createServerAdminSupabaseClient();
    const { data, error } = await supabase
      .from("hangouts")
      .select("id, title, starts_at, ends_at, timezone, location, notes")
      .eq("id", savedHangout.data.hangoutId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error) {
      return new NextResponse("Failed to load saved plan.", { status: 500 });
    }

    if (!data) {
      return new NextResponse("Saved plan not found.", { status: 404 });
    }

    const ics = buildIcsEvent({
      title: data.title,
      startsAtLocal: toLocalDateTimeValue(data.starts_at, data.timezone),
      endsAtLocal: data.ends_at ? toLocalDateTimeValue(data.ends_at, data.timezone) : undefined,
      timezone: data.timezone,
      location: data.location || undefined,
      description: data.notes || undefined,
    });

    const fileName = `${sanitizeFileName(data.title)}.ics`;

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const parsed = planningSchema.safeParse(params);

  if (!parsed.success) {
    return new NextResponse("Invalid planning request.", { status: 400 });
  }

  const payload = parsed.data;
  const descriptionParts = [
    payload.targetLabel ? `Planned from ${payload.targetType ?? "relationship"}: ${payload.targetLabel}` : "",
    payload.description,
  ].filter(Boolean);

  const ics = buildIcsEvent({
    title: payload.title,
    startsAtLocal: payload.startsAt,
    endsAtLocal: payload.endsAt || undefined,
    timezone: payload.timezone,
    location: payload.location || undefined,
    description: descriptionParts.join("\n\n") || undefined,
  });

  const fileName = `${sanitizeFileName(payload.title)}.ics`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
