import { describe, expect, it } from 'vitest';
import { bearing, compassWord, destination, formatDistance, haversine, pathLength } from '../src/core/geo';

describe('haversine', () => {
  it('is zero for the same point', () => {
    expect(haversine({ lat: 41.5868, lng: -93.625 }, { lat: 41.5868, lng: -93.625 })).toBe(0);
  });

  it('matches one degree of latitude (about 111.2 km)', () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it('matches a known city pair: Des Moines to Chicago is about 500 km', () => {
    const desMoines = { lat: 41.5868, lng: -93.625 };
    const chicago = { lat: 41.8781, lng: -87.6298 };
    expect(haversine(desMoines, chicago) / 1000).toBeGreaterThan(495);
    expect(haversine(desMoines, chicago) / 1000).toBeLessThan(505);
  });

  it('is symmetric and stable across the antimeridian', () => {
    const a = { lat: 10, lng: 179.9 };
    const b = { lat: 10, lng: -179.9 };
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6);
    expect(haversine(a, b)).toBeLessThan(25_000);
  });
});

describe('bearing and destination', () => {
  it('points due east along the equator and due north up a meridian', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 6);
    expect(bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 6);
  });

  it('destination is the inverse of distance and bearing', () => {
    const start = { lat: 41.5886, lng: -93.6383 };
    const end = destination(start, 237, 850);
    expect(haversine(start, end)).toBeCloseTo(850, 3);
    expect(bearing(start, end)).toBeCloseTo(237, 3);
  });
});

describe('formatting helpers', () => {
  it('names compass points', () => {
    expect(compassWord(0)).toBe('north');
    expect(compassWord(92)).toBe('east');
    expect(compassWord(225)).toBe('southwest');
    expect(compassWord(359)).toBe('north');
    expect(compassWord(-90)).toBe('west');
  });

  it('rounds distances to walkable steps', () => {
    expect(formatDistance(42)).toBe('40 m');
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(1234)).toBe('1.2 km');
    expect(formatDistance(Number.NaN)).toBe('unknown distance');
  });

  it('sums polyline length', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 0.01 };
    const c = { lat: 0.01, lng: 0.01 };
    expect(pathLength([a, b, c])).toBeCloseTo(haversine(a, b) + haversine(b, c), 6);
    expect(pathLength([a])).toBe(0);
  });
});
