import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@haunt-kit/template/adapters';
import { formatDuration, Leaderboard, rank, score, type Run } from '../src/leaderboard';

const run = (player: string, seconds: number, extra: Partial<Run> = {}): Run => ({
  player,
  elapsedMs: seconds * 1000,
  hints: 0,
  wrongAnswers: 0,
  assisted: 0,
  finishedAt: seconds,
  ...extra,
});

describe('leaderboard', () => {
  it('ranks by time plus penalties', () => {
    const fast = run('Fast but hinted', 300, { hints: 2 }); // 360 s
    const steady = run('Steady', 340); // 340 s
    const sloppy = run('Sloppy', 320, { wrongAnswers: 3 }); // 350 s
    expect(score(fast)).toBe(360_000);
    expect(rank([fast, steady, sloppy]).map((r) => r.player)).toEqual(['Steady', 'Sloppy', 'Fast but hinted']);
  });

  it('keeps each hunt separate and survives junk in storage', () => {
    const store = new MemoryStore();
    const a = new Leaderboard(store, 'aaa');
    const b = new Leaderboard(store, 'bbb');
    a.add(run('Wednesday', 200));
    a.add(run('  ', 100));
    expect(a.list().map((r) => r.player)).toEqual(['Mystery guest', 'Wednesday']);
    expect(b.list()).toEqual([]);
    store.set('leaderboard:bbb', '{"oops":');
    expect(b.list()).toEqual([]);
    a.clear();
    expect(a.list()).toEqual([]);
  });

  it('formats durations', () => {
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-5)).toBe('0:00');
  });
});
