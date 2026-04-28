import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_COUNTRY, type AddressSuggestion } from "@/lib/account-fields";

type NominatimResult = {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

function buildStreetAddress(result: NominatimResult) {
  const address = result.address;

  if (!address) {
    return "";
  }

  return [address.house_number, address.road ?? address.pedestrian ?? address.footway]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeSuggestion(result: NominatimResult): AddressSuggestion | null {
  const addressLine1 = buildStreetAddress(result);
  const address = result.address;

  if (!addressLine1 || !address) {
    return null;
  }

  return {
    label: result.display_name ?? addressLine1,
    addressLine1,
    city: address.city ?? address.town ?? address.village ?? address.hamlet ?? "",
    region: address.state ?? address.county ?? "",
    postalCode: address.postcode ?? "",
    country: address.country ?? DEFAULT_COUNTRY,
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = request.nextUrl.searchParams.get("country")?.trim() || DEFAULT_COUNTRY;

  if (query.length < 5) {
    return NextResponse.json({ suggestions: [] });
  }

  const searchQuery = country === DEFAULT_COUNTRY ? query : `${query}, ${country}`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  if (country === DEFAULT_COUNTRY) {
    url.searchParams.set("countrycodes", "us");
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "accept-language": "en",
        "user-agent": "MyCrewConnections/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const results = (await response.json()) as NominatimResult[];
    const suggestions = results
      .map(normalizeSuggestion)
      .filter((value): value is AddressSuggestion => Boolean(value))
      .filter((value, index, allValues) => allValues.findIndex((candidate) => candidate.label === value.label) === index);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}