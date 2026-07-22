export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Geocode a location string using Nominatim (OpenStreetMap).
 * Returns up to 5 results, biased to the USA.
 */
export async function geocode(query: string): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "HOS-Trip-Planner/1.0 (assessment-project)",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return data.map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}

/**
 * Geocode and return the first (best) result, or throw if none found.
 */
export async function geocodeFirst(query: string): Promise<GeocodeResult> {
  const results = await geocode(query);
  if (results.length === 0) {
    throw new Error(`Could not geocode location: "${query}"`);
  }
  return results[0];
}
