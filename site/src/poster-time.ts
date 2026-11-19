import type { LatLng } from '@haunt-kit/template/core';

/** Both demo places are in Des Moines, so the poster prints Des Moines time wherever it is opened. */
export const POSTER_TIME_ZONE = 'America/Chicago';

/**
 * The poster's "Sunset tonight" line for `at`, on the local calendar day of `now`
 * in `timeZone`. Looks for the first sunset after local noon, so the line stays
 * the same all day, including after dark.
 */
export function posterSunset(
  now: number,
  at: LatLng,
  nextSunset: (time: number, at: LatLng) => number | null,
  timeZone = POSTER_TIME_ZONE,
): string {
  const noon = localNoon(now, timeZone);
  const sunset = nextSunset(noon, at);
  if (sunset === null) return 'No sunset today';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(sunset);
}

/** The instant of 12:00 on `now`'s calendar day in `timeZone`. */
export function localNoon(now: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  // Noon as if it were UTC, corrected by the zone's offset at that moment.
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, 12);
  const offset = zoneOffset(asUtc, timeZone);
  return asUtc - offset;
}

function zoneOffset(time: number, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(time)
      .map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return local - time;
}
