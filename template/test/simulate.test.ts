import { describe, expect, it } from 'vitest';
import { haversine } from '../src/core/geo';
import { buildTrack, positionAt, routeWithPauses, sampleTrack, seededRandom } from '../src/core/simulate';
import { east } from './fixtures';

describe('simulated walk', () => {
  const track = buildTrack([{ ...east(0) }, { ...east(140), pause: 10 }, { ...east(280) }], 1.4);

  it('computes distance and duration including pauses', () => {
    expect(track.distance).toBeCloseTo(280, 0);
    expect(track.duration).toBeCloseTo(100 + 10 + 100, 0);
  });

  it('interpolates along the legs and holds still during pauses', () => {
    expect(haversine(positionAt(track, 50), east(70))).toBeLessThan(0.5);
    expect(haversine(positionAt(track, 105), east(140))).toBeLessThan(0.5);
    expect(haversine(positionAt(track, 160), east(210))).toBeLessThan(0.5);
    expect(haversine(positionAt(track, 9999), east(280))).toBeLessThan(0.5);
    expect(positionAt(track, -5)).toEqual(track.start);
  });

  it('samples one fix per step and ends exactly at the finish', () => {
    const fixes = [...sampleTrack(track, { stepSeconds: 10, startTime: 1_000 })];
    expect(fixes[0]!.timestamp).toBe(1_000);
    expect(fixes.length).toBe(Math.ceil(track.duration / 10) + 1);
    expect(haversine(fixes.at(-1)!, east(280))).toBeLessThan(0.5);
  });

  it('jitter is deterministic for a seed and bounded by the radius', () => {
    const a = [...sampleTrack(track, { stepSeconds: 5, jitter: 8, seed: 42 })];
    const b = [...sampleTrack(track, { stepSeconds: 5, jitter: 8, seed: 42 })];
    expect(a).toEqual(b);
    a.forEach((f) => expect(haversine(f, positionAt(track, f.timestamp / 1000))).toBeLessThanOrEqual(8.01));
  });

  it('seeded random stays in [0, 1)', () => {
    const r = seededRandom(3);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('adds pauses at route points that are stops', () => {
    const wp = routeWithPauses([east(0), east(50), east(100)], [east(100)], 20);
    expect(wp.map((w) => w.pause)).toEqual([0, 0, 20]);
  });

  it('rejects empty tracks and bad speeds', () => {
    expect(() => buildTrack([])).toThrow();
    expect(() => buildTrack([east(0)], 0)).toThrow();
  });
});
