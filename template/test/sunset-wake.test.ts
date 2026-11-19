import { describe, expect, it } from 'vitest';
import { settleInside, stepFix, unlock, type EngineEvent } from '../src/core/geofence';
import { createSession, type SessionState } from '../src/core/session';
import { nextSunset } from '../src/core/sun';
import { defineTour, type Tour } from '../src/core/tour';
import { ORIGIN, east } from './fixtures';

// Halloween 2026 in Des Moines: the published sunset is 6:10 pm (UTC-5).
const AFTERNOON = Date.parse('2026-10-31T15:00:00-05:00');
const EVENING = Date.parse('2026-10-31T19:00:00-05:00');

function lampTour(): Tour {
  return defineTour({
    id: 'wake-tour',
    title: 'Wake tour',
    stops: [
      { id: 'a', name: 'Stop A', position: east(0), radius: 25, story: ['A'] },
      { id: 'lamp', name: 'Lamp', position: east(200), radius: 25, story: ['Lit'], wakesAfter: 'sunset' },
    ],
  });
}

function standAt(tour: Tour, state: SessionState, meters: number, start: number, options = {}) {
  const events: EngineEvent[] = [];
  for (let i = 0; i < 2; i++) {
    const r = stepFix(tour, state, { ...east(meters), accuracy: 5, timestamp: start + i * 1000 }, options);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

describe('sunset-wake stops', () => {
  it('sleeps through the afternoon and says when it wakes', () => {
    const tour = lampTour();
    const { state, events } = standAt(tour, createSession(tour), 200, AFTERNOON);
    const sleeping = events.find((e) => e.type === 'sleeping');
    expect(sleeping).toEqual({ type: 'sleeping', stopId: 'lamp', wakesAt: nextSunset(AFTERNOON + 1000, east(200)) });
    expect(Math.abs((sleeping as { wakesAt: number }).wakesAt - Date.parse('2026-10-31T18:10:00-05:00'))).toBeLessThan(120_000);
    expect(state.stops.lamp!.unlockedAt).toBeUndefined();
    expect(state.stops.lamp!.inside).toBe(true);
  });

  it('wakes by GPS after sunset', () => {
    const tour = lampTour();
    const { state, events } = standAt(tour, createSession(tour), 200, EVENING);
    expect(events.map((e) => e.type)).toEqual(['enter', 'unlock']);
    expect(state.stops.lamp!.unlockedBy).toBe('gps');
  });

  it('wakes for a walker who waited inside the circle until sunset', () => {
    const tour = lampTour();
    let { state } = standAt(tour, createSession(tour), 200, AFTERNOON);
    const r = stepFix(tour, state, { ...east(200), accuracy: 5, timestamp: EVENING }, {});
    state = r.state;
    expect(r.events).toEqual([{ type: 'unlock', stopId: 'lamp', by: 'gps' }]);
  });

  it('reports sleeping only on arrival, not on every fix', () => {
    const tour = lampTour();
    const { state } = standAt(tour, createSession(tour), 200, AFTERNOON);
    const again = stepFix(tour, state, { ...east(200), accuracy: 5, timestamp: AFTERNOON + 5000 });
    expect(again.events).toEqual([]);
    expect(settleInside(tour, again.state, AFTERNOON + 6000).events).toEqual([]);
  });

  it('never blocks the list or a simulated walk', () => {
    const tour = lampTour();
    const listed = unlock(tour, createSession(tour), 'lamp', 'list', AFTERNOON);
    expect(listed.state.stops.lamp!.unlockedBy).toBe('list');

    const simulated = standAt(tour, createSession(tour), 200, AFTERNOON, { ignoreWake: true });
    expect(simulated.state.stops.lamp!.unlockedBy).toBe('gps');
  });

  it('leaves stops without wakesAfter alone at any hour', () => {
    const tour = lampTour();
    const { state } = standAt(tour, createSession(tour), 0, AFTERNOON);
    expect(state.stops.a!.unlockedBy).toBe('gps');
  });

  it('accepts only "sunset" in the tour format', () => {
    expect(() =>
      defineTour({
        id: 'bad',
        title: 'Bad',
        stops: [{ id: 'a', name: 'A', position: ORIGIN, radius: 25, story: ['A'], wakesAfter: 'midnight' as 'sunset' }],
      }),
    ).toThrow(/wakesAfter/);
  });
});
