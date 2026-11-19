import { readJson, writeJson, type KeyValueStore } from '@haunt-kit/template/adapters';

export interface Run {
  player: string;
  /** Finish time in ms from start. */
  elapsedMs: number;
  hints: number;
  wrongAnswers: number;
  /** Stops unlocked from the list instead of by walking there. */
  assisted: number;
  finishedAt: number;
}

/** Each hint costs 30 seconds, each wrong answer 10. Assisted stops are shown, not penalized. */
export const HINT_PENALTY_MS = 30_000;
export const WRONG_PENALTY_MS = 10_000;

export function score(run: Run): number {
  return run.elapsedMs + run.hints * HINT_PENALTY_MS + run.wrongAnswers * WRONG_PENALTY_MS;
}

export function rank(runs: readonly Run[]): Run[] {
  return [...runs].sort((a, b) => score(a) - score(b) || a.finishedAt - b.finishedAt);
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** The leaderboard for one hunt on this device. */
export class Leaderboard {
  constructor(
    private readonly store: KeyValueStore,
    private readonly huntId: string,
  ) {}

  private get key() {
    return `leaderboard:${this.huntId}`;
  }

  list(): Run[] {
    const runs = readJson<Run[]>(this.store, this.key);
    return rank(Array.isArray(runs) ? runs.filter(isRun) : []);
  }

  add(run: Run): Run[] {
    const runs = [...this.list(), { ...run, player: run.player.trim().slice(0, 40) || 'Mystery guest' }];
    writeJson(this.store, this.key, runs.slice(-100));
    return rank(runs);
  }

  clear(): void {
    this.store.remove(this.key);
  }
}

function isRun(value: unknown): value is Run {
  const r = value as Run;
  return !!r && typeof r.player === 'string' && typeof r.elapsedMs === 'number' && typeof r.finishedAt === 'number';
}
