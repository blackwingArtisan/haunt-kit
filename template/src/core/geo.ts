/** Geometry on the WGS84 sphere approximation used by consumer GPS. */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Mean Earth radius in meters (IUGG). */
export const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in meters between two points (haversine formula). */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from a to b in degrees clockwise from true north, 0 to 360. */
export function bearing(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** The point reached by travelling `meters` from `from` on initial bearing `deg`. */
export function destination(from: LatLng, deg: number, meters: number): LatLng {
  const δ = meters / EARTH_RADIUS_M;
  const θ = toRad(deg);
  const φ1 = toRad(from.lat);
  const λ1 = toRad(from.lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

/** Linear interpolation between two nearby points (fine for walking-scale segments). */
export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'] as const;
export type CompassWord = (typeof COMPASS)[number];

/** Eight-point compass word for a bearing, e.g. 92 -> "east". */
export function compassWord(deg: number): CompassWord {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

/** Human distance: "40 m", "350 m", "1.2 km". Rounds to steps a walker can use. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return 'unknown distance';
  if (meters < 1000) {
    const step = meters < 100 ? 5 : 10;
    return `${Math.max(0, Math.round(meters / step) * step)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Length of a polyline in meters. */
export function pathLength(points: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1]!, points[i]!);
  return total;
}
