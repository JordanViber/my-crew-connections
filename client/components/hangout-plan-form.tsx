"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "@/components/external-link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { DEFAULT_COUNTRY, type AddressSuggestion } from "@/lib/account-fields";
import {
  buildAppleMapsSearchUrl,
  buildGoogleMapsSearchUrl,
  buildOpenTableSearchUrl,
  buildYelpSearchUrl,
} from "@/lib/hangouts";

const placeAddressSuggestionCache = new Map<string, AddressSuggestion[]>();
const appActionClassName =
  "button-secondary button-compact min-w-0 flex-wrap gap-1.5 text-center leading-5";

function toDateTimeLocalValue(hoursFromNow = 72) {
  const now = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatPlaceAddressSuggestion(suggestion: AddressSuggestion) {
  return suggestion.label || [suggestion.addressLine1, suggestion.city, suggestion.region, suggestion.postalCode]
    .filter(Boolean)
    .join(", ");
}

function PlaceAddressInput({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
}>) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTypedSearch, setHasTypedSearch] = useState(false);
  const [hasSearchResults, setHasSearchResults] = useState(true);
  const query = value.trim();

  useEffect(() => {
    if (!hasTypedSearch) {
      return undefined;
    }

    if (query.length < 5) {
      setSuggestions([]);
      setHasSearchResults(true);
      setIsLoading(false);
      return undefined;
    }

    const cacheKey = `${DEFAULT_COUNTRY.toLowerCase()}:${query.toLowerCase()}`;
    const cachedSuggestions = placeAddressSuggestionCache.get(cacheKey);

    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setHasSearchResults(cachedSuggestions.length > 0);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/address-search?q=${encodeURIComponent(query)}&country=${encodeURIComponent(DEFAULT_COUNTRY)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Address lookup failed.");
        }

        const data = (await response.json()) as { suggestions?: AddressSuggestion[] };
        const nextSuggestions = data.suggestions ?? [];

        placeAddressSuggestionCache.set(cacheKey, nextSuggestions);
        setSuggestions(nextSuggestions);
        setHasSearchResults(nextSuggestions.length > 0);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setHasSearchResults(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 140);

    return () => {
      controller.abort();
      globalThis.clearTimeout(timeoutId);
    };
  }, [hasTypedSearch, query]);

  const showSuggestionPanel = hasTypedSearch && query.length >= 5;

  function applySuggestion(suggestion: AddressSuggestion) {
    onChange(formatPlaceAddressSuggestion(suggestion));
    setSuggestions([]);
    setHasTypedSearch(false);
    setHasSearchResults(true);
  }

  return (
    <div className="grid gap-2">
      <label className="field-label" htmlFor="hangout-place-address">
        Place address
      </label>
      <div className="relative">
        <input
          aria-autocomplete="list"
          className="field-input"
          id="hangout-place-address"
          name="placeAddress"
          onChange={(event) => {
            onChange(event.target.value);
            setHasTypedSearch(true);
          }}
          placeholder="123 Main St"
          type="text"
          value={value}
        />

        {showSuggestionPanel ? (
          <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-lg border border-border/90 bg-[rgba(255,255,255,0.98)] shadow-[0_18px_36px_rgba(29,36,40,0.12)] backdrop-blur-xl">
            {isLoading ? (
              <div className="grid gap-2 p-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-border/60 bg-surface-muted px-3 py-2.5">
                    <span className="h-3 w-3/4 animate-pulse rounded-full bg-foreground/12" />
                    <span className="h-2.5 w-1/2 animate-pulse rounded-full bg-foreground/10" />
                  </div>
                ))}
              </div>
            ) : suggestions.length ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.label}-${index}`}
                  className="flex w-full flex-col items-start gap-1 border-b border-border/60 px-4 py-3 text-left transition last:border-b-0 hover:bg-[rgba(239,107,74,0.08)]"
                  onClick={() => applySuggestion(suggestion)}
                  type="button"
                >
                  <span className="text-sm font-semibold text-foreground">{suggestion.addressLine1 || suggestion.label}</span>
                  <span className="text-xs leading-5 text-foreground/62">{suggestion.label}</span>
                </button>
              ))
            ) : !hasSearchResults ? (
              <div className="px-4 py-3 text-sm text-foreground/62">
                No close match. You can keep typing or enter it manually.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HangoutPlanForm({
  action,
  subjectLabel,
  targetType,
  targetId,
  redirectTo,
  allowShareWithLinkedUser = false,
  shareWithLinkedUserLabel,
}: Readonly<{
  action: (formData: FormData) => void | Promise<void>;
  subjectLabel: string;
  targetType: "connection" | "group";
  targetId: string;
  redirectTo: string;
  allowShareWithLinkedUser?: boolean;
  shareWithLinkedUserLabel?: string;
}>) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [location, setLocation] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");
  const [opentableUrl, setOpentableUrl] = useState("");
  const providerInput = { location, placeName, placeAddress };
  const appLinks = [
    { href: buildAppleMapsSearchUrl(providerInput), label: "Open Apple Maps" },
    { href: googleMapsUrl.trim() || buildGoogleMapsSearchUrl(providerInput), label: "Open Google Maps" },
    { href: yelpUrl.trim() || buildYelpSearchUrl(providerInput), label: "Find on Yelp" },
    { href: opentableUrl.trim() || buildOpenTableSearchUrl(providerInput), label: "Find on OpenTable" },
  ].filter((link) => Boolean(link.href));

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="grid gap-2">
        <span className="field-label">Title</span>
        <input className="field-input" defaultValue={`${subjectLabel} hangout`} name="title" type="text" required />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Starts</span>
          <input className="field-input" defaultValue={toDateTimeLocalValue()} name="startsAt" type="datetime-local" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Ends</span>
          <input className="field-input" defaultValue={toDateTimeLocalValue(74)} name="endsAt" type="datetime-local" />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="field-label">Location</span>
        <input
          className="field-input"
          name="location"
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Cafe patio, park loop, dinner spot"
          type="text"
          value={location}
        />
      </label>
      <fieldset className="grid gap-3 rounded-lg border border-border/80 bg-white/70 p-3">
        <legend className="field-label px-2">Place links</legend>
        {appLinks.length ? (
          <div className="flex flex-wrap gap-2">
            {appLinks.map((link) => (
              <ExternalLink key={link.label} className={appActionClassName} href={link.href}>
                {link.label}
              </ExternalLink>
            ))}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="field-label">Place name</span>
            <input
              className="field-input"
              name="placeName"
              onChange={(event) => setPlaceName(event.target.value)}
              placeholder="Cafe Luna"
              type="text"
              value={placeName}
            />
          </label>
          <PlaceAddressInput onChange={setPlaceAddress} value={placeAddress} />
          <label className="grid gap-2">
            <span className="field-label">Google Maps link</span>
            <input
              className="field-input"
              name="googleMapsUrl"
              onChange={(event) => setGoogleMapsUrl(event.target.value)}
              placeholder="https://maps.google.com/..."
              type="url"
              value={googleMapsUrl}
            />
          </label>
          <label className="grid gap-2">
            <span className="field-label">Yelp link</span>
            <input
              className="field-input"
              name="yelpUrl"
              onChange={(event) => setYelpUrl(event.target.value)}
              placeholder="https://www.yelp.com/biz/..."
              type="url"
              value={yelpUrl}
            />
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="field-label">OpenTable link</span>
            <input
              className="field-input"
              name="opentableUrl"
              onChange={(event) => setOpentableUrl(event.target.value)}
              placeholder="https://www.opentable.com/r/..."
              type="url"
              value={opentableUrl}
            />
          </label>
        </div>
      </fieldset>
      <label className="grid gap-2">
        <span className="field-label">Planning note</span>
        <textarea
          className="field-input min-h-24"
          name="notes"
          placeholder="Why this plan matters, what to remember, or what to bring up."
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Photo album label</span>
          <input className="field-input" name="photoAlbumLabel" placeholder="Shared Google Photos album" type="text" />
        </label>
        <div className="grid gap-2">
          <label className="field-label" htmlFor="hangout-photo-album-url">
            Photo album link
          </label>
          <ExternalLink className={appActionClassName} href="https://photos.google.com/albums">
            Open Google Photos
          </ExternalLink>
          <input className="field-input" id="hangout-photo-album-url" name="photoAlbumUrl" placeholder="https://..." type="url" />
        </div>
      </div>
      {targetType === "connection" && allowShareWithLinkedUser ? (
        <label className="inline-flex items-start gap-2 rounded-md border border-border/80 bg-white/70 px-3 py-2.5 text-sm text-foreground/75">
          <input className="mt-1" name="shareWithLinkedUser" type="checkbox" value="true" />
          <span>
            Share this plan with {shareWithLinkedUserLabel || "the linked user"} now.
            <span className="mt-1 block text-xs text-foreground/58">
              They can choose Join plan or Pass for now before this becomes a shared plan.
            </span>
          </span>
        </label>
      ) : null}
      <p className="text-sm leading-6 text-foreground/68">
        {targetType === "group"
          ? "Sending this proposal starts the RSVP flow for group members with app access, and accepted members can export it to calendar right away."
          : "Saving keeps this plan on the dashboard until it is completed, canceled, or exported to calendar."}
      </p>
      <PendingSubmitButton
        idleLabel={targetType === "group" ? "Send proposal" : "Save plan"}
        pendingLabel={targetType === "group" ? "Sending proposal..." : "Saving plan..."}
      />
    </form>
  );
}
