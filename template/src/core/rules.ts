import type { SessionState } from './session';
import type { Stop, Tour } from './tour';

/** A stop is finished when it is unlocked and, if it has a challenge, solved. */
export function isFinished(stop: Stop, state: SessionState): boolean {
  const s = state.stops[stop.id];
  if (!s?.unlockedAt) return false;
  return stop.challenge ? s.solvedAt !== undefined : true;
}

export function isUnlocked(stopId: string, state: SessionState): boolean {
  return state.stops[stopId]?.unlockedAt !== undefined;
}

export type Availability = { ok: true } | { ok: false; waitingFor: string[] };

/**
 * Ordering rules, applied in this order:
 * 1. sequential tours: a stop waits for the stop listed before it;
 * 2. a stop's `requires` list;
 * 3. a finale waits for every other stop.
 * `waitingFor` lists the unfinished stop ids, in tour order, so the UI can say what is missing.
 */
export function availability(tour: Tour, state: SessionState, stopId: string): Availability {
  const index = tour.stops.findIndex((s) => s.id === stopId);
  if (index < 0) throw new Error(`Unknown stop "${stopId}"`);
  const stop = tour.stops[index]!;
  const waiting = new Set<string>();

  if (tour.ordering === 'sequential' && index > 0) {
    const prev = tour.stops[index - 1]!;
    if (!isFinished(prev, state)) waiting.add(prev.id);
  }
  for (const req of stop.requires) {
    const r = tour.stops.find((s) => s.id === req);
    if (r && !isFinished(r, state)) waiting.add(r.id);
  }
  if (stop.finale) {
    for (const other of tour.stops) if (other.id !== stop.id && !isFinished(other, state)) waiting.add(other.id);
  }
  if (waiting.size === 0) return { ok: true };
  return { ok: false, waitingFor: tour.stops.filter((s) => waiting.has(s.id)).map((s) => s.id) };
}

/** Stops the walker could unlock right now, in tour order. */
export function availableStops(tour: Tour, state: SessionState): Stop[] {
  return tour.stops.filter((s) => !isUnlocked(s.id, state) && availability(tour, state, s.id).ok);
}

/**
 * The first stop the walker has found but whose question is still unanswered.
 * A simulated walker waits here, and a hunt shows this stop's question.
 */
export function awaitingAnswer(tour: Tour, state: SessionState): Stop | undefined {
  return tour.stops.find((s) => s.challenge && isUnlocked(s.id, state) && state.stops[s.id]?.solvedAt === undefined);
}

/** The stop a walker should head for: the first available one in tour order. */
export function nextTarget(tour: Tour, state: SessionState): Stop | undefined {
  return availableStops(tour, state)[0] ?? tour.stops.find((s) => isUnlocked(s.id, state) && !isFinished(s, state));
}

export function progressCounts(tour: Tour, state: SessionState) {
  const finished = tour.stops.filter((s) => isFinished(s, state)).length;
  return { finished, total: tour.stops.length, complete: finished === tour.stops.length };
}
