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

/** "1 hint", "2 hints", "0 hints". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** The penalty line under a finish time: "includes +30 s for 1 hint and +20 s for 2 wrong answers". */
export function penaltySummary(run: Pick<Run, 'hints' | 'wrongAnswers'>): string {
  const parts: string[] = [];
  if (run.hints > 0) parts.push(`+${(run.hints * HINT_PENALTY_MS) / 1000} s for ${plural(run.hints, 'hint')}`);
  if (run.wrongAnswers > 0) parts.push(`+${(run.wrongAnswers * WRONG_PENALTY_MS) / 1000} s for ${plural(run.wrongAnswers, 'wrong answer')}`);
  return parts.length ? `includes ${parts.join(' and ')}` : 'no penalties';
}

/** Capitalizes a phrase and ends it with a period: "includes +10 s" becomes "Includes +10 s." */
export function sentence(phrase: string): string {
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}.`;
}

/** "1 hint · 1 wrong answer · 3 unlocked from the list". */
export function runDetails(run: Pick<Run, 'hints' | 'wrongAnswers' | 'assisted'>): string {
  const parts = [plural(run.hints, 'hint'), plural(run.wrongAnswers, 'wrong answer')];
  if (run.assisted) parts.push(`${run.assisted} unlocked from the list`);
  return parts.join(' · ');
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
