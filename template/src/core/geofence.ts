import { haversine } from './geo';
import { availability, isFinished, progressCounts } from './rules';
import { TRAIL_LIMIT, type SessionState, type StopState, type UnlockMethod } from './session';
import type { Fix } from './smoothing';
import { isAfterSunset, nextSunset } from './sun';
import type { Tour } from './tour';

export interface GeofenceOptions {
  /** Consecutive fixes inside the radius before a stop counts as reached. Default 2. */
  dwellFixes?: number;
  /** A walker counts as having left once farther than radius * exitFactor. Default 1.3. */
  exitFactor?: number;
  /** Minimum spacing in meters between trail points. Default 12. */
  trailSpacing?: number;
  /**
   * Treat every `wakesAfter: 'sunset'` stop as awake. Simulated walks set it,
   * because their clock is not the walker's real evening.
   */
  ignoreWake?: boolean;
}

/** Options for the steps that settle a walker already standing in a stop. */
export type SettleOptions = Pick<GeofenceOptions, 'ignoreWake'>;

export type EngineEvent =
  | { type: 'enter'; stopId: string; distance: number }
  | { type: 'exit'; stopId: string }
  | { type: 'unlock'; stopId: string; by: UnlockMethod }
  | { type: 'locked-nearby'; stopId: string; waitingFor: string[] }
  /** Reached by GPS before sunset; `wakesAt` is the next sunset there (null in polar summer). */
  | { type: 'sleeping'; stopId: string; wakesAt: number | null }
  | { type: 'solved'; stopId: string }
  | { type: 'complete' };

export interface StepResult {
  state: SessionState;
  events: EngineEvent[];
}

/**
 * Feeds one smoothed position into the walk. Pure: returns a new state and the
 * events that happened, never mutates the input.
 *
 * Entering uses the plain radius; leaving needs radius * exitFactor. That gap
 * (hysteresis) plus the dwell count keeps a walker at the edge of a circle
 * from flickering in and out.
 */
export function stepFix(tour: Tour, prev: SessionState, fix: Fix, options: GeofenceOptions = {}): StepResult {
  const dwell = Math.max(1, options.dwellFixes ?? 2);
  const exitFactor = Math.max(1, options.exitFactor ?? 1.3);
  const spacing = options.trailSpacing ?? 12;

  let state: SessionState = {
    ...prev,
    stops: { ...prev.stops },
    lastFix: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, timestamp: fix.timestamp },
    startedAt: prev.startedAt ?? fix.timestamp,
    trail: extendTrail(prev.trail, fix, spacing),
  };
  const events: EngineEvent[] = [];

  for (const stop of tour.stops) {
    const before = state.stops[stop.id]!;
    const distance = haversine(fix, stop.position);
    const s: StopState = { ...before };

    if (distance <= stop.radius) {
      s.insideCount = before.insideCount + 1;
      if (!before.inside && s.insideCount >= dwell) {
        s.inside = true;
        events.push({ type: 'enter', stopId: stop.id, distance });
      }
    } else if (distance > stop.radius * exitFactor) {
      if (before.inside) events.push({ type: 'exit', stopId: stop.id });
      s.inside = false;
      s.insideCount = 0;
    } else if (!before.inside) {
      // In the hysteresis band without having entered: the dwell count restarts.
      s.insideCount = 0;
    }
    state.stops[stop.id] = s;
  }

  // Unlock in a second pass, in tour order, so a walker standing in two
  // overlapping circles unlocks them in the order the rules allow.
  const entered = new Set(events.filter((e) => e.type === 'enter').map((e) => e.stopId));
  const settled = settleInside(tour, state, fix.timestamp, entered, options);
  state = settled.state;
  events.push(...settled.events);
  return { state, events };
}

/**
 * Unlocks a stop if the ordering rules allow it. Used for GPS arrivals and for
 * the accessible stop list ("visit from here").
 */
export function unlock(tour: Tour, prev: SessionState, stopId: string, by: UnlockMethod, now: number): StepResult {
  const stop = tour.stops.find((s) => s.id === stopId);
  if (!stop) throw new Error(`Unknown stop "${stopId}"`);
  if (prev.stops[stopId]?.unlockedAt !== undefined) return { state: prev, events: [] };

  const avail = availability(tour, prev, stopId);
  if (!avail.ok) return { state: prev, events: [{ type: 'locked-nearby', stopId, waitingFor: avail.waitingFor }] };

  let state: SessionState = {
    ...prev,
    startedAt: prev.startedAt ?? now,
    stops: { ...prev.stops, [stopId]: { ...prev.stops[stopId]!, unlockedAt: now, unlockedBy: by } },
  };
  const events: EngineEvent[] = [{ type: 'unlock', stopId, by }];
  const done = finishIfComplete(tour, state, now);
  state = done.state;
  events.push(...done.events);
  return { state, events };
}

/**
 * Unlocks every stop the walker is standing in that the rules now allow, in
 * tour order. Runs after each fix, and after a list unlock or a solved
 * challenge, so a walker already standing at a stop that was waiting gets it
 * at once instead of having to leave and come back.
 * A `wakesAfter: 'sunset'` stop stays asleep to GPS until sunset at the stop;
 * the list still opens it, so no one is ever locked out.
 * `locked-nearby` and `sleeping` are only reported for stops in `justEntered`.
 */
export function settleInside(
  tour: Tour,
  prev: SessionState,
  now: number,
  justEntered: ReadonlySet<string> = new Set(),
  options: SettleOptions = {},
): StepResult {
  let state = prev;
  const events: EngineEvent[] = [];
  for (const stop of tour.stops) {
    const s = state.stops[stop.id]!;
    if (!s.inside || s.unlockedAt !== undefined) continue;
    if (stop.wakesAfter === 'sunset' && !options.ignoreWake && !isAfterSunset(now, stop.position)) {
      if (justEntered.has(stop.id)) events.push({ type: 'sleeping', stopId: stop.id, wakesAt: nextSunset(now, stop.position) });
      continue;
    }
    const result = unlock(tour, state, stop.id, 'gps', now);
    state = result.state;
    for (const e of result.events) if (e.type !== 'locked-nearby' || justEntered.has(stop.id)) events.push(e);
  }
  return { state, events };
}

/** Records a correct answer for an unlocked stop's challenge. */
export function markSolved(tour: Tour, prev: SessionState, stopId: string, now: number, options: SettleOptions = {}): StepResult {
  const stop = tour.stops.find((s) => s.id === stopId);
  if (!stop?.challenge) throw new Error(`Stop "${stopId}" has no challenge`);
  const s = prev.stops[stopId]!;
  if (s.unlockedAt === undefined || s.solvedAt !== undefined) return { state: prev, events: [] };
  let state: SessionState = { ...prev, stops: { ...prev.stops, [stopId]: { ...s, solvedAt: now } } };
  const events: EngineEvent[] = [{ type: 'solved', stopId }];
  const done = finishIfComplete(tour, state, now);
  state = done.state;
  events.push(...done.events);
  const settled = settleInside(tour, state, now, new Set(), options);
  return { state: settled.state, events: [...events, ...settled.events] };
}

/** Records a wrong answer, or that the walker asked for the hint. */
export function recordAttempt(prev: SessionState, stopId: string, kind: 'wrong' | 'hint'): SessionState {
  const s = prev.stops[stopId];
  if (!s) throw new Error(`Unknown stop "${stopId}"`);
  const next = kind === 'wrong' ? { ...s, attempts: s.attempts + 1 } : { ...s, hintUsed: true };
  return { ...prev, stops: { ...prev.stops, [stopId]: next } };
}

function finishIfComplete(tour: Tour, state: SessionState, now: number): StepResult {
  if (state.completedAt !== undefined) return { state, events: [] };
  if (!progressCounts(tour, state).complete) return { state, events: [] };
  return { state: { ...state, completedAt: now }, events: [{ type: 'complete' }] };
}

function extendTrail(trail: SessionState['trail'], fix: Fix, spacing: number) {
  const last = trail[trail.length - 1];
  if (last && haversine(last, fix) < spacing) return trail;
  const next = [...trail, { lat: fix.lat, lng: fix.lng }];
  return next.length > TRAIL_LIMIT ? next.slice(next.length - TRAIL_LIMIT) : next;
}

export { isFinished };
