import type { LatLng } from './geo';
import type { Tour } from './tour';

export type UnlockMethod = 'gps' | 'list';

/** Runtime state for one stop. Everything here is serializable. */
export interface StopState {
  unlockedAt?: number;
  unlockedBy?: UnlockMethod;
  /** Set when the stop's challenge was answered correctly. */
  solvedAt?: number;
  /** Wrong answers given so far. */
  attempts: number;
  hintUsed: boolean;
  /** Hysteresis state for the geofence. */
  inside: boolean;
  insideCount: number;
}

/** Everything the engine needs to remember about a walk. Save it, reload it, carry on. */
export interface SessionState {
  version: 1;
  tourId: string;
  startedAt?: number;
  completedAt?: number;
  stops: Record<string, StopState>;
  /** Thinned trail of smoothed positions, used to lift the fog on the map. */
  trail: LatLng[];
  lastFix?: LatLng & { accuracy?: number; timestamp: number };
}

export function emptyStopState(): StopState {
  return { attempts: 0, hintUsed: false, inside: false, insideCount: 0 };
}

export function createSession(tour: Tour): SessionState {
  return {
    version: 1,
    tourId: tour.id,
    stops: Object.fromEntries(tour.stops.map((s) => [s.id, emptyStopState()])),
    trail: [],
  };
}

/** Makes a loaded session match the tour (stops added or removed since it was saved). */
export function reconcileSession(tour: Tour, saved: SessionState | null | undefined): SessionState {
  if (!saved || saved.version !== 1 || saved.tourId !== tour.id) return createSession(tour);
  const stops: Record<string, StopState> = {};
  for (const s of tour.stops) stops[s.id] = { ...emptyStopState(), ...saved.stops?.[s.id], inside: false, insideCount: 0 };
  return { ...saved, stops, trail: Array.isArray(saved.trail) ? saved.trail.slice(-TRAIL_LIMIT) : [] };
}

export const TRAIL_LIMIT = 600;
