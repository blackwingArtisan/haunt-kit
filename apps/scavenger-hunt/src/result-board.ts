import { readJson, writeJson, type KeyValueStore } from '@haunt-kit/template/adapters';
import { Leaderboard, type Run } from './leaderboard';
import type { ResultPayload } from './result-codec';

/**
 * Host side of "Send my time to the host". A result link names its hunt only
 * by id, so the host's device keeps a short list of the hunts it has shared and
 * accepts results for those hunts only.
 */

export interface SharedHuntEntry {
  id: string;
  title: string;
  sharedAt: number;
}

const SHARED_KEY = 'shared-hunts';
const MAX_SHARED = 50;

export function listSharedHunts(store: KeyValueStore): SharedHuntEntry[] {
  const saved = readJson<SharedHuntEntry[]>(store, SHARED_KEY);
  return Array.isArray(saved) ? saved.filter((e) => e && typeof e.id === 'string' && typeof e.title === 'string') : [];
}

/** Remembers that this device shared a hunt. Sharing the same hunt again only refreshes its entry. */
export function rememberSharedHunt(store: KeyValueStore, entry: SharedHuntEntry): void {
  const others = listSharedHunts(store).filter((e) => e.id !== entry.id);
  writeJson(store, SHARED_KEY, [...others, entry].slice(-MAX_SHARED));
}

export type ResultStatus =
  | { status: 'ready'; title: string }
  | { status: 'wrong-hunt'; message: string }
  | { status: 'duplicate'; title: string; message: string };

export const WRONG_HUNT_MESSAGE = 'This result is for a different hunt, so it was not added. Open it on the device that shared that hunt.';
export const DUPLICATE_MESSAGE = 'This run is already on the leaderboard, so it was not added again.';

export function isSameRun(a: Run, b: Run): boolean {
  return a.finishedAt === b.finishedAt && a.elapsedMs === b.elapsedMs && a.player.trim().slice(0, 40) === b.player.trim().slice(0, 40);
}

/** Says whether a result can be added on this device, and why not when it cannot. */
export function inspectResult(store: KeyValueStore, result: ResultPayload): ResultStatus {
  const hunt = listSharedHunts(store).find((h) => h.id === result.huntId);
  if (!hunt) return { status: 'wrong-hunt', message: WRONG_HUNT_MESSAGE };
  const exists = new Leaderboard(store, result.huntId).list().some((r) => isSameRun(r, result));
  return exists ? { status: 'duplicate', title: hunt.title, message: DUPLICATE_MESSAGE } : { status: 'ready', title: hunt.title };
}

export type SubmitOutcome = { ok: true; runs: Run[] } | { ok: false; reason: 'wrong-hunt' | 'duplicate'; message: string };

/** Adds a result to that hunt's leaderboard on this device, refusing another hunt's result and a repeat. */
export function submitResult(store: KeyValueStore, result: ResultPayload): SubmitOutcome {
  const state = inspectResult(store, result);
  if (state.status !== 'ready') return { ok: false, reason: state.status, message: state.message };
  const run: Run = {
    player: result.player,
    elapsedMs: result.elapsedMs,
    hints: result.hints,
    wrongAnswers: result.wrongAnswers,
    assisted: result.assisted,
    finishedAt: result.finishedAt,
  };
  return { ok: true, runs: new Leaderboard(store, result.huntId).add(run) };
}
