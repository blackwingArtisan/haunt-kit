import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@haunt-kit/template/adapters';
import { demoDraft, shareableHunt } from '../src/hunt';
import { encodeHunt, huntId } from '../src/hunt-codec';
import { Leaderboard } from '../src/leaderboard';
import { decodeResult, encodeResult, MAX_RESULT_CODE_LENGTH, resultUrl, ResultCodeError, type ResultPayload } from '../src/result-codec';
import { DUPLICATE_MESSAGE, inspectResult, listSharedHunts, rememberSharedHunt, submitResult, WRONG_HUNT_MESSAGE } from '../src/result-board';
import { parseHash } from '../src/useHashRoute';

const result = (extra: Partial<ResultPayload> = {}): ResultPayload => ({
  huntId: 'a1b2c3d4e5',
  player: 'Team Cauldron',
  elapsedMs: 312_000,
  hints: 1,
  wrongAnswers: 2,
  assisted: 1,
  finishedAt: Date.UTC(2026, 9, 31, 19, 30),
  ...extra,
});

const base64Json = (code: string) => atob(code.slice(1).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length - 1 + 3) % 4));

describe('result links', () => {
  it('round-trips a result through a compressed link', async () => {
    const code = await encodeResult(result());
    expect(code.startsWith('1')).toBe(true);
    expect(code).toMatch(/^[0-9A-Za-z_-]+$/);
    expect(await decodeResult(code)).toEqual(result());
  });

  it('also works uncompressed, for browsers without CompressionStream', async () => {
    const code = await encodeResult(result(), { compress: false });
    expect(code.startsWith('0')).toBe(true);
    expect(await decodeResult(code)).toEqual(result());
  });

  it('stays far below 2,000 characters, even with the longest name', async () => {
    const code = await encodeResult(result({ player: 'W'.repeat(40) }));
    expect(code.length).toBeLessThan(300);
    expect(resultUrl('https://example.com/spook-hunt/?speed=20#/play/abc', code).length).toBeLessThan(2000);
    expect(MAX_RESULT_CODE_LENGTH).toBeLessThan(2000);
  });

  it('puts the link in the URL hash and drops the query', async () => {
    const url = resultUrl('https://example.com/hunt/?speed=20#/play/abc', 'xyz');
    expect(url).toBe('https://example.com/hunt/#/result/xyz');
    expect(parseHash('#/result/xyz')).toEqual({ name: 'result', code: 'xyz' });
  });

  it('carries no answers, clues or coordinates', async () => {
    const shared = await shareableHunt(demoDraft(), 'pepper');
    const huntCode = await encodeHunt(shared);
    const payload = result({ huntId: await huntId(huntCode) });
    for (const compress of [true, false]) {
      const code = await encodeResult(payload, { compress });
      const text = compress ? code : base64Json(code);
      const everything = `${code}\n${text}`;
      expect(everything).not.toMatch(/orange|bat|ribbon|Crooked|Whispering/i);
      for (const stop of shared.stops) {
        expect(everything).not.toContain(String(stop.lat));
        expect(everything).not.toContain(String(stop.lng));
      }
      for (const digest of shared.stops.flatMap((s) => s.answerDigests ?? [])) expect(everything).not.toContain(digest);
      expect(everything).not.toContain(huntCode);
    }
    // The uncompressed JSON holds exactly the eight agreed fields.
    expect(JSON.parse(base64Json(await encodeResult(payload, { compress: false })))).toHaveLength(8);
  });

  it('rejects damaged, foreign, oversized and out-of-range links with a readable error', async () => {
    const good = await encodeResult(result());
    const cases = [
      '',
      good.slice(0, -6),
      `${good}!!`,
      `9${good.slice(1)}`,
      '1ThisIsNotAResult',
      'x'.repeat(MAX_RESULT_CODE_LENGTH + 1),
      `0${btoa('{"nope":1}')}`,
      `0${btoa('[1,"a1b2c3d4e5","Team",1,0,0,0]')}`, // seven fields
      `0${btoa('[1,"a1b2c3d4e5","Team",1,0,0,0,1788000000000,"orange"]')}`, // an extra field
    ];
    for (const bad of cases) await expect(decodeResult(bad)).rejects.toBeInstanceOf(ResultCodeError);
    const encode = (r: unknown[]) => `0${btoa(JSON.stringify(r)).replace(/=+$/, '')}`;
    const ok = [1, 'a1b2c3d4e5', 'Team', 1000, 0, 0, 0, 1788000000000];
    const variants: unknown[][] = [
      [1, 'NOT-A-HUNT-ID', ...ok.slice(2)],
      [1, ok[1], '', ...ok.slice(3)],
      [1, ok[1], ok[2], -5, ...ok.slice(4)],
      [1, ok[1], ok[2], 1.5, ...ok.slice(4)],
      [1, ok[1], ok[2], ok[3], 0, 0, 0, 5],
      [1, ok[1], ok[2], ok[3], -1, 0, 0, ok[7]],
      [1, ok[1], 'x'.repeat(41), ...ok.slice(3)],
    ];
    for (const v of variants) await expect(decodeResult(encode(v))).rejects.toBeInstanceOf(ResultCodeError);
    await expect(decodeResult(encode(ok))).resolves.toMatchObject({ player: 'Team', elapsedMs: 1000 });
  });

  it('refuses to encode a result that is out of range', async () => {
    await expect(encodeResult(result({ player: '  ' }))).rejects.toBeInstanceOf(ResultCodeError);
    await expect(encodeResult(result({ huntId: 'x' }))).rejects.toBeInstanceOf(ResultCodeError);
  });
});

describe('adding a result to the host leaderboard', () => {
  const shared = (store: MemoryStore, id = 'a1b2c3d4e5') => rememberSharedHunt(store, { id, title: 'The Pumpkin Patrol', sharedAt: 1 });

  it('adds a result for a hunt this device shared, with every field intact', () => {
    const store = new MemoryStore();
    shared(store);
    expect(inspectResult(store, result())).toEqual({ status: 'ready', title: 'The Pumpkin Patrol' });
    const outcome = submitResult(store, result());
    expect(outcome.ok).toBe(true);
    const [run] = new Leaderboard(store, 'a1b2c3d4e5').list();
    expect(run).toEqual({ player: 'Team Cauldron', elapsedMs: 312_000, hints: 1, wrongAnswers: 2, assisted: 1, finishedAt: result().finishedAt });
  });

  it('refuses a result for a hunt this device did not share, and leaves every leaderboard alone', () => {
    const store = new MemoryStore();
    shared(store, 'ffffffffff');
    const outcome = submitResult(store, result());
    expect(outcome).toEqual({ ok: false, reason: 'wrong-hunt', message: WRONG_HUNT_MESSAGE });
    expect(new Leaderboard(store, 'a1b2c3d4e5').list()).toEqual([]);
    expect(new Leaderboard(store, 'ffffffffff').list()).toEqual([]);
  });

  it('refuses the same result twice, but accepts a different run by the same player', () => {
    const store = new MemoryStore();
    shared(store);
    expect(submitResult(store, result()).ok).toBe(true);
    expect(submitResult(store, result())).toEqual({ ok: false, reason: 'duplicate', message: DUPLICATE_MESSAGE });
    expect(submitResult(store, result({ finishedAt: result().finishedAt + 60_000 })).ok).toBe(true);
    expect(new Leaderboard(store, 'a1b2c3d4e5').list()).toHaveLength(2);
  });

  it('keeps the list of shared hunts tidy and survives junk in storage', () => {
    const store = new MemoryStore();
    store.set('shared-hunts', '{"nope":true}');
    expect(listSharedHunts(store)).toEqual([]);
    shared(store);
    shared(store);
    expect(listSharedHunts(store)).toHaveLength(1);
  });
});
