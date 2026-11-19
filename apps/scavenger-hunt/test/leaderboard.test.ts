import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@haunt-kit/template/adapters';
import { formatDuration, Leaderboard, penaltySummary, plural, sentence, rank, runDetails, score, type Run } from '../src/leaderboard';

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

describe('finish time wording', () => {
  it('uses the right plural', () => {
    expect(plural(0, 'hint')).toBe('0 hints');
    expect(plural(1, 'hint')).toBe('1 hint');
    expect(plural(2, 'wrong answer')).toBe('2 wrong answers');
  });

  it('names the penalties that the finish time includes', () => {
    expect(penaltySummary(run('A', 30))).toBe('no penalties');
    expect(penaltySummary(run('B', 30, { wrongAnswers: 1 }))).toBe('includes +10 s for 1 wrong answer');
    expect(penaltySummary(run('C', 30, { hints: 2, wrongAnswers: 3 }))).toBe('includes +60 s for 2 hints and +30 s for 3 wrong answers');
    expect(runDetails(run('D', 30, { hints: 1, wrongAnswers: 1, assisted: 3 }))).toBe('1 hint · 1 wrong answer · 3 unlocked from the list');
    expect(runDetails(run('E', 30))).toBe('0 hints · 0 wrong answers');
    expect(sentence(penaltySummary(run('F', 30)))).toBe('No penalties.');
  });

  it('shows the same total on the finish card and the leaderboard', () => {
    // 36 s of walking plus one wrong answer is 0:46 everywhere.
    const r = run('Team Cauldron', 36, { wrongAnswers: 1 });
    expect(formatDuration(score(r))).toBe('0:46');
  });
});
