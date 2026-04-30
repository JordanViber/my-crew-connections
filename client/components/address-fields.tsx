"use client";

import { useEffect, useState } from "react";
import { COUNTRY_OPTIONS, type AddressSuggestion, getDefaultCountry } from "@/lib/account-fields";

const suggestionCache = new Map<string, AddressSuggestion[]>();

type AddressFieldsProps = {
  initialAddressLine1?: string;
  initialAddressLine2?: string;
  initialCity?: string;
  initialRegion?: string;
  initialPostalCode?: string;
  initialCountry?: string;
  disabled?: boolean;
};

export function AddressFields({
  initialAddressLine1 = "",
  initialAddressLine2 = "",
  initialCity = "",
  initialRegion = "",
  initialPostalCode = "",
  initialCountry,
  disabled = false,
}: Readonly<AddressFieldsProps>) {
  const [addressLine1, setAddressLine1] = useState(initialAddressLine1);
  const [addressLine2, setAddressLine2] = useState(initialAddressLine2);
  const [city, setCity] = useState(initialCity);
  const [region, setRegion] = useState(initialRegion);
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [country, setCountry] = useState(getDefaultCountry(initialCountry));
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTypedSearch, setHasTypedSearch] = useState(false);
  const [hasSearchResults, setHasSearchResults] = useState(true);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);

  useEffect(() => {
    setAddressLine1(initialAddressLine1);
    setAddressLine2(initialAddressLine2);
    setCity(initialCity);
    setRegion(initialRegion);
    setPostalCode(initialPostalCode);
    setCountry(getDefaultCountry(initialCountry));
  }, [initialAddressLine1, initialAddressLine2, initialCity, initialCountry, initialPostalCode, initialRegion]);

  useEffect(() => {
    if (!hasTypedSearch || suppressSuggestions || disabled) {
      return undefined;
    }

    const query = addressLine1.trim();

    if (query.length < 5) {
      setSuggestions([]);
      setHasSearchResults(true);
      setIsLoading(false);
      return undefined;
    }

    const cacheKey = `${country.toLowerCase()}:${query.toLowerCase()}`;
    const cachedSuggestions = suggestionCache.get(cacheKey);

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
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Address lookup failed.");
        }

        const data = (await response.json()) as { suggestions?: AddressSuggestion[] };
        const nextSuggestions = data.suggestions ?? [];

        suggestionCache.set(cacheKey, nextSuggestions);
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
  }, [addressLine1, country, disabled, hasTypedSearch, suppressSuggestions]);

  const showSuggestionPanel = hasTypedSearch && !suppressSuggestions && addressLine1.trim().length >= 5 && !disabled;

  function applySuggestion(suggestion: AddressSuggestion) {
    setAddressLine1(suggestion.addressLine1);
    setCity(suggestion.city);
    setRegion(suggestion.region);
    setPostalCode(suggestion.postalCode);
    setCountry(getDefaultCountry(suggestion.country));
    setSuggestions([]);
    setHasTypedSearch(false);
    setSuppressSuggestions(false);
    setHasSearchResults(true);
  }

  function suppressAutofillSuggestions() {
    setSuppressSuggestions(true);
    setSuggestions([]);
    setIsLoading(false);
    setHasSearchResults(true);
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-2">
        <span className="field-label">Street address</span>
        <div className="relative">
          <input
            autoComplete="street-address"
            aria-autocomplete="list"
            className="field-input"
            disabled={disabled}
            name="addressLine1"
            onChange={(event) => {
              const nextValue = event.target.value;
              const nativeEvent = event.nativeEvent;
              const inputType = "inputType" in nativeEvent ? nativeEvent.inputType : "";
              const likelyAutofillOrPaste = inputType !== "insertText" || Math.abs(nextValue.length - addressLine1.length) > 8;

              setAddressLine1(nextValue);
              setHasTypedSearch(!likelyAutofillOrPaste);
              setSuppressSuggestions(likelyAutofillOrPaste);

              if (likelyAutofillOrPaste) {
                setSuggestions([]);
              }
            }}
            placeholder="Street address"
            type="text"
            value={addressLine1}
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
      </label>

      <label className="grid gap-2">
        <span className="field-label">Apartment, suite, or unit</span>
        <input
          autoComplete="address-line2"
          className="field-input"
          disabled={disabled}
          name="addressLine2"
          onChange={(event) => {
            setAddressLine2(event.target.value);
            suppressAutofillSuggestions();
          }}
          type="text"
          value={addressLine2}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">City</span>
          <input
            autoComplete="address-level2"
            className="field-input"
            disabled={disabled}
            name="city"
            onChange={(event) => {
              setCity(event.target.value);
              suppressAutofillSuggestions();
            }}
            type="text"
            value={city}
          />
        </label>
        <label className="grid gap-2">
          <span className="field-label">State or region</span>
          <input
            autoComplete="address-level1"
            className="field-input"
            disabled={disabled}
            name="region"
            onChange={(event) => {
              setRegion(event.target.value);
              suppressAutofillSuggestions();
            }}
            type="text"
            value={region}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Postal code</span>
          <input
            autoComplete="postal-code"
            className="field-input"
            disabled={disabled}
            name="postalCode"
            onChange={(event) => {
              setPostalCode(event.target.value);
              suppressAutofillSuggestions();
            }}
            type="text"
            value={postalCode}
          />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Country</span>
          <select
            autoComplete="country-name"
            className="field-input"
            disabled={disabled}
            name="country"
            onChange={(event) => {
              setCountry(event.target.value);
              suppressAutofillSuggestions();
            }}
            value={country}
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
