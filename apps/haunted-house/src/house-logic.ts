import type { ScanOutcome } from '@haunt-kit/template/adapters';
import { availability, progressCounts, type EngineEvent, type SessionState, type Tour } from '@haunt-kit/template/core';

/** Said on the main screen so a host and a parent know the game is invented. */
export const MADE_UP_NOTICE = 'Every room, story and ghost here is made up for this game.';

/** What the guest is told after a code is entered. Errors use the alert region, everything else the polite one. */
export interface ScanMessage {
  tone: 'info' | 'error';
  text: string;
}

const nameOf = (tour: Tour, id: string) => tour.stops.find((s) => s.id === id)?.name ?? id;

/** "the Library", "the Library and the Kitchen", "the Front Hall, the Parlor and the Kitchen". */
export function listRooms(tour: Tour, ids: readonly string[]): string {
  const names = ids.map((id) => `the ${nameOf(tour, id)}`);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Turns the outcome of one submitted code into words. The engine alone decides
 * what opens: this only reads the events it raised, and the ordering rules to
 * name the rooms a closed room is waiting for.
 */
export function describeScan(
  outcome: ScanOutcome,
  ctx: { tour: Tour; events: readonly EngineEvent[]; state: SessionState },
): ScanMessage {
  if (outcome.status === 'refused') return { tone: 'error', text: outcome.message };
  const name = nameOf(ctx.tour, outcome.stopId);
  if (outcome.status === 'repeat') return { tone: 'info', text: `You have already visited the ${name}.` };

  if (ctx.events.some((e) => e.type === 'unlock' && e.stopId === outcome.stopId)) {
    return { tone: 'info', text: `The ${name} is open. Its story is on screen.` };
  }
  const waiting = availability(ctx.tour, ctx.state, outcome.stopId);
  if (!waiting.ok) {
    return { tone: 'info', text: `The ${name} is not open yet. Visit ${listRooms(ctx.tour, waiting.waitingFor)} first.` };
  }
  return { tone: 'error', text: `The ${name} did not open. Enter its code again.` };
}

export function roomCountText(tour: Tour, state: SessionState): string {
  const { finished, total } = progressCounts(tour, state);
  return `${finished} of ${total} rooms open`;
}

/** "45 s", "4 min 12 s", "1 h 3 min". */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

export interface FinishSummary {
  rooms: number;
  elapsedMs: number;
  elapsedText: string;
}

/** The finish card's numbers: rooms opened, and the time from the first scan to the last. */
export function finishSummary(tour: Tour, state: SessionState): FinishSummary | null {
  const { complete, total } = progressCounts(tour, state);
  if (!complete) return null;
  const elapsedMs = state.startedAt !== undefined && state.completedAt !== undefined ? Math.max(0, state.completedAt - state.startedAt) : 0;
  return { rooms: total, elapsedMs, elapsedText: formatElapsed(elapsedMs) };
}
