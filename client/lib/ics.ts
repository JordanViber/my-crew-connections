export type IcsEventInput = {
  title: string;
  startsAtLocal: string;
  endsAtLocal?: string;
  timezone: string;
  description?: string;
  location?: string;
  uid?: string;
  dtstamp?: string;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function formatLocalDateTimeForIcs(value: string) {
  const [datePart, timePart] = value.split("T");

  if (!datePart || !timePart) {
    throw new Error("Invalid local datetime format.");
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    throw new Error("Invalid local datetime format.");
  }

  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

function formatUtcDateTimeForIcs(value: Date) {
  return [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate()),
  ].join("") + `T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`;
}

export function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "my-crew-connections-plan";
}

export function buildIcsEvent(input: IcsEventInput) {
  const uid = input.uid ?? `${crypto.randomUUID()}@my-crew-connections.local`;
  const dtstamp = input.dtstamp ?? formatUtcDateTimeForIcs(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//My Crew Connections//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DTSTART;TZID=${input.timezone}:${formatLocalDateTimeForIcs(input.startsAtLocal)}`,
  ];

  if (input.endsAtLocal) {
    lines.push(`DTEND;TZID=${input.timezone}:${formatLocalDateTimeForIcs(input.endsAtLocal)}`);
  } else {
    lines.push("DURATION:PT2H");
  }

  if (input.location) {
    lines.push(`LOCATION:${escapeIcsText(input.location)}`);
  }

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
