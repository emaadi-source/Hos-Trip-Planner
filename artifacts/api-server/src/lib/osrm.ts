export interface RouteResult {
  distanceMiles: number;
  durationHours: number;
  /** Array of [lat, lng] waypoints along the route */
  polyline: [number, number][];
}

interface OsrmResponse {
  code: string;
  routes: Array<{
    distance: number;   // meters
    duration: number;   // seconds
    geometry: {
      coordinates: [number, number][]; // [lng, lat]
      type: string;
    };
  }>;
}

const OSRM_BASE = "http://router.project-osrm.org/route/v1/driving";
const METERS_PER_MILE = 1609.344;

/**
 * Get a driving route between multiple waypoints using OSRM's demo server.
 * Waypoints: array of { lat, lng }
 */
export async function getRoute(
  waypoints: Array<{ lat: number; lng: number }>,
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error("At least 2 waypoints required");
  }

  // OSRM expects lng,lat order
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`OSRM error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OsrmResponse;

  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM returned no route: code=${data.code}`);
  }

  const route = data.routes[0];

  // Convert [lng, lat] to [lat, lng]
  const polyline: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng],
  );

  return {
    distanceMiles: route.distance / METERS_PER_MILE,
    durationHours: route.duration / 3600,
    polyline,
  };
}

/**
 * Interpolate a position along a polyline at a given distance (in miles).
 * Returns [lat, lng].
 */
export function interpolatePolyline(
  polyline: [number, number][],
  totalDistanceMiles: number,
  targetMiles: number,
): [number, number] {
  if (targetMiles <= 0) return polyline[0];
  if (targetMiles >= totalDistanceMiles) return polyline[polyline.length - 1];

  // Build cumulative distances along the polyline
  const segDistances: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    const [lat1, lng1] = polyline[i - 1];
    const [lat2, lng2] = polyline[i];
    const d = haversineDistanceMiles(lat1, lng1, lat2, lng2);
    segDistances.push(segDistances[i - 1] + d);
  }

  const totalPolylineDist = segDistances[segDistances.length - 1];
  // Scale target to polyline coordinate space
  const scaledTarget = (targetMiles / totalDistanceMiles) * totalPolylineDist;

  for (let i = 1; i < segDistances.length; i++) {
    if (segDistances[i] >= scaledTarget) {
      const segStart = segDistances[i - 1];
      const segEnd = segDistances[i];
      const t = segEnd === segStart ? 0 : (scaledTarget - segStart) / (segEnd - segStart);
      const [lat1, lng1] = polyline[i - 1];
      const [lat2, lng2] = polyline[i];
      return [lat1 + t * (lat2 - lat1), lng1 + t * (lng2 - lng1)];
    }
  }

  return polyline[polyline.length - 1];
}

function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
