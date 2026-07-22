import { Router } from "express";
import { geocode, geocodeFirst } from "../lib/nominatim.js";
import { getRoute, interpolatePolyline } from "../lib/osrm.js";
import { calculateTrip } from "../lib/hos-calculator.js";
import { PlanTripBody } from "@workspace/api-zod";

const router = Router();

/**
 * GET /api/trip/geocode?q=...
 * Geocode a location string and return candidates.
 */
router.get("/trip/geocode", async (req, res) => {
  const q = req.query["q"];
  if (typeof q !== "string" || q.trim().length < 2) {
    res.status(400).json({ error: "Query parameter 'q' must be at least 2 characters" });
    return;
  }

  try {
    const results = await geocode(q.trim());
    res.json(results.map(r => ({
      displayName: r.displayName,
      lat: r.lat,
      lng: r.lng,
    })));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Geocoding failed";
    req.log.error({ err }, "Geocoding failed");
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/trip/plan
 * Plan a full HOS-compliant trip with route, stops, and ELD logs.
 */
router.post("/trip/plan", async (req, res) => {
  const parsed = PlanTripBody.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => issue.message).join("; ");
    res.status(400).json({ error: `Invalid input: ${errors}` });
    return;
  }

  const { currentLocation, pickupLocation, dropoffLocation, currentCycleUsed } = parsed.data;

  try {
    req.log.info({ currentLocation, pickupLocation, dropoffLocation, currentCycleUsed }, "Planning trip");

    // Step 1: Geocode all three locations in parallel
    const [currentGeo, pickupGeo, dropoffGeo] = await Promise.all([
      geocodeFirst(currentLocation),
      geocodeFirst(pickupLocation),
      geocodeFirst(dropoffLocation),
    ]);

    // Step 2: Get routes
    // Route 1: current → pickup → dropoff (via OSRM with 3 waypoints)
    // We split into two calls for separate segment polylines
    const [route1, route2] = await Promise.all([
      getRoute([
        { lat: currentGeo.lat, lng: currentGeo.lng },
        { lat: pickupGeo.lat, lng: pickupGeo.lng },
      ]),
      getRoute([
        { lat: pickupGeo.lat, lng: pickupGeo.lng },
        { lat: dropoffGeo.lat, lng: dropoffGeo.lng },
      ]),
    ]);

    // Step 3: Calculate HOS-compliant trip plan
    const tripResult = calculateTrip(
      {
        fromLocation: currentGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        toLocation: pickupGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        distanceMiles: route1.distanceMiles,
        fromLat: currentGeo.lat,
        fromLng: currentGeo.lng,
        toLat: pickupGeo.lat,
        toLng: pickupGeo.lng,
        polyline: route1.polyline,
      },
      {
        fromLocation: pickupGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        toLocation: dropoffGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        distanceMiles: route2.distanceMiles,
        fromLat: pickupGeo.lat,
        fromLng: pickupGeo.lng,
        toLat: dropoffGeo.lat,
        toLng: dropoffGeo.lng,
        polyline: route2.polyline,
      },
      currentCycleUsed,
    );

    // Step 4: Build full polyline (combine both segments)
    const fullPolyline = [
      ...route1.polyline,
      ...route2.polyline.slice(1), // avoid duplicate point at junction
    ];

    // Build route segments for response
    const segments = [
      {
        from: currentGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        to: pickupGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        distanceMiles: parseFloat(route1.distanceMiles.toFixed(1)),
        durationHours: parseFloat(route1.durationHours.toFixed(2)),
        fromCoords: [currentGeo.lat, currentGeo.lng] as [number, number],
        toCoords: [pickupGeo.lat, pickupGeo.lng] as [number, number],
      },
      {
        from: pickupGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        to: dropoffGeo.displayName.split(",").slice(0, 2).join(",").trim(),
        distanceMiles: parseFloat(route2.distanceMiles.toFixed(1)),
        durationHours: parseFloat(route2.durationHours.toFixed(2)),
        fromCoords: [pickupGeo.lat, pickupGeo.lng] as [number, number],
        toCoords: [dropoffGeo.lat, dropoffGeo.lng] as [number, number],
      },
    ];

    res.json({
      route: {
        totalDistanceMiles: parseFloat((route1.distanceMiles + route2.distanceMiles).toFixed(1)),
        totalDrivingHours: parseFloat((route1.durationHours + route2.durationHours).toFixed(2)),
        polyline: fullPolyline,
        segments,
      },
      stops: tripResult.stops,
      eldLogs: tripResult.eldLogs,
      summary: tripResult.summary,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Trip planning failed";
    req.log.error({ err }, "Trip planning failed");
    res.status(500).json({ error: msg });
  }
});

export default router;
