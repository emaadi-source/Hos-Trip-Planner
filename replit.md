# HOS Trip Planner

A full-stack FMCSA-compliant trip planning tool for commercial truck drivers. Enter your current location, pickup, and dropoff — the app calculates an HOS-compliant route with mandatory rest stops, fuel stops, and 30-min breaks, then generates filled-out Driver Daily Log (ELD) sheets for every day of the trip.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/hos-planner run dev` — run the frontend (port 22081)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React 18 + Vite, TanStack Query, Wouter (routing), Leaflet / react-leaflet (maps), HTML5 Canvas (ELD log sheets), Tailwind CSS v4, shadcn/ui components
- **Backend:** Express 5 (no database needed — stateless computation)
- **External APIs:** Nominatim (geocoding, free, no key), OSRM demo server (routing, free, no key)
- **Validation:** Zod (api-zod), Orval codegen from OpenAPI spec

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `artifacts/api-server/src/routes/trip.ts` — POST /api/trip/plan and GET /api/trip/geocode handlers
- `artifacts/api-server/src/lib/hos-calculator.ts` — Core HOS rules engine (11hr/14hr/30min/70hr)
- `artifacts/api-server/src/lib/osrm.ts` — OSRM routing client + polyline interpolation
- `artifacts/api-server/src/lib/nominatim.ts` — Nominatim geocoding client
- `artifacts/hos-planner/src/pages/home.tsx` — Trip input form
- `artifacts/hos-planner/src/pages/results.tsx` — Results dashboard (map + stops + ELD logs)
- `artifacts/hos-planner/src/components/route-map.tsx` — Leaflet map component
- `artifacts/hos-planner/src/components/eld-logs-view.tsx` — HTML5 Canvas ELD log renderer

## HOS Rules Implemented (FMCSA 49 CFR Part 395)

- **11-hour driving limit**: Maximum 11 hours of driving after 10 consecutive off-duty hours
- **14-hour window**: Cannot drive beyond 14th consecutive hour after coming on duty
- **30-minute rest break**: Required after 8 cumulative hours of driving
- **10-hour rest**: Minimum 10 consecutive off-duty hours between shifts
- **70hr/8-day cycle**: Property-carrying driver cycle limit
- **Fuel stops**: Every 1,000 miles
- **Pickup/Dropoff**: 1 hour each (on-duty not driving)
- **Average speed**: 55 mph

## Architecture decisions

- **Stateless API**: No database — trip plans are computed on demand using external routing/geocoding APIs. This keeps deployment dead simple.
- **OSRM + Nominatim**: Both are free, no API key needed. OSRM demo server for routing, Nominatim (OSM) for geocoding.
- **Canvas ELD logs**: Drawn on HTML5 Canvas to faithfully reproduce the FMCSA paper log grid format — 24-hour timeline with 4 duty status rows, exactly matching the official FMCSA form.
- **localStorage trip state**: Trip plan is stored in localStorage between the form (/) and results (/results) pages — avoids URL bloat with large route payloads.
- **Polyline interpolation**: Custom haversine-based interpolation on OSRM polylines to place stops (fuel, rest, break) at geographically accurate points on the route.

## Product

Users enter:
1. Current location (where the driver is now)
2. Pickup location
3. Dropoff location
4. Current cycle hours used (0–70)

The app outputs:
- **Interactive map** with the full route and color-coded stop markers
- **Stops timeline** listing every stop (type, location, duration, regulatory notes)
- **ELD Daily Log Sheets** — one canvas-drawn FMCSA log per day, printable

## User preferences

- Lighter tone and minimal design
- Professional codebase quality

## Gotchas

- The OSRM demo server (`router.project-osrm.org`) is a public free server — for production, run your own OSRM instance or use a paid routing API
- Nominatim has a 1 req/sec rate limit — for production, self-host or use a paid geocoding service
- Leaflet requires its CSS to be imported; it's imported in `index.css` via `@import 'leaflet/dist/leaflet.css'`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
