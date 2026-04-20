import { buildIcsEvent, escapeIcsText, formatLocalDateTimeForIcs, sanitizeFileName } from "@/lib/ics";

describe("ics helpers", () => {
  it("formats local datetime values for ICS", () => {
    expect(formatLocalDateTimeForIcs("2026-04-19T18:30")).toBe("20260419T183000");
  });

  it("escapes reserved ICS characters", () => {
    expect(escapeIcsText("Dinner, drinks; patio\\inside\nBring dessert")).toBe(
      "Dinner\\, drinks\\; patio\\\\inside\\nBring dessert",
    );
  });

  it("builds a valid ICS event with timezone-aware start and end", () => {
    const result = buildIcsEvent({
      title: "Dinner with crew",
      startsAtLocal: "2026-04-19T18:30",
      endsAtLocal: "2026-04-19T20:00",
      timezone: "America/Chicago",
      location: "Neighborhood spot",
      description: "Easy monthly catch-up.",
      uid: "test@example.com",
      dtstamp: "20260419T120000Z",
    });

    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("SUMMARY:Dinner with crew");
    expect(result).toContain("DTSTART;TZID=America/Chicago:20260419T183000");
    expect(result).toContain("DTEND;TZID=America/Chicago:20260419T200000");
    expect(result).toContain("LOCATION:Neighborhood spot");
    expect(result).toContain("DESCRIPTION:Easy monthly catch-up.");
  });

  it("falls back to a duration when no end time is provided", () => {
    const result = buildIcsEvent({
      title: "Coffee",
      startsAtLocal: "2026-04-19T09:00",
      timezone: "America/Chicago",
      uid: "test@example.com",
      dtstamp: "20260419T120000Z",
    });

    expect(result).toContain("DURATION:PT2H");
  });

  it("sanitizes the download filename", () => {
    expect(sanitizeFileName("Dinner with Alex & Crew!")).toBe("dinner-with-alex-crew");
  });
});
