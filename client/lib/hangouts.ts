export type HangoutStatus = "planned" | "completed" | "canceled";

export type HangoutProviderLinkInput = {
  location?: string;
  placeName?: string;
  placeAddress?: string;
  googleMapsUrl?: string;
  yelpUrl?: string;
  opentableUrl?: string;
};

type HangoutProviderLink = {
  provider: "apple-maps" | "google-maps" | "yelp" | "opentable";
  label: string;
  href: string;
};

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

function buildPlaceSearchText(input: HangoutProviderLinkInput) {
  return [input.placeName, input.placeAddress, input.placeName ? "" : input.location]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}

function buildPlaceNameSearchText(input: HangoutProviderLinkInput) {
  return (input.placeName?.trim() || input.location?.trim() || "").trim();
}

function encodeMapsQuery(value: string) {
  return new URLSearchParams({ q: value }).toString();
}

export function buildGoogleMapsSearchUrl(input: HangoutProviderLinkInput) {
  const query = buildPlaceSearchText(input);

  if (!query) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&${encodeMapsQuery(query).replace(/^q=/, "query=")}`;
}

export function buildAppleMapsSearchUrl(input: HangoutProviderLinkInput) {
  const query = buildPlaceSearchText(input);

  if (!query) {
    return "";
  }

  return `http://maps.apple.com/?${encodeMapsQuery(query)}`;
}

export function buildYelpSearchUrl(input: HangoutProviderLinkInput) {
  const description = buildPlaceNameSearchText(input);
  const location = (input.placeAddress?.trim() || input.location?.trim() || "").trim();

  if (!description && !location) {
    return "";
  }

  const params = new URLSearchParams();

  if (description) {
    params.set("find_desc", description);
  }

  if (location) {
    params.set("find_loc", location);
  }

  return `https://www.yelp.com/search?${params.toString()}`;
}

export function buildOpenTableSearchUrl(input: HangoutProviderLinkInput) {
  const term = buildPlaceNameSearchText(input);

  if (!term) {
    return "";
  }

  return `https://www.opentable.com/s?${new URLSearchParams({ term }).toString()}`;
}

export function getHangoutProviderLinks(input: HangoutProviderLinkInput) {
  const links: HangoutProviderLink[] = [];
  const appleMapsUrl = buildAppleMapsSearchUrl(input);
  const googleMapsUrl = input.googleMapsUrl?.trim() || buildGoogleMapsSearchUrl(input);

  if (appleMapsUrl) {
    links.push({ label: "Open in Apple Maps", href: appleMapsUrl, provider: "apple-maps" });
  }

  if (googleMapsUrl) {
    links.push({ label: "Open in Google Maps", href: googleMapsUrl, provider: "google-maps" });
  }

  if (input.yelpUrl?.trim()) {
    links.push({ label: "View on Yelp", href: input.yelpUrl.trim(), provider: "yelp" });
  }

  if (input.opentableUrl?.trim()) {
    links.push({ label: "Reserve on OpenTable", href: input.opentableUrl.trim(), provider: "opentable" });
  }

  return links;
}
