import { describe, expect, it } from 'vitest';
import { destination, haversine } from '../src/core/geo';
import { seededRandom } from '../src/core/simulate';
import { FixSmoother, type Fix } from '../src/core/smoothing';

const HOME = { lat: 41.5886, lng: -93.6383 };

function noisyFixes(count: number, noise: number, seed = 7): Fix[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    ...destination(HOME, rand() * 360, Math.sqrt(rand()) * noise),
    accuracy: noise,
    timestamp: i * 1000,
  }));
}

describe('FixSmoother', () => {
  it('adopts the first fix as is', () => {
    const s = new FixSmoother();
    const r = s.push({ ...HOME, accuracy: 10, timestamp: 0 });
    expect(r.accepted).toBe(true);
    if (r.accepted) expect(haversine(r.fix, HOME)).toBe(0);
  });

  it('pulls a jittery stationary walker much closer to the truth than the raw fixes', () => {
    const fixes = noisyFixes(60, 20);
    const s = new FixSmoother();
    const rawErr: number[] = [];
    const smoothErr: number[] = [];
    fixes.forEach((f, i) => {
      const r = s.push(f);
      if (i >= 10 && r.accepted) {
        rawErr.push(haversine(f, HOME));
        smoothErr.push(haversine(r.fix, HOME));
      }
    });
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(smoothErr)).toBeLessThan(mean(rawErr) / 2);
  });

  it('ignores fixes that are too vague', () => {
    const s = new FixSmoother({ maxAccuracy: 50 });
    expect(s.push({ ...HOME, accuracy: 400, timestamp: 0 })).toEqual({ accepted: false, reason: 'inaccurate' });
    expect(s.current).toBeNull();
  });

  it('rejects an impossible jump, then resets after repeated agreement', () => {
    const s = new FixSmoother({ resetAfterOutliers: 3 });
    s.push({ ...HOME, accuracy: 5, timestamp: 0 });
    const far = destination(HOME, 90, 2_000); // 2 km in one second
    expect(s.push({ ...far, accuracy: 5, timestamp: 1000 })).toEqual({ accepted: false, reason: 'outlier' });
    expect(s.push({ ...far, accuracy: 5, timestamp: 2000 })).toEqual({ accepted: false, reason: 'outlier' });
    const third = s.push({ ...far, accuracy: 5, timestamp: 3000 });
    expect(third.accepted).toBe(true);
    if (third.accepted) expect(haversine(third.fix, far)).toBeLessThan(1);
  });

  it('follows a steady walk without lagging more than a few meters', () => {
    const s = new FixSmoother();
    let last: Fix | null = null;
    let truth = HOME;
    for (let i = 0; i < 60; i++) {
      truth = destination(HOME, 270, i * 1.4);
      const r = s.push({ ...truth, accuracy: 5, timestamp: i * 1000 });
      if (r.accepted) last = r.fix;
    }
    expect(last).not.toBeNull();
    expect(haversine(last!, truth)).toBeLessThan(6);
  });

  it('drops fixes from the past', () => {
    const s = new FixSmoother();
    s.push({ ...HOME, accuracy: 5, timestamp: 5000 });
    expect(s.push({ ...HOME, accuracy: 5, timestamp: 1000 })).toEqual({ accepted: false, reason: 'stale' });
  });
});
