import type { LatLng } from './geo';

/**
 * Where the sun is, worked out on the device with the NOAA solar position
 * equations. No network and no lookup tables; accurate to about a minute
 * between the polar circles, which is plenty for "come back after sunset".
 */

const RAD = Math.PI / 180;
/** The sun's centre sits this far below the horizon at sunrise and sunset (refraction plus its radius). */
export const SUNSET_ELEVATION = -0.833;

/** The sun's elevation above the horizon, in degrees, at `time` (ms since the epoch) seen from `at`. */
export function solarElevation(time: number, at: LatLng): number {
  const jd = time / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545) / 36_525;

  const meanLong = mod(280.46646 + t * (36_000.76983 + t * 0.0003032), 360);
  const meanAnomaly = 357.52911 + t * (35_999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center =
    Math.sin(meanAnomaly * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnomaly * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomaly * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const apparentLong = meanLong + center - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);
  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(apparentLong * RAD)) / RAD;

  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const equationOfTime =
    (4 / RAD) *
    (y * Math.sin(2 * meanLong * RAD) -
      2 * eccentricity * Math.sin(meanAnomaly * RAD) +
      4 * eccentricity * y * Math.sin(meanAnomaly * RAD) * Math.cos(2 * meanLong * RAD) -
      0.5 * y * y * Math.sin(4 * meanLong * RAD) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * RAD));

  const minutesUtc = mod(time, 86_400_000) / 60_000;
  const trueSolarMinutes = mod(minutesUtc + equationOfTime + 4 * at.lng, 1440);
  const hourAngle = trueSolarMinutes / 4 - 180;

  const cosZenith =
    Math.sin(at.lat * RAD) * Math.sin(declination * RAD) +
    Math.cos(at.lat * RAD) * Math.cos(declination * RAD) * Math.cos(hourAngle * RAD);
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
}

/** True between sunset and sunrise at `at`. */
export function isAfterSunset(time: number, at: LatLng): boolean {
  return solarElevation(time, at) < SUNSET_ELEVATION;
}

/**
 * The next sunset at `at` after `time`, to the second, or null when the sun
 * does not set in the next 24 hours (polar summer). Scans in 10-minute steps
 * for the moment the sun drops below the horizon, then bisects.
 */
export function nextSunset(time: number, at: LatLng): number | null {
  const step = 10 * 60_000;
  let before = time;
  let wasUp = !isAfterSunset(before, at);
  for (let t = time + step; t <= time + 86_400_000 + step; t += step) {
    const up = !isAfterSunset(t, at);
    if (wasUp && !up) return bisect(before, t, at);
    before = t;
    wasUp = up;
  }
  return null;
}

function bisect(up: number, down: number, at: LatLng): number {
  let lo = up;
  let hi = down;
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (isAfterSunset(mid, at)) hi = mid;
    else lo = mid;
  }
  return Math.round(hi / 1000) * 1000;
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
