"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRY_OPTIONS, type AddressSuggestion, getDefaultCountry } from "@/lib/account-fields";

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

  useEffect(() => {
    setAddressLine1(initialAddressLine1);
    setAddressLine2(initialAddressLine2);
    setCity(initialCity);
    setRegion(initialRegion);
    setPostalCode(initialPostalCode);
    setCountry(getDefaultCountry(initialCountry));
  }, [initialAddressLine1, initialAddressLine2, initialCity, initialCountry, initialPostalCode, initialRegion]);

  useEffect(() => {
    if (!hasTypedSearch || disabled) {
      return undefined;
    }

    const query = addressLine1.trim();

    if (query.length < 5) {
      setSuggestions([]);
      setHasSearchResults(true);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Address lookup failed.");
        }

        const data = (await response.json()) as { suggestions?: AddressSuggestion[] };
        const nextSuggestions = data.suggestions ?? [];

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
    }, 220);

    return () => {
      controller.abort();
      globalThis.clearTimeout(timeoutId);
    };
  }, [addressLine1, country, disabled, hasTypedSearch]);

  const helperText = useMemo(() => {
    if (isLoading) {
      return "Finding nearby matches...";
    }

    if (!hasSearchResults && addressLine1.trim().length >= 5) {
      return "No close match yet. You can still enter the address manually.";
    }

    return "Start typing to autofill the city, state, postal code, and country.";
  }, [addressLine1, hasSearchResults, isLoading]);

  function applySuggestion(suggestion: AddressSuggestion) {
    setAddressLine1(suggestion.addressLine1);
    setCity(suggestion.city);
    setRegion(suggestion.region);
    setPostalCode(suggestion.postalCode);
    setCountry(getDefaultCountry(suggestion.country));
    setSuggestions([]);
    setHasTypedSearch(false);
    setHasSearchResults(true);
  }

  return (
    <div className="grid gap-4">
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
              setHasTypedSearch(true);
              setAddressLine1(event.target.value);
            }}
            placeholder="Start typing your street address"
            type="text"
            value={addressLine1}
          />

          {suggestions.length ? (
            <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-2xl border border-border/90 bg-[rgba(255,255,255,0.98)] shadow-[0_18px_36px_rgba(29,36,40,0.12)] backdrop-blur-xl">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.label}-${index}`}
                  className="flex w-full flex-col items-start gap-1 border-b border-border/60 px-4 py-3 text-left transition last:border-b-0 hover:bg-[rgba(239,107,74,0.08)]"
                  onClick={() => applySuggestion(suggestion)}
                  type="button"
                >
                  <span className="text-sm font-semibold text-foreground">{suggestion.addressLine1 || suggestion.label}</span>
                  <span className="text-xs leading-5 text-foreground/62">{suggestion.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="text-xs leading-5 text-foreground/58">{helperText}</span>
      </label>

      <label className="grid gap-2">
        <span className="field-label">Apartment, suite, or unit</span>
        <input
          autoComplete="address-line2"
          className="field-input"
          disabled={disabled}
          name="addressLine2"
          onChange={(event) => setAddressLine2(event.target.value)}
          placeholder="Apt 4B"
          type="text"
          value={addressLine2}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">City</span>
          <input
            autoComplete="address-level2"
            className="field-input"
            disabled={disabled}
            name="city"
            onChange={(event) => setCity(event.target.value)}
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
            onChange={(event) => setRegion(event.target.value)}
            type="text"
            value={region}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">Postal code</span>
          <input
            autoComplete="postal-code"
            className="field-input"
            disabled={disabled}
            name="postalCode"
            onChange={(event) => setPostalCode(event.target.value)}
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
            onChange={(event) => setCountry(event.target.value)}
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