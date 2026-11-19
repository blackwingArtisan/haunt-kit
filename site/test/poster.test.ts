import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nextSunset } from '../../template/src/core/sun';
import { decodeHunt } from '../../apps/scavenger-hunt/src/hunt-codec';
import { localNoon, posterSunset } from '../src/poster-time';

const DES_MOINES = { lat: 41.5719, lng: -93.6441 };
const utc = (iso: string) => Date.parse(iso);

describe('poster sunset line', () => {
  it('finds local noon in Des Moines on both sides of the clock change', () => {
    expect(localNoon(utc('2026-10-31T08:00:00-05:00'), 'America/Chicago')).toBe(utc('2026-10-31T12:00:00-05:00'));
    expect(localNoon(utc('2026-11-19T22:30:00-06:00'), 'America/Chicago')).toBe(utc('2026-11-19T12:00:00-06:00'));
  });

  it("prints the day's sunset in Des Moines time, the same morning and after dark", () => {
    // Published Des Moines sunset on 31 October 2026: 6:10 pm CDT.
    const morning = posterSunset(utc('2026-10-31T07:00:00-05:00'), DES_MOINES, nextSunset);
    const night = posterSunset(utc('2026-10-31T23:00:00-05:00'), DES_MOINES, nextSunset);
    expect(morning).toMatch(/^6:(09|10|11) PM CDT$/);
    expect(night).toBe(morning);
  });

  it('says so when there is no sunset', () => {
    expect(posterSunset(Date.now(), DES_MOINES, () => null)).toBe('No sunset today');
  });
});

describe('the landing page word hunt link', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const code = /href="\.\/spook-hunt\/#\/play\/([\w-]+)" data-testid="word-hunt"/.exec(html)?.[1];

  it('is a working Spook Hunt link with three spots and hashed answers only', async () => {
    expect(code).toBeTruthy();
    const hunt = await decodeHunt(code!);
    expect(hunt.title).toBe('Friday Word Hunt');
    expect(hunt.stops).toHaveLength(3);
    for (const stop of hunt.stops) {
      expect(stop.question).toMatch(/Unscramble/);
      expect(stop.answerDigests?.length).toBeGreaterThan(0);
    }
    // The answers never travel in plain text.
    expect(JSON.stringify(hunt).toLowerCase()).not.toMatch(/"(glimmer|ancient|whisper)"/);
  });
});
