import { interpolatePolyline } from "./osrm.js";

/** FMCSA HOS constants for property-carrying drivers */
const HOS = {
  MAX_DRIVING_PER_SHIFT: 11,       // hours
  MAX_ON_DUTY_WINDOW: 14,          // hours
  MIN_OFF_DUTY_REST: 10,           // consecutive hours off duty required
  BREAK_THRESHOLD: 8,              // hours driving before mandatory 30-min break
  BREAK_DURATION: 0.5,             // 30-minute break
  MAX_CYCLE_HOURS: 70,             // 70-hour/8-day limit
  FUEL_INTERVAL_MILES: 1000,       // fuel stop every N miles
  FUEL_STOP_DURATION: 0.5,         // 30 min for fuel stop (on-duty)
  PICKUP_DURATION: 1,              // 1 hour for pickup (on-duty not driving)
  DROPOFF_DURATION: 1,             // 1 hour for dropoff (on-duty not driving)
  AVG_SPEED_MPH: 55,               // average truck speed
  TRIP_START_HOUR: 8,              // 8:00 AM start time (wall clock hour)
} as const;

export type DutyStatus = "offDuty" | "sleeperBerth" | "driving" | "onDutyNotDriving";
export type StopType = "start" | "pickup" | "dropoff" | "rest" | "fuel" | "break";

export interface TimelineEntry {
  status: DutyStatus;
  /** Wall-clock hour from day 1 00:00 (e.g. 8.5 = 8:30 AM day 1) */
  startWallHour: number;
  endWallHour: number;
  location: string;
  lat: number;
  lng: number;
  cumulativeMiles: number;
  stopType?: StopType;
  notes?: string;
}

export interface Stop {
  type: StopType;
  location: string;
  lat: number;
  lng: number;
  arrivalDay: number;
  arrivalHour: number;
  durationHours: number;
  cumulativeMiles: number;
  notes: string;
}

export interface DutyStatusEntry {
  status: DutyStatus;
  startHour: number;
  endHour: number;
  location: string;
}

export interface RecapInfo {
  totalOnDutyToday: number;
  totalOnDutyLast7Days: number;
  totalOnDutyAvailableTomorrow: number;
  cycleHoursUsed: number;
  cycleHoursRemaining: number;
}

export interface EldLog {
  date: string;
  dayNumber: number;
  startLocation: string;
  endLocation: string;
  totalMilesDriving: number;
  totalMilesToday: number;
  entries: DutyStatusEntry[];
  remarks: string;
  totalHoursOffDuty: number;
  totalHoursSleeperBerth: number;
  totalHoursDriving: number;
  totalHoursOnDutyNotDriving: number;
  recap: RecapInfo;
}

export interface TripSummary {
  totalDays: number;
  totalDrivingHours: number;
  totalOnDutyHours: number;
  totalDistanceMiles: number;
  hosCompliant: boolean;
  warnings: string[];
  fuelStops: number;
  restStops: number;
  breakStops: number;
}

export interface TripPlanResult {
  stops: Stop[];
  eldLogs: EldLog[];
  summary: TripSummary;
}

interface DriverState {
  // Wall-clock hour (from day 1, 00:00)
  currentWallHour: number;
  // HOS tracking
  shiftDrivingHours: number;        // driving hours since last 10-hr rest
  shiftOnDutyHours: number;         // on-duty hours since last 10-hr rest
  breakDrivingHours: number;        // driving hours since last 30-min break
  cycleHoursUsed: number;           // total on-duty in 70hr/8day
  // Position
  cumulativeMiles: number;
  milesSinceLastFuel: number;
}

interface RouteSegment {
  fromLocation: string;
  toLocation: string;
  distanceMiles: number;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  polyline: [number, number][];      // full polyline for this segment
}

function wallHourToDay(wallHour: number): number {
  return Math.floor(wallHour / 24) + 1;
}

function wallHourToTimeOfDay(wallHour: number): number {
  return wallHour % 24;
}

/**
 * Given a location name and cumulative miles, return a short display name.
 * In production you'd use reverse geocoding; here we use the provided names.
 */
function locationAtMiles(
  miles: number,
  totalMiles: number,
  fromLocation: string,
  toLocation: string,
): string {
  const pct = miles / totalMiles;
  if (pct < 0.15) return `Near ${fromLocation}`;
  if (pct > 0.85) return `Near ${toLocation}`;
  return `En route (${Math.round(miles)} mi)`;
}

/**
 * Main HOS trip calculator. Takes two route segments and produces
 * a timeline of duty status entries, stops, and ELD logs.
 */
export function calculateTrip(
  segment1: RouteSegment,   // current → pickup
  segment2: RouteSegment,   // pickup → dropoff
  initialCycleHours: number,
): TripPlanResult {
  const timeline: TimelineEntry[] = [];
  const stops: Stop[] = [];
  const warnings: string[] = [];
  let fuelStops = 0;
  let restStops = 0;
  let breakStops = 0;

  const state: DriverState = {
    currentWallHour: HOS.TRIP_START_HOUR,
    shiftDrivingHours: 0,
    shiftOnDutyHours: 0,
    breakDrivingHours: 0,
    cycleHoursUsed: initialCycleHours,
    cumulativeMiles: 0,
    milesSinceLastFuel: 0,
  };

  // ── Pre-trip off duty (midnight to trip start) ──────────────────────────
  if (HOS.TRIP_START_HOUR > 0) {
    timeline.push({
      status: "offDuty",
      startWallHour: 0,
      endWallHour: HOS.TRIP_START_HOUR,
      location: segment1.fromLocation,
      lat: segment1.fromLat,
      lng: segment1.fromLng,
      cumulativeMiles: 0,
      notes: "Pre-trip off duty",
    });
  }

  // ── Start stop ──────────────────────────────────────────────────────────
  stops.push({
    type: "start",
    location: segment1.fromLocation,
    lat: segment1.fromLat,
    lng: segment1.fromLng,
    arrivalDay: 1,
    arrivalHour: HOS.TRIP_START_HOUR,
    durationHours: 0,
    cumulativeMiles: 0,
    notes: "Trip start: departing current location",
  });

  // ── Drive segment 1: current → pickup ───────────────────────────────────
  driveSegment(
    state,
    timeline,
    stops,
    warnings,
    segment1,
    segment2.fromLocation,
    { fuelStopsRef: { count: fuelStops }, restStopsRef: { count: restStops }, breakStopsRef: { count: breakStops } },
  );
  fuelStops = (stops.filter(s => s.type === "fuel")).length - 0; // recalculate later

  // ── Pickup stop ─────────────────────────────────────────────────────────
  addOnDutyStop(state, timeline, stops, {
    stopType: "pickup",
    location: segment2.fromLocation,
    lat: segment2.fromLat,
    lng: segment2.fromLng,
    durationHours: HOS.PICKUP_DURATION,
    notes: "Pickup: loading cargo (1 hr on-duty not driving)",
  });

  // ── Drive segment 2: pickup → dropoff ───────────────────────────────────
  driveSegment(
    state,
    timeline,
    stops,
    warnings,
    segment2,
    segment2.toLocation,
    { fuelStopsRef: { count: fuelStops }, restStopsRef: { count: restStops }, breakStopsRef: { count: breakStops } },
  );

  // ── Dropoff stop ────────────────────────────────────────────────────────
  addOnDutyStop(state, timeline, stops, {
    stopType: "dropoff",
    location: segment2.toLocation,
    lat: segment2.toLat,
    lng: segment2.toLng,
    durationHours: HOS.DROPOFF_DURATION,
    notes: "Dropoff: unloading cargo (1 hr on-duty not driving)",
  });

  // ── Post-trip off duty (fill rest of last day) ──────────────────────────
  const lastDayEnd = Math.ceil(state.currentWallHour / 24) * 24;
  if (state.currentWallHour < lastDayEnd) {
    timeline.push({
      status: "offDuty",
      startWallHour: state.currentWallHour,
      endWallHour: lastDayEnd,
      location: segment2.toLocation,
      lat: segment2.toLat,
      lng: segment2.toLng,
      cumulativeMiles: state.cumulativeMiles,
      notes: "Post trip off duty",
    });
  }

  // ── Build ELD logs ──────────────────────────────────────────────────────
  const totalDays = wallHourToDay(state.currentWallHour);
  const eldLogs = buildEldLogs(timeline, totalDays, state.cumulativeMiles, initialCycleHours);

  // ── Build summary ───────────────────────────────────────────────────────
  const totalDrivingHours = timeline
    .filter(e => e.status === "driving")
    .reduce((sum, e) => sum + (e.endWallHour - e.startWallHour), 0);

  const totalOnDutyHours = timeline
    .filter(e => e.status === "driving" || e.status === "onDutyNotDriving")
    .reduce((sum, e) => sum + (e.endWallHour - e.startWallHour), 0);

  const stopCounts = stops.reduce(
    (acc, s) => {
      if (s.type === "fuel") acc.fuel++;
      if (s.type === "rest") acc.rest++;
      if (s.type === "break") acc.break++;
      return acc;
    },
    { fuel: 0, rest: 0, break: 0 },
  );

  if (state.cycleHoursUsed > HOS.MAX_CYCLE_HOURS) {
    warnings.push(
      `Cycle hours (${state.cycleHoursUsed.toFixed(1)}) exceed 70 hour/8 day limit. Driver needs a 34 hour restart before this trip.`,
    );
  }

  const summary: TripSummary = {
    totalDays,
    totalDrivingHours: parseFloat(totalDrivingHours.toFixed(2)),
    totalOnDutyHours: parseFloat(totalOnDutyHours.toFixed(2)),
    totalDistanceMiles: parseFloat(state.cumulativeMiles.toFixed(1)),
    hosCompliant: warnings.length === 0,
    warnings,
    fuelStops: stopCounts.fuel,
    restStops: stopCounts.rest,
    breakStops: stopCounts.break,
  };

  return { stops, eldLogs, summary };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface CountRefs {
  fuelStopsRef: { count: number };
  restStopsRef: { count: number };
  breakStopsRef: { count: number };
}

function driveSegment(
  state: DriverState,
  timeline: TimelineEntry[],
  stops: Stop[],
  warnings: string[],
  segment: RouteSegment,
  destLocation: string,
  _refs: CountRefs,
): void {
  let remainingMiles = segment.distanceMiles;
  let segmentMilesDriven = 0;

  while (remainingMiles > 0.01) {
    // Check 70-hour cycle
    if (state.cycleHoursUsed >= HOS.MAX_CYCLE_HOURS) {
      warnings.push(
        "70 hour/8-day cycle limit reached. Driver cannot continue without a 34 hour restart.",
      );
      break;
    }

    // Check if rest is needed before we can drive at all
    if (
      state.shiftDrivingHours >= HOS.MAX_DRIVING_PER_SHIFT ||
      state.shiftOnDutyHours >= HOS.MAX_ON_DUTY_WINDOW
    ) {
      insertRest(state, timeline, stops, segment, segmentMilesDriven);
    }

    // Check if 30-min break is needed
    if (state.breakDrivingHours >= HOS.BREAK_THRESHOLD) {
      insertBreak(state, timeline, stops, segment, segmentMilesDriven);
    }

    // How far can we drive before hitting a limit?
    const maxDriveBeforeShiftLimit = HOS.MAX_DRIVING_PER_SHIFT - state.shiftDrivingHours;
    const maxDriveBeforeWindowLimit = HOS.MAX_ON_DUTY_WINDOW - state.shiftOnDutyHours;
    const maxDriveBeforeBreak = HOS.BREAK_THRESHOLD - state.breakDrivingHours;
    const maxDriveHours = Math.min(
      maxDriveBeforeShiftLimit,
      maxDriveBeforeWindowLimit,
      maxDriveBeforeBreak,
    );

    const maxDriveMiles = maxDriveHours * HOS.AVG_SPEED_MPH;

    // How far until next fuel stop?
    const milesUntilFuel = HOS.FUEL_INTERVAL_MILES - state.milesSinceLastFuel;

    // Drive the minimum of: remaining, max before HOS limit, miles until fuel
    const milesThisBlock = Math.min(remainingMiles, maxDriveMiles, milesUntilFuel);

    if (milesThisBlock <= 0) break;

    const hoursThisBlock = milesThisBlock / HOS.AVG_SPEED_MPH;
    const blockStart = state.currentWallHour;
    const blockEnd = state.currentWallHour + hoursThisBlock;

    // Get position at start and end of block
    const totalSegDist = segment.distanceMiles;
    const startCoords = interpolatePolyline(segment.polyline, totalSegDist, segmentMilesDriven);
    const endCoords = interpolatePolyline(segment.polyline, totalSegDist, segmentMilesDriven + milesThisBlock);

    // Use midpoint location description
    const midMiles = segmentMilesDriven + milesThisBlock / 2;
    const midLocation = locationAtMiles(midMiles, totalSegDist, segment.fromLocation, destLocation);

    timeline.push({
      status: "driving",
      startWallHour: blockStart,
      endWallHour: blockEnd,
      location: midLocation,
      lat: startCoords[0],
      lng: startCoords[1],
      cumulativeMiles: state.cumulativeMiles + segmentMilesDriven,
      notes: `Driving: ${segment.fromLocation} → ${destLocation}`,
    });

    // Update state
    state.currentWallHour = blockEnd;
    state.shiftDrivingHours += hoursThisBlock;
    state.shiftOnDutyHours += hoursThisBlock;
    state.breakDrivingHours += hoursThisBlock;
    state.cycleHoursUsed += hoursThisBlock;
    state.milesSinceLastFuel += milesThisBlock;
    segmentMilesDriven += milesThisBlock;
    remainingMiles -= milesThisBlock;

    // Fuel stop if needed
    if (state.milesSinceLastFuel >= HOS.FUEL_INTERVAL_MILES) {
      const fuelCoords = interpolatePolyline(segment.polyline, totalSegDist, segmentMilesDriven);
      const fuelLocation = locationAtMiles(segmentMilesDriven, totalSegDist, segment.fromLocation, destLocation);
      insertFuelStop(state, timeline, stops, fuelCoords, fuelLocation, state.cumulativeMiles + segmentMilesDriven);
    }
  }

  state.cumulativeMiles += segmentMilesDriven;
}

function insertRest(
  state: DriverState,
  timeline: TimelineEntry[],
  stops: Stop[],
  segment: RouteSegment,
  segmentMilesDriven: number,
): void {
  const coords = interpolatePolyline(segment.polyline, segment.distanceMiles, segmentMilesDriven);
  const location = locationAtMiles(segmentMilesDriven, segment.distanceMiles, segment.fromLocation, segment.toLocation);
  const cumMiles = state.cumulativeMiles + segmentMilesDriven;

  const reason =
    state.shiftDrivingHours >= HOS.MAX_DRIVING_PER_SHIFT
      ? "11 hour driving limit reached"
      : "14 hour on-duty window reached";

  timeline.push({
    status: "sleeperBerth",
    startWallHour: state.currentWallHour,
    endWallHour: state.currentWallHour + HOS.MIN_OFF_DUTY_REST,
    location,
    lat: coords[0],
    lng: coords[1],
    cumulativeMiles: cumMiles,
    stopType: "rest",
    notes: `Mandatory 10 hour rest — ${reason}`,
  });

  stops.push({
    type: "rest",
    location,
    lat: coords[0],
    lng: coords[1],
    arrivalDay: wallHourToDay(state.currentWallHour),
    arrivalHour: wallHourToTimeOfDay(state.currentWallHour),
    durationHours: HOS.MIN_OFF_DUTY_REST,
    cumulativeMiles: cumMiles,
    notes: `Mandatory 10 hour rest — ${reason}`,
  });

  state.currentWallHour += HOS.MIN_OFF_DUTY_REST;
  state.shiftDrivingHours = 0;
  state.shiftOnDutyHours = 0;
  state.breakDrivingHours = 0;
}

function insertBreak(
  state: DriverState,
  timeline: TimelineEntry[],
  stops: Stop[],
  segment: RouteSegment,
  segmentMilesDriven: number,
): void {
  const coords = interpolatePolyline(segment.polyline, segment.distanceMiles, segmentMilesDriven);
  const location = locationAtMiles(segmentMilesDriven, segment.distanceMiles, segment.fromLocation, segment.toLocation);
  const cumMiles = state.cumulativeMiles + segmentMilesDriven;

  timeline.push({
    status: "offDuty",
    startWallHour: state.currentWallHour,
    endWallHour: state.currentWallHour + HOS.BREAK_DURATION,
    location,
    lat: coords[0],
    lng: coords[1],
    cumulativeMiles: cumMiles,
    stopType: "break",
    notes: "Mandatory 30 min break  8 hours of driving (49 CFR 395.3(a)(3)(ii))",
  });

  stops.push({
    type: "break",
    location,
    lat: coords[0],
    lng: coords[1],
    arrivalDay: wallHourToDay(state.currentWallHour),
    arrivalHour: wallHourToTimeOfDay(state.currentWallHour),
    durationHours: HOS.BREAK_DURATION,
    cumulativeMiles: cumMiles,
    notes: "Mandatory 30-min break:  8 cumulative hours driving (49 CFR 395.3(a)(3)(ii))",
  });

  state.currentWallHour += HOS.BREAK_DURATION;
  state.shiftOnDutyHours += HOS.BREAK_DURATION; // break counts against window? No — break is off-duty
  state.breakDrivingHours = 0;
}

function insertFuelStop(
  state: DriverState,
  timeline: TimelineEntry[],
  stops: Stop[],
  coords: [number, number],
  location: string,
  cumulativeMiles: number,
): void {
  timeline.push({
    status: "onDutyNotDriving",
    startWallHour: state.currentWallHour,
    endWallHour: state.currentWallHour + HOS.FUEL_STOP_DURATION,
    location,
    lat: coords[0],
    lng: coords[1],
    cumulativeMiles,
    stopType: "fuel",
    notes: "Fuel stop — required every 1,000 miles",
  });

  stops.push({
    type: "fuel",
    location,
    lat: coords[0],
    lng: coords[1],
    arrivalDay: wallHourToDay(state.currentWallHour),
    arrivalHour: wallHourToTimeOfDay(state.currentWallHour),
    durationHours: HOS.FUEL_STOP_DURATION,
    cumulativeMiles,
    notes: "Fuel stop:  required at least every 1,000 miles",
  });

  state.currentWallHour += HOS.FUEL_STOP_DURATION;
  state.shiftOnDutyHours += HOS.FUEL_STOP_DURATION;
  state.cycleHoursUsed += HOS.FUEL_STOP_DURATION;
  state.milesSinceLastFuel = 0;
}

function addOnDutyStop(
  state: DriverState,
  timeline: TimelineEntry[],
  stops: Stop[],
  opts: {
    stopType: StopType;
    location: string;
    lat: number;
    lng: number;
    durationHours: number;
    notes: string;
  },
): void {
  const { stopType, location, lat, lng, durationHours, notes } = opts;

  timeline.push({
    status: "onDutyNotDriving",
    startWallHour: state.currentWallHour,
    endWallHour: state.currentWallHour + durationHours,
    location,
    lat,
    lng,
    cumulativeMiles: state.cumulativeMiles,
    stopType,
    notes,
  });

  stops.push({
    type: stopType,
    location,
    lat,
    lng,
    arrivalDay: wallHourToDay(state.currentWallHour),
    arrivalHour: wallHourToTimeOfDay(state.currentWallHour),
    durationHours,
    cumulativeMiles: state.cumulativeMiles,
    notes,
  });

  state.currentWallHour += durationHours;
  state.shiftOnDutyHours += durationHours;
  state.cycleHoursUsed += durationHours;
}

// ── ELD Log Builder ──────────────────────────────────────────────────────────

function buildEldLogs(
  timeline: TimelineEntry[],
  totalDays: number,
  totalTripMiles: number,
  initialCycleHours: number,
): EldLog[] {
  const logs: EldLog[] = [];
  const today = new Date();

  let cumulativeCycleHours = initialCycleHours;
  let cumulativeMilesByDay = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayStart = (day - 1) * 24;
    const dayEnd = day * 24;

    // Get all timeline entries that overlap this day
    const dayEntries = timeline.filter(
      (e) => e.endWallHour > dayStart && e.startWallHour < dayEnd,
    );

    if (dayEntries.length === 0) continue;

    // Clip entries to day boundaries and convert to ELD format
    const eldEntries: DutyStatusEntry[] = [];
    let prevEnd = 0;

    for (const entry of dayEntries) {
      const clippedStart = Math.max(entry.startWallHour, dayStart) - dayStart;
      const clippedEnd = Math.min(entry.endWallHour, dayEnd) - dayStart;

      // Fill gap with off duty if needed
      if (clippedStart > prevEnd + 0.01) {
        eldEntries.push({
          status: "offDuty",
          startHour: parseFloat(prevEnd.toFixed(4)),
          endHour: parseFloat(clippedStart.toFixed(4)),
          location: eldEntries.length > 0 ? eldEntries[eldEntries.length - 1].location : "",
        });
      }

      eldEntries.push({
        status: entry.status,
        startHour: parseFloat(clippedStart.toFixed(4)),
        endHour: parseFloat(clippedEnd.toFixed(4)),
        location: entry.location,
      });

      prevEnd = clippedEnd;
    }

    // Fill to end of day
    if (prevEnd < 24 - 0.01) {
      eldEntries.push({
        status: "offDuty",
        startHour: parseFloat(prevEnd.toFixed(4)),
        endHour: 24,
        location: dayEntries[dayEntries.length - 1]?.location ?? "",
      });
    }

    // Calculate totals
    const totalOffDuty = eldEntries
      .filter(e => e.status === "offDuty")
      .reduce((s, e) => s + (e.endHour - e.startHour), 0);
    const totalSleeper = eldEntries
      .filter(e => e.status === "sleeperBerth")
      .reduce((s, e) => s + (e.endHour - e.startHour), 0);
    const totalDriving = eldEntries
      .filter(e => e.status === "driving")
      .reduce((s, e) => s + (e.endHour - e.startHour), 0);
    const totalOnDutyND = eldEntries
      .filter(e => e.status === "onDutyNotDriving")
      .reduce((s, e) => s + (e.endHour - e.startHour), 0);

    const onDutyToday = totalDriving + totalOnDutyND;
    cumulativeCycleHours += onDutyToday;

    // Miles for this day
    const dayEndEntries = dayEntries.filter(e => e.status === "driving");
    const milesThisDay = dayEndEntries.reduce((sum, e) => {
      const fraction = (Math.min(e.endWallHour, dayEnd) - Math.max(e.startWallHour, dayStart)) /
        (e.endWallHour - e.startWallHour || 1);
      const segMiles = (e.endWallHour - e.startWallHour) * HOS.AVG_SPEED_MPH * fraction;
      return sum + segMiles;
    }, 0);
    cumulativeMilesByDay += milesThisDay;

    // Start/end location
    const startEntry = dayEntries[0];
    const endEntry = dayEntries[dayEntries.length - 1];

    // Generate remarks
    const stops = dayEntries
      .filter(e => e.stopType && e.stopType !== "start")
      .map(e => {
        const timeStr = formatHour(Math.max(e.startWallHour, dayStart) - dayStart);
        return `${timeStr} — ${e.stopType}: ${e.location}`;
      });

    const remarks = stops.length > 0
      ? stops.join("; ")
      : `Driving — ${startEntry.location} to ${endEntry.location}`;

    // Date calculation
    const logDate = new Date(today);
    logDate.setDate(today.getDate() + (day - 1));

    logs.push({
      date: logDate.toISOString().split("T")[0],
      dayNumber: day,
      startLocation: startEntry.location,
      endLocation: endEntry.location,
      totalMilesDriving: parseFloat(milesThisDay.toFixed(1)),
      totalMilesToday: parseFloat(cumulativeMilesByDay.toFixed(1)),
      entries: eldEntries,
      remarks,
      totalHoursOffDuty: parseFloat(totalOffDuty.toFixed(2)),
      totalHoursSleeperBerth: parseFloat(totalSleeper.toFixed(2)),
      totalHoursDriving: parseFloat(totalDriving.toFixed(2)),
      totalHoursOnDutyNotDriving: parseFloat(totalOnDutyND.toFixed(2)),
      recap: {
        totalOnDutyToday: parseFloat(onDutyToday.toFixed(2)),
        totalOnDutyLast7Days: parseFloat((cumulativeCycleHours - initialCycleHours).toFixed(2)),
        totalOnDutyAvailableTomorrow: parseFloat(
          Math.max(0, HOS.MAX_CYCLE_HOURS - cumulativeCycleHours).toFixed(2),
        ),
        cycleHoursUsed: parseFloat(cumulativeCycleHours.toFixed(2)),
        cycleHoursRemaining: parseFloat(
          Math.max(0, HOS.MAX_CYCLE_HOURS - cumulativeCycleHours).toFixed(2),
        ),
      },
    });
  }

  return logs;
}

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
