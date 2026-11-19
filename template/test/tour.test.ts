import { describe, expect, it } from 'vitest';
import { parseTour, tourRoute, validateTour } from '../src/core/tour';
import { ORIGIN } from './fixtures';

const stop = (id: string, extra: object = {}) => ({ id, name: id, position: ORIGIN, radius: 20, story: ['Once.'], ...extra });

describe('tour format', () => {
  it('fills defaults', () => {
    const tour = parseTour({ id: 't', title: 'T', stops: [stop('a')] });
    expect(tour.ordering).toBe('free');
    expect(tour.stops[0]).toMatchObject({ kind: 'clue', requires: [], finale: false, sources: [] });
    expect(tour.mapFeatures).toEqual([]);
  });

  it('collects readable issues', () => {
    const result = validateTour({
      id: 'Bad Id',
      title: '',
      stops: [stop('a', { radius: 2 }), stop('a'), stop('b', { requires: ['nope'] })],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.issues.join('\n');
      expect(text).toMatch(/^id:/m);
      expect(text).toMatch(/stops\.0\.radius/);
      expect(text).toMatch(/duplicate stop id "a"/);
      expect(text).toMatch(/unknown stop "nope"/);
    }
  });

  it('requires a source for legends and history but not fiction', () => {
    expect(validateTour({ id: 't', title: 'T', stops: [stop('a', { kind: 'legend' })] }).ok).toBe(false);
    expect(validateTour({ id: 't', title: 'T', stops: [stop('a', { kind: 'fiction' })] }).ok).toBe(true);
    expect(
      validateTour({
        id: 't',
        title: 'T',
        stops: [stop('a', { kind: 'history', sources: [{ title: 'X', publisher: 'Y', url: 'https://example.com/x' }] })],
      }).ok,
    ).toBe(true);
  });

  it('rejects requirement cycles and more than one finale', () => {
    const cyc = validateTour({ id: 't', title: 'T', stops: [stop('a', { requires: ['b'] }), stop('b', { requires: ['a'] })] });
    expect(cyc.ok === false && cyc.issues.join()).toMatch(/cycle/);
    const fin = validateTour({ id: 't', title: 'T', stops: [stop('a', { finale: true }), stop('b', { finale: true })] });
    expect(fin.ok === false && fin.issues.join()).toMatch(/at most one finale/);
  });

  it('accepts an optional label position for map features', () => {
    const t = parseTour({
      id: 't',
      title: 'T',
      stops: [stop('a')],
      mapFeatures: [
        { kind: 'river', name: 'River', path: [ORIGIN, ORIGIN] },
        { kind: 'street', name: 'Main St', path: [ORIGIN], labelAt: ORIGIN },
      ],
    });
    expect(t.mapFeatures[0]!.labelAt).toBeUndefined();
    expect(t.mapFeatures[1]!.labelAt).toEqual(ORIGIN);
    expect(validateTour({ id: 't', title: 'T', stops: [stop('a')], mapFeatures: [{ kind: 'river', name: 'R', path: [ORIGIN], labelAt: { lat: 200, lng: 0 } }] }).ok).toBe(false);
  });

  it('uses the explicit route or falls back to the stops', () => {
    const t = parseTour({ id: 't', title: 'T', stops: [stop('a'), stop('b')] });
    expect(tourRoute(t)).toHaveLength(2);
    const r = parseTour({ id: 't', title: 'T', stops: [stop('a')], route: [ORIGIN, ORIGIN, ORIGIN] });
    expect(tourRoute(r)).toHaveLength(3);
  });
});
