import { describe, expect, it } from 'vitest';
import { haversine } from '../src/core/geo';
import { fitProjection, inverseMercator, mercator } from '../src/core/projection';
import { east, ORIGIN } from './fixtures';

describe('projection', () => {
  it('mercator round-trips', () => {
    const back = inverseMercator(mercator(ORIGIN));
    expect(back.lat).toBeCloseTo(ORIGIN.lat, 9);
    expect(back.lng).toBeCloseTo(ORIGIN.lng, 9);
  });

  it('fits points inside the padded box with north up', () => {
    const pts = [east(0), east(500)];
    const p = fitProjection(pts, 800, 600, 40);
    const a = p.project(pts[0]!);
    const b = p.project(pts[1]!);
    expect(a.x).toBeGreaterThanOrEqual(40);
    expect(b.x).toBeLessThanOrEqual(760);
    expect(b.x).toBeGreaterThan(a.x);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
    // Scale agrees with ground distance.
    expect((b.x - a.x) * p.metersPerUnit).toBeCloseTo(500, -1);
  });

  it('unprojects a click back to the same ground point', () => {
    const p = fitProjection([ORIGIN], 400, 400);
    const q = p.unproject(p.project(east(30)));
    expect(haversine(q, east(30))).toBeLessThan(0.01);
  });

  it('keeps a minimum span for a single point', () => {
    const p = fitProjection([ORIGIN], 400, 400, 0, 200);
    expect(p.metersPerUnit * 400).toBeCloseTo(200, 0);
  });
});
