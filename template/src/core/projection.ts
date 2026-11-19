import type { LatLng } from './geo';

/** A point in SVG user units. */
export interface Point {
  x: number;
  y: number;
}

export interface Projection {
  width: number;
  height: number;
  project(p: LatLng): Point;
  unproject(p: Point): LatLng;
  /** Ground meters per SVG unit at the map's center latitude. */
  metersPerUnit: number;
}

const TILE = 256;

/** Web Mercator world coordinates (0..256 at zoom 0), the same math slippy-map tiles use. */
export function mercator(p: LatLng): Point {
  const sin = Math.sin((Math.max(-85.05112878, Math.min(85.05112878, p.lat)) * Math.PI) / 180);
  return {
    x: TILE * (0.5 + p.lng / 360),
    y: TILE * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)),
  };
}

export function inverseMercator(p: Point): LatLng {
  const n = Math.PI - (2 * Math.PI * p.y) / TILE;
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (p.x / TILE - 0.5) * 360,
  };
}

/**
 * Fits the given points into a width x height box with padding (in SVG units),
 * keeping north up and the aspect ratio true. Pass `minSpanMeters` so a
 * one-stop hunt does not zoom in to a single pixel.
 */
export function fitProjection(
  points: readonly LatLng[],
  width: number,
  height: number,
  padding = 40,
  minSpanMeters = 120,
): Projection {
  if (points.length === 0) throw new Error('fitProjection needs at least one point');
  const world = points.map(mercator);
  let minX = Math.min(...world.map((p) => p.x));
  let maxX = Math.max(...world.map((p) => p.x));
  let minY = Math.min(...world.map((p) => p.y));
  let maxY = Math.max(...world.map((p) => p.y));

  const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  // Meters per world unit at this latitude.
  const metersPerWorld = (40_075_016.686 * Math.cos((centerLat * Math.PI) / 180)) / TILE;
  const minSpan = minSpanMeters / metersPerWorld;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const spanX = Math.max(maxX - minX, minSpan);
  const spanY = Math.max(maxY - minY, minSpan);
  minX = cx - spanX / 2;
  maxX = cx + spanX / 2;
  minY = cy - spanY / 2;
  maxY = cy + spanY / 2;

  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;

  return {
    width,
    height,
    metersPerUnit: metersPerWorld / scale,
    project(p) {
      const w = mercator(p);
      return { x: offX + (w.x - minX) * scale, y: offY + (w.y - minY) * scale };
    },
    unproject(p) {
      return inverseMercator({ x: (p.x - offX) / scale + minX, y: (p.y - offY) / scale + minY });
    },
  };
}

/** SVG path data for a polyline. */
export function pathData(points: readonly LatLng[], proj: Projection): string {
  return points
    .map((p, i) => {
      const { x, y } = proj.project(p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}
