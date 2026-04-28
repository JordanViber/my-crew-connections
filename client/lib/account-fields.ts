export const DEFAULT_COUNTRY = "United States";

export const COUNTRY_OPTIONS = [
  DEFAULT_COUNTRY,
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Brazil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Costa Rica",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hong Kong SAR China",
  "Iceland",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Kenya",
  "Luxembourg",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Panama",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Taiwan",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "Vietnam",
];

export type AddressSuggestion = {
  label: string;
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

function stripPhoneFormatting(value: string) {
  let cleaned = "";
  let hasLeadingPlus = false;

  for (const character of value) {
    if (/\d/.test(character)) {
      cleaned += character;
      continue;
    }

    if (character === "+" && !cleaned.length && !hasLeadingPlus) {
      cleaned += "+";
      hasLeadingPlus = true;
    }
  }

  return cleaned;
}

function formatNorthAmericanPhone(digits: string, includeCountryPrefix: boolean) {
  let localDigits = digits;
  let prefix = "";

  if (localDigits.length > 10 && localDigits.startsWith("1")) {
    localDigits = localDigits.slice(1);
    prefix = includeCountryPrefix ? "+1 " : "1 ";
  }

  if (localDigits.length <= 3) {
    return `${prefix}${localDigits}`.trim();
  }

  if (localDigits.length <= 7) {
    return `${prefix}${localDigits.slice(0, 3)}-${localDigits.slice(3)}`.trim();
  }

  return `${prefix}(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6, 10)}`.trim();
}

function groupInternationalDigits(digits: string) {
  const groups = digits.match(/.{1,3}/g);
  return groups ? groups.join(" ") : digits;
}

export function normalizePhoneNumberForStorage(value: string) {
  const cleaned = stripPhoneFormatting(value.trim());

  if (!cleaned) {
    return "";
  }

  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replaceAll(/\D/g, "")}`;
  }

  return cleaned.replaceAll(/\D/g, "");
}

export function formatPhoneNumberForDisplay(value: string) {
  const normalized = normalizePhoneNumberForStorage(value);

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1);

    if (digits.length <= 11 && digits.startsWith("1")) {
      return formatNorthAmericanPhone(digits, true);
    }

    return `+${groupInternationalDigits(digits)}`;
  }

  if (normalized.length <= 11) {
    return formatNorthAmericanPhone(normalized, false);
  }

  return groupInternationalDigits(normalized);
}

export function getDefaultCountry(value?: string | null) {
  return value?.trim() || DEFAULT_COUNTRY;
}