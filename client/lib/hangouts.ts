export type HangoutStatus = "planned" | "completed" | "canceled";

type HangoutWindowInput = {
  startsAt: string;
  endsAt?: string;
  timezone?: string;
};

function formatDatePart(value: string, timezone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatTimePart(value: string, timezone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function formatHangoutWindow({ startsAt, endsAt, timezone }: HangoutWindowInput) {
  const dateLabel = formatDatePart(startsAt, timezone);
  const startTimeLabel = formatTimePart(startsAt, timezone);

  if (!endsAt) {
    return `${dateLabel} at ${startTimeLabel}`;
  }

  return `${dateLabel} at ${startTimeLabel} - ${formatTimePart(endsAt, timezone)}`;
}

export function getHangoutStatusLabel(status: HangoutStatus) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "canceled") {
    return "Canceled";
  }

  return "Planned";
}

export function getHangoutWindowBucket(startsAt: string, now = new Date()) {
  const startDate = new Date(startsAt);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (startDate < startOfTomorrow) {
    return "Today";
  }

  if (startDate < new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000)) {
    return "Tomorrow";
  }

  if (startDate < startOfNextWeek) {
    return "This week";
  }

  return "Later";
}
