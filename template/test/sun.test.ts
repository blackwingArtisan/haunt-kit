import { describe, expect, it } from 'vitest';
import { isAfterSunset, nextSunset, solarElevation } from '../src/core/sun';

// Downtown Des Moines. Reference times are the published sunset and sunrise
// tables for Des Moines (local daylight time, UTC-5, in these months).
const DES_MOINES = { lat: 41.5868, lng: -93.625 };
const utc = (iso: string) => Date.parse(iso);
const MINUTE = 60_000;

describe('sun', () => {
  it.each([
    ['2026-10-01T12:00:00-05:00', '2026-10-01T18:55:00-05:00'],
    ['2026-10-15T12:00:00-05:00', '2026-10-15T18:33:00-05:00'],
    ['2026-10-31T12:00:00-05:00', '2026-10-31T18:10:00-05:00'],
    ['2026-06-21T12:00:00-05:00', '2026-06-21T20:52:00-05:00'],
  ])('finds the sunset after %s within two minutes of the published %s', (from, published) => {
    const sunset = nextSunset(utc(from), DES_MOINES)!;
    expect(Math.abs(sunset - utc(published))).toBeLessThan(2 * MINUTE);
  });

  it('is dark after sunset and before sunrise, light at noon', () => {
    expect(isAfterSunset(utc('2026-10-31T12:00:00-05:00'), DES_MOINES)).toBe(false);
    expect(isAfterSunset(utc('2026-10-31T18:20:00-05:00'), DES_MOINES)).toBe(true);
    expect(isAfterSunset(utc('2026-10-31T23:59:00-05:00'), DES_MOINES)).toBe(true);
    // Published sunrise on 21 June: 5:40 am.
    expect(isAfterSunset(utc('2026-06-21T05:30:00-05:00'), DES_MOINES)).toBe(true);
    expect(isAfterSunset(utc('2026-06-21T05:50:00-05:00'), DES_MOINES)).toBe(false);
  });

  it('after dark, the next sunset is tomorrow evening', () => {
    const sunset = nextSunset(utc('2026-10-31T20:00:00-05:00'), DES_MOINES)!;
    // 1 November is the first day of standard time, UTC-6; sunset falls near 5:09 pm.
    expect(sunset).toBeGreaterThan(utc('2026-11-01T16:59:00-06:00'));
    expect(sunset).toBeLessThan(utc('2026-11-01T17:19:00-06:00'));
  });

  it('peaks near 72 degrees at the June solstice noon and stays below the horizon at midnight', () => {
    const noon = solarElevation(utc('2026-06-21T13:16:00-05:00'), DES_MOINES);
    expect(noon).toBeGreaterThan(71);
    expect(noon).toBeLessThan(72.5);
    expect(solarElevation(utc('2026-06-22T01:00:00-05:00'), DES_MOINES)).toBeLessThan(-20);
  });

  it('returns null when the sun never sets (polar summer)', () => {
    expect(nextSunset(utc('2026-06-21T12:00:00Z'), { lat: 78.22, lng: 15.65 })).toBeNull();
  });
});
