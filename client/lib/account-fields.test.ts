import {
  DEFAULT_COUNTRY,
  formatPhoneNumberForDisplay,
  getDefaultCountry,
  normalizePhoneNumberForAuth,
  normalizePhoneNumberForStorage,
} from "@/lib/account-fields";

describe("account field helpers", () => {
  it("formats local seven-digit phone numbers as the user types", () => {
    expect(formatPhoneNumberForDisplay("5550110")).toBe("555-0110");
  });

  it("formats ten-digit phone numbers in a familiar US layout", () => {
    expect(formatPhoneNumberForDisplay("4155550132")).toBe("(415) 555-0132");
  });

  it("preserves international numbers with a leading plus", () => {
    expect(formatPhoneNumberForDisplay("+442079460958")).toBe("+442 079 460 958");
  });

  it("stores phone numbers without UI formatting noise", () => {
    expect(normalizePhoneNumberForStorage("(415) 555-0132")).toBe("4155550132");
    expect(normalizePhoneNumberForStorage("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("normalizes auth phone numbers into E.164 when a country code is implied", () => {
    expect(normalizePhoneNumberForAuth("(415) 555-0132")).toBe("+14155550132");
    expect(normalizePhoneNumberForAuth("1 (415) 555-0132")).toBe("+14155550132");
    expect(normalizePhoneNumberForAuth("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("rejects auth phone numbers that do not include a usable country code", () => {
    expect(normalizePhoneNumberForAuth("555-0110")).toBe("");
    expect(normalizePhoneNumberForAuth("442079460958")).toBe("");
  });

  it("defaults the country to the United States when none is present", () => {
    expect(getDefaultCountry("")).toBe(DEFAULT_COUNTRY);
    expect(getDefaultCountry()).toBe(DEFAULT_COUNTRY);
    expect(getDefaultCountry("Canada")).toBe("Canada");
  });
});