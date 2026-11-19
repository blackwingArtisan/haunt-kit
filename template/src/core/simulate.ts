import { destination, haversine, lerp, type LatLng } from './geo';
import type { Fix } from './smoothing';

/** A waypoint on a simulated walk. `pause` is how long the walker lingers there, in seconds. */
export interface Waypoint extends LatLng {
  pause?: number;
}

interface Leg {
  from: LatLng;
  to: LatLng;
  start: number; // seconds
  walk: number; // seconds spent moving
  pause: number; // seconds lingering at `to`
}

export interface Track {
  legs: Leg[];
  start: LatLng;
  /** Total length in meters. */
  distance: number;
  /** Total duration in seconds, pauses included. */
  duration: number;
}

/** Average adult walking pace in m/s. */
export const WALKING_SPEED = 1.4;

/** Builds a time-parameterized track through the waypoints at a steady pace. */
export function buildTrack(waypoints: readonly Waypoint[], speed = WALKING_SPEED): Track {
  if (waypoints.length === 0) throw new Error('A track needs at least one waypoint');
  if (!(speed > 0)) throw new Error('Speed must be positive');
  const legs: Leg[] = [];
  let t = waypoints[0]!.pause ?? 0;
  let distance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const from = waypoints[i - 1]!;
    const to = waypoints[i]!;
    const d = haversine(from, to);
    const walk = d / speed;
    const pause = to.pause ?? 0;
    legs.push({ from, to, start: t, walk, pause });
    t += walk + pause;
    distance += d;
  }
  const start = { lat: waypoints[0]!.lat, lng: waypoints[0]!.lng };
  return { legs, start, distance, duration: t };
}

/** Where the walker is `t` seconds into the track (clamped to the ends). */
export function positionAt(track: Track, t: number): LatLng {
  if (track.legs.length === 0 || t <= 0) return track.start;
  for (const leg of track.legs) {
    const end = leg.start + leg.walk + leg.pause;
    if (t < end) {
      if (t < leg.start) return leg.from;
      const into = t - leg.start;
      return into >= leg.walk ? leg.to : lerp(leg.from, leg.to, leg.walk === 0 ? 1 : into / leg.walk);
    }
  }
  return track.legs[track.legs.length - 1]!.to;
}

/** Small deterministic PRNG (mulberry32) so jittered walks replay identically in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SampleOptions {
  /** Simulated seconds between fixes. Default 2. */
  stepSeconds?: number;
  /** GPS-like noise radius in meters. Default 0. */
  jitter?: number;
  /** Reported accuracy in meters. Default max(5, jitter * 1.5). */
  accuracy?: number;
  seed?: number;
  /** Timestamp of the first fix in ms. Default 0. */
  startTime?: number;
}

/** Generates the fixes a phone would report walking this track, one every stepSeconds. */
export function* sampleTrack(track: Track, options: SampleOptions = {}): Generator<Fix> {
  const step = options.stepSeconds ?? 2;
  const jitter = options.jitter ?? 0;
  const accuracy = options.accuracy ?? Math.max(5, jitter * 1.5);
  const rand = seededRandom(options.seed ?? 1);
  const t0 = options.startTime ?? 0;
  for (let t = 0; ; t += step) {
    const clamped = Math.min(t, track.duration);
    let p = positionAt(track, clamped);
    if (jitter > 0) p = destination(p, rand() * 360, Math.sqrt(rand()) * jitter);
    yield { ...p, accuracy, timestamp: t0 + Math.round(clamped * 1000) };
    if (clamped >= track.duration) return;
  }
}

/** A route through the given points that lingers `pause` seconds at each stop. */
export function routeWithPauses(route: readonly LatLng[], stops: readonly LatLng[], pause: number, tolerance = 15): Waypoint[] {
  return route.map((p) => ({ ...p, pause: stops.some((s) => haversine(s, p) <= tolerance) ? pause : 0 }));
}
